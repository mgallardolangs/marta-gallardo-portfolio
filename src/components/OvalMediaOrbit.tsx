import { useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { gsap } from 'gsap';

import type { Lang } from '../i18n';
import type { OrbitMedia } from '../lib/siteData';
import {
  calculateOrbitAutoScrollSpeed,
  DESKTOP_ORBIT_GEOMETRY,
  getOrbitInteractionState,
  getOrbitItemLayout,
  ORBIT_REVOLUTION_SECONDS,
  resolveOrbitHref,
} from '../lib/orbitMedia';

interface Props {
  items: OrbitMedia[];
  lang: Lang;
  className?: string;
  ariaLabel?: string;
  previewMode?: boolean;
}

type SoundState = 'muted' | 'sound-on' | 'blocked';

function isVideoItem(item: OrbitMedia) {
  return item.type === 'video';
}

export default function OvalMediaOrbit({
  items,
  lang,
  className = '',
  ariaLabel = 'Featured orbit media',
  previewMode = false,
}: Props) {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const centerRef = useRef<HTMLDivElement | null>(null);
  const underlineRef = useRef<HTMLDivElement | null>(null);
  const echoRefs = useRef<Array<HTMLDivElement | null>>([]);
  const entranceTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const entrancePlayedRef = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [soundStates, setSoundStates] = useState<Record<string, SoundState>>({});
  const [isRegionVisible, setIsRegionVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0.37);
  const shouldAnimate = !previewMode && prefersReducedMotion === false;

  const plugins = useMemo(() => {
    if (!shouldAnimate || items.length < 2) return [];

    return [
      AutoScroll({
        playOnInit: false,
        startDelay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
        stopOnFocusIn: false,
        speed: autoScrollSpeed,
      }),
    ];
  }, [autoScrollSpeed, items.length, shouldAnimate]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'center',
      dragFree: true,
      loop: items.length > 1,
      watchFocus: true,
    },
    plugins,
  );

  const hasActiveTile = activeId !== null;

  const applyOrbitLayout = () => {
    if (!emblaApi) return;
    const progress = emblaApi.scrollProgress();

    items.forEach((item, index) => {
      const tile = tileRefs.current[item.id];
      if (!tile) return;

      const layout = getOrbitItemLayout(progress, index, items.length, DESKTOP_ORBIT_GEOMETRY);
      const interactionState = getOrbitInteractionState({
        baseScale: layout.baseScale,
        isActive: activeId === item.id,
        hasActiveTile,
      });

      gsap.set(tile, {
        left: `${layout.leftPercent}%`,
        top: `${layout.topPercent}%`,
        xPercent: -50,
        yPercent: -50,
        zIndex: layout.zIndex + interactionState.zIndexBoost,
        opacity: interactionState.opacity,
        filter: interactionState.filter,
        scale: interactionState.scale,
      });
    });
  };

  const syncVideoPlayback = () => {
    const shouldPlayMuted = isRegionVisible && isDocumentVisible;

    items.forEach((item) => {
      if (!isVideoItem(item)) return;
      const video = videoRefs.current[item.id];
      if (!video) return;

      if (!shouldPlayMuted) {
        video.pause();
        return;
      }

      video.muted = true;
      void video.play().catch(() => {});
      setSoundStates((current) => (current[item.id] && current[item.id] !== 'muted'
        ? { ...current, [item.id]: 'muted' }
        : current));
    });
  };

  const playAutoScroll = (delay = 0) => {
    if (!shouldAnimate || !emblaApi) return;
    emblaApi.plugins().autoScroll?.play(delay);
  };

  const stopAutoScroll = () => {
    if (!emblaApi) return;
    emblaApi.plugins().autoScroll?.stop();
  };

  const activateTile = (item: OrbitMedia) => {
    setActiveId(item.id);
    stopAutoScroll();

    if (!isVideoItem(item)) return;
    const video = videoRefs.current[item.id];
    if (!video) return;

    video.muted = false;
    void video.play()
      .then(() => {
        setSoundStates((current) => ({ ...current, [item.id]: 'sound-on' }));
      })
      .catch(() => {
        video.muted = true;
        setSoundStates((current) => ({ ...current, [item.id]: 'blocked' }));
      });
  };

  const deactivateTile = (item: OrbitMedia) => {
    setActiveId((current) => (current === item.id ? null : current));
    if (shouldAnimate) {
      playAutoScroll(600);
    }

    if (!isVideoItem(item)) return;
    const video = videoRefs.current[item.id];
    if (!video) return;
    video.muted = true;
    setSoundStates((current) => ({ ...current, [item.id]: 'muted' }));
    void video.play().catch(() => {});
  };

  const toggleVideoSound = async (item: OrbitMedia, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isVideoItem(item)) return;
    const video = videoRefs.current[item.id];
    if (!video) return;

    if (video.muted) {
      video.muted = false;
      try {
        await video.play();
        setSoundStates((current) => ({ ...current, [item.id]: 'sound-on' }));
      } catch {
        video.muted = true;
        setSoundStates((current) => ({ ...current, [item.id]: 'blocked' }));
      }
      return;
    }

    video.muted = true;
    setSoundStates((current) => ({ ...current, [item.id]: 'muted' }));
    await video.play().catch(() => {});
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setIsDocumentVisible(document.visibilityState !== 'hidden');
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!regionRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsRegionVisible(entry.isIntersecting && entry.intersectionRatio > 0.25),
      { threshold: [0.25, 0.5] },
    );

    observer.observe(regionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    syncVideoPlayback();
  }, [isDocumentVisible, isRegionVisible, items]);

  useEffect(() => {
    if (!emblaApi || items.length < 2) return;

    const pitch = emblaApi.slideNodes()[0]?.getBoundingClientRect().width ?? 96;
    setAutoScrollSpeed(calculateOrbitAutoScrollSpeed({
      itemCount: items.length,
      tilePitch: pitch,
      revolutionSeconds: ORBIT_REVOLUTION_SECONDS,
    }));
  }, [emblaApi, items.length]);

  useEffect(() => {
    if (!emblaApi || prefersReducedMotion === null) return;

    const onScroll = () => applyOrbitLayout();
    emblaApi.on('scroll', onScroll);
    emblaApi.on('reInit', onScroll);
    emblaApi.on('settle', onScroll);
    applyOrbitLayout();

    return () => {
      emblaApi.off('scroll', onScroll);
      emblaApi.off('reInit', onScroll);
      emblaApi.off('settle', onScroll);
    };
  }, [activeId, emblaApi, hasActiveTile, prefersReducedMotion, items]);

  useEffect(() => {
    if (!emblaApi || prefersReducedMotion === null) return;

    entranceTimelineRef.current?.kill();

    if (!shouldAnimate) {
      entrancePlayedRef.current = true;
      applyOrbitLayout();
      return;
    }

    const tiles = items.map((item) => tileRefs.current[item.id]).filter(Boolean) as HTMLDivElement[];
    if (tiles.length === 0) return;

    stopAutoScroll();
    gsap.set(tiles, {
      left: '50%',
      top: '50%',
      xPercent: -50,
      yPercent: -50,
      opacity: 0,
      scale: 0.62,
    });
    gsap.set(centerRef.current, { clipPath: 'inset(0 0 100% 0)' });
    gsap.set(underlineRef.current, { scaleX: 0, transformOrigin: 'center center' });
    gsap.set(echoRefs.current.filter(Boolean), { scale: 1.18, opacity: 0 });

    const timeline = gsap.timeline({
      defaults: { ease: 'back.out(1.4)' },
      onComplete: () => {
        entrancePlayedRef.current = true;
        applyOrbitLayout();
        playAutoScroll(0);
      },
    });

    timeline.to(tiles, {
      duration: 1.4,
      opacity: 1,
      scale: 1,
      stagger: {
        each: 0.045,
        from: 'center',
      },
      left: (_index, element: HTMLDivElement) => {
        const itemId = element.dataset.itemId ?? '';
        const itemIndex = items.findIndex((item) => item.id === itemId);
        return `${getOrbitItemLayout(emblaApi.scrollProgress(), itemIndex, items.length, DESKTOP_ORBIT_GEOMETRY).leftPercent}%`;
      },
      top: (_index, element: HTMLDivElement) => {
        const itemId = element.dataset.itemId ?? '';
        const itemIndex = items.findIndex((item) => item.id === itemId);
        return `${getOrbitItemLayout(emblaApi.scrollProgress(), itemIndex, items.length, DESKTOP_ORBIT_GEOMETRY).topPercent}%`;
      },
    }, 0);
    timeline.to(centerRef.current, { duration: 0.8, clipPath: 'inset(0 0 0% 0)', ease: 'power2.out' }, 0.18);
    timeline.to(echoRefs.current.filter(Boolean), {
      duration: 0.9,
      scale: 1,
      opacity: 1,
      stagger: 0.08,
      ease: 'power2.out',
    }, 0.12);
    timeline.to(underlineRef.current, { duration: 0.7, scaleX: 1, ease: 'power2.out' }, 0.42);

    entranceTimelineRef.current = timeline;

    return () => {
      timeline.kill();
    };
  }, [emblaApi, items, prefersReducedMotion, shouldAnimate]);

  useEffect(() => () => {
    entranceTimelineRef.current?.kill();
  }, []);

  const scrollPrev = () => {
    emblaApi?.scrollPrev();
    playAutoScroll(1200);
  };

  const scrollNext = () => {
    emblaApi?.scrollNext();
    playAutoScroll(1200);
  };

  const onRegionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollPrev();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollNext();
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) + Math.abs(event.deltaY) < 8) return;
    event.preventDefault();
    if (event.deltaX + event.deltaY > 0) {
      scrollNext();
      return;
    }
    scrollPrev();
  };

  return (
    <div className={`space-y-5 ${className}`}>
      <div
        ref={regionRef}
        className="relative mx-auto w-full max-w-[44rem] outline-none"
        onKeyDown={onRegionKeyDown}
        onWheel={onWheel}
        role="region"
        aria-label={ariaLabel}
        aria-roledescription="carousel"
        tabIndex={0}
      >
        <div ref={emblaRef} className="relative aspect-[690/430] min-h-[21rem] overflow-hidden md:min-h-[26rem]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0">
            <div className="flex h-full">
              {items.map((item) => (
                <div key={`ghost-${item.id}`} className="min-w-0 flex-[0_0_96px]" aria-hidden="true" />
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-[8%] rounded-full border border-amaranth/14" />
          <div
            ref={(element) => { echoRefs.current[0] = element; }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[58%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amaranth/16"
          />
          <div
            ref={(element) => { echoRefs.current[1] = element; }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amaranth/10"
          />

          <div
            ref={centerRef}
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          >
            <span className="font-heading text-[2.9rem] tracking-[-0.08em] text-ink md:text-[4.1rem]">MG</span>
            <div ref={underlineRef} className="mt-3 h-px w-16 bg-amaranth md:w-24" />
          </div>

          {items.map((item, index) => {
            const href = previewMode ? null : resolveOrbitHref(item.href, lang);
            const soundState = soundStates[item.id] ?? 'muted';
            const label = item.label[lang] ?? item.label.es;
            const alt = item.alt[lang] ?? item.alt.es;

            return (
              <div
                key={item.id}
                ref={(element) => { tileRefs.current[item.id] = element; }}
                data-item-id={item.id}
                className="absolute left-1/2 top-1/2 h-[5.4rem] w-[4.25rem] origin-center will-change-transform md:h-[7.625rem] md:w-24"
                onPointerEnter={() => activateTile(item)}
                onPointerLeave={() => deactivateTile(item)}
                onFocusCapture={() => activateTile(item)}
                onBlurCapture={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  deactivateTile(item);
                }}
                tabIndex={item.href ? undefined : 0}
                role={item.href ? undefined : 'group'}
                aria-label={item.href ? undefined : label}
              >
                <div className="relative h-full w-full overflow-hidden bg-white shadow-[0_12px_32px_rgba(6,4,3,0.18)]">
                  {isVideoItem(item) ? (
                    <video
                      ref={(element) => { videoRefs.current[item.id] = element; }}
                      src={item.src}
                      poster={item.poster ?? undefined}
                      aria-label={alt}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img src={item.src} alt={alt} className="h-full w-full object-cover" />
                  )}

                  {href ? (
                    <a
                      href={href}
                      aria-label={label}
                      className="absolute inset-0 z-10"
                      draggable={false}
                    >
                      <span className="sr-only">{label}</span>
                    </a>
                  ) : (
                    <div className="absolute inset-0 z-10" />
                  )}

                  {isVideoItem(item) && (
                    <button
                      type="button"
                      onClick={(event) => void toggleVideoSound(item, event)}
                      className="absolute bottom-2 right-2 z-20 rounded-full bg-ink/78 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-paper backdrop-blur-sm"
                      aria-label={soundState === 'sound-on' ? 'Mute video' : 'Try audio'}
                    >
                      {soundState === 'sound-on' ? '🔊' : soundState === 'blocked' ? '🔇!' : '🔇'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={scrollPrev}
          disabled={items.length < 2}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-lg text-ink transition hover:border-amaranth hover:text-amaranth disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous orbit item"
        >
          ←
        </button>
        <button
          type="button"
          onClick={scrollNext}
          disabled={items.length < 2}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-lg text-ink transition hover:border-amaranth hover:text-amaranth disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next orbit item"
        >
          →
        </button>
      </div>
    </div>
  );
}
