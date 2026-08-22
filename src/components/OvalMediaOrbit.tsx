import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

import type { Lang } from '../i18n';
import type { OrbitMedia } from '../lib/siteData';
import {
  DESKTOP_ORBIT_GEOMETRY,
  getLocalizedOrbitText,
  getOrbitActivatedVideoPlaybackMode,
  getOrbitDriftPlaybackMode,
  getOrbitDriftTweenOptions,
  getOrbitInteractionState,
  getOrbitItemLayout,
  getOrbitVideoPlaybackMode,
  resolveOrbitHref,
  shouldPauseOrbitDriftOnIntroComplete,
  shouldStartOrbitDrift,
} from '../lib/orbitMedia';

interface Props {
  items: OrbitMedia[];
  lang: Lang;
  className?: string;
  ariaLabel?: string;
  previewMode?: boolean;
}

function isVideoItem(item: OrbitMedia) {
  return item.type === 'video';
}

async function playMuted(video: HTMLVideoElement) {
  video.muted = true;
  await video.play().catch(() => {});
}

async function playWithSound(video: HTMLVideoElement) {
  video.muted = false;
  await video.play().catch(async () => {
    await playMuted(video);
  });
}

function pauseAndMute(video: HTMLVideoElement) {
  video.muted = true;
  video.pause();
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
  const progressRef = useRef({ value: 0 });
  const driftTweenRef = useRef<gsap.core.Tween | null>(null);
  const entranceTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isRegionVisible, setIsRegionVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const shouldAnimate = !previewMode && prefersReducedMotion === false;

  const killMotion = () => {
    entranceTimelineRef.current?.kill();
    entranceTimelineRef.current = null;
    driftTweenRef.current?.kill();
    driftTweenRef.current = null;
  };

  const applyOrbitLayout = () => {
    const progress = progressRef.current.value;
    const hasActiveTile = activeIdRef.current !== null;

    items.forEach((item, index) => {
      const tile = tileRefs.current[item.id];
      if (!tile) return;

      const layout = getOrbitItemLayout(progress, index, items.length, DESKTOP_ORBIT_GEOMETRY);
      const interactionState = getOrbitInteractionState({
        baseScale: layout.baseScale,
        isActive: activeIdRef.current === item.id,
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
    const basePlaybackMode = getOrbitVideoPlaybackMode({
      prefersReducedMotion,
      isDocumentVisible,
      isRegionVisible,
    });

    items.forEach((item) => {
      if (!isVideoItem(item)) return;
      const video = videoRefs.current[item.id];
      if (!video) return;

      if (activeId === item.id) {
        const activatedPlaybackMode = getOrbitActivatedVideoPlaybackMode({
          activationMode: 'pointer-hover',
          prefersReducedMotion,
          isDocumentVisible,
          isRegionVisible,
        });

        if (activatedPlaybackMode === 'pause') {
          pauseAndMute(video);
          return;
        }

        if (activatedPlaybackMode === 'play-muted') {
          void playMuted(video);
          return;
        }

        void playWithSound(video);
        return;
      }

      if (basePlaybackMode === 'pause') {
        pauseAndMute(video);
        return;
      }

      void playMuted(video);
    });
  }, [activeId, isDocumentVisible, isRegionVisible, items, prefersReducedMotion]);

  useEffect(() => {
    activeIdRef.current = activeId;
    applyOrbitLayout();

    const driftPlaybackMode = getOrbitDriftPlaybackMode(activeId);
    if (driftPlaybackMode === 'pause') {
      driftTweenRef.current?.pause();
    } else {
      driftTweenRef.current?.play();
    }
  }, [activeId, items]);

  useEffect(() => {
    if (prefersReducedMotion === null) return;

    const tiles = items.map((item) => tileRefs.current[item.id]).filter(Boolean) as HTMLDivElement[];
    if (tiles.length === 0) return;

    killMotion();
    progressRef.current.value = 0;

    if (!shouldAnimate) {
      gsap.set(tiles, {
        left: '50%',
        top: '50%',
        xPercent: -50,
        yPercent: -50,
        opacity: 1,
        scale: 1,
      });
      gsap.set(centerRef.current, { clipPath: 'inset(0 0 0 0)' });
      gsap.set(underlineRef.current, { scaleX: 1, transformOrigin: 'center center' });
      gsap.set(echoRefs.current.filter(Boolean), { scale: 1, opacity: 1 });
      applyOrbitLayout();
      return;
    }

    gsap.set(tiles, {
      left: '50%',
      top: '50%',
      xPercent: -50,
      yPercent: -50,
      opacity: 0,
      scale: 0.58,
    });
    gsap.set(centerRef.current, { clipPath: 'inset(0 0 100% 0)' });
    gsap.set(underlineRef.current, { scaleX: 0, transformOrigin: 'center center' });
    gsap.set(echoRefs.current.filter(Boolean), { scale: 1.16, opacity: 0 });

    const timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        applyOrbitLayout();
        const entranceComplete = true;
        if (!shouldStartOrbitDrift(entranceComplete)) return;
        const shouldPauseDriftOnIntroComplete = shouldPauseOrbitDriftOnIntroComplete(activeIdRef.current);
        driftTweenRef.current = gsap.to(progressRef.current, {
          ...getOrbitDriftTweenOptions(),
          paused: shouldPauseDriftOnIntroComplete,
          onUpdate: () => applyOrbitLayout(),
        });
      },
    });

    timeline.to(tiles, {
      duration: 1.6,
      opacity: 1,
      scale: 1,
      stagger: {
        each: 0.045,
        from: 'center',
      },
      left: (_index, element: HTMLDivElement) => {
        const itemId = element.dataset.itemId ?? '';
        const itemIndex = items.findIndex((item) => item.id === itemId);
        return `${getOrbitItemLayout(progressRef.current.value, itemIndex, items.length, DESKTOP_ORBIT_GEOMETRY).leftPercent}%`;
      },
      top: (_index, element: HTMLDivElement) => {
        const itemId = element.dataset.itemId ?? '';
        const itemIndex = items.findIndex((item) => item.id === itemId);
        return `${getOrbitItemLayout(progressRef.current.value, itemIndex, items.length, DESKTOP_ORBIT_GEOMETRY).topPercent}%`;
      },
    }, 0);
    timeline.to(centerRef.current, { duration: 0.78, clipPath: 'inset(0 0 0 0)', ease: 'power2.out' }, 0.2);
    timeline.to(echoRefs.current.filter(Boolean), {
      duration: 0.82,
      scale: 1,
      opacity: 1,
      stagger: 0.08,
      ease: 'power2.out',
    }, 0.12);
    timeline.to(underlineRef.current, { duration: 0.7, scaleX: 1, ease: 'power2.out' }, 0.52);

    entranceTimelineRef.current = timeline;

    return () => {
      timeline.kill();
    };
  }, [items, prefersReducedMotion, shouldAnimate]);

  useEffect(() => {
    const onBeforePreparation = () => {
      killMotion();
      Object.values(videoRefs.current).forEach((video) => {
        if (video) pauseAndMute(video);
      });
    };

    document.addEventListener('astro:before-preparation', onBeforePreparation);
    return () => {
      document.removeEventListener('astro:before-preparation', onBeforePreparation);
      onBeforePreparation();
    };
  }, []);

  const setActiveTile = (itemId: string | null) => {
    activeIdRef.current = itemId;
    setActiveId(itemId);
  };

  const clearActiveTile = () => {
    setActiveTile(null);
  };

  return (
    <div className={className}>
      <div
        ref={regionRef}
        className="relative mx-auto w-full max-w-[46rem]"
        role="region"
        aria-label={ariaLabel}
      >
        <div className="relative aspect-[720/440] min-h-[22rem] overflow-hidden md:min-h-[27.5rem]">
          <div
            ref={(element) => { echoRefs.current[0] = element; }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12"
          />
          <div
            ref={(element) => { echoRefs.current[1] = element; }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
          />

          <div
            ref={centerRef}
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          >
            <span className="font-heading text-[3rem] tracking-[-0.08em] text-paper md:text-[4.75rem]">MG</span>
            <div ref={underlineRef} className="mt-3 h-px w-16 bg-amaranth md:w-24" />
          </div>

          {items.map((item) => {
            const href = previewMode ? null : resolveOrbitHref(item.href, lang);
            const label = getLocalizedOrbitText(item.label, lang);
            const alt = getLocalizedOrbitText(item.alt, lang);

            return (
              <div
                key={item.id}
                ref={(element) => { tileRefs.current[item.id] = element; }}
                data-item-id={item.id}
                className="absolute left-1/2 top-1/2 h-[5.875rem] w-[4.625rem] origin-center outline-none will-change-transform md:h-[7.875rem] md:w-[6.125rem]"
                onPointerEnter={(event) => {
                  if (event.pointerType === 'touch') return;
                  setActiveTile(item.id);
                }}
                onPointerLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  clearActiveTile();
                }}
              >
                <div className="relative h-full w-full overflow-hidden bg-white/95 shadow-[0_16px_40px_rgba(6,4,3,0.28)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amaranth">
                  {isVideoItem(item) ? (
                    <video
                      ref={(element) => { videoRefs.current[item.id] = element; }}
                      src={item.src}
                      poster={item.poster ?? undefined}
                      width={98}
                      height={126}
                      aria-label={alt}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.src}
                      alt={alt}
                      width={98}
                      height={126}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}

                  {href ? (
                    <a href={href} aria-label={label} className="absolute inset-0 z-10">
                      <span className="sr-only">{label}</span>
                    </a>
                  ) : (
                    <div className="absolute inset-0 z-10" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
