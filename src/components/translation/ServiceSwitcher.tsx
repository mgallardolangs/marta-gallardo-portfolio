import { useEffect, useMemo, useRef, useState } from 'react';

import {
  SERVICE_SWITCHER_INTERVAL_MS,
  advanceServiceTimer,
  getServiceKeyTargetIndex,
  restartServiceTimer,
  shouldPauseServiceTimer,
} from '../../lib/serviceSwitcher.ts';

type ServiceItem = {
  id: string;
  name: string;
  description: string;
};

interface Props {
  items: ServiceItem[];
  title?: string;
}

function useDesktopMode() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  return isDesktop;
}

export default function ServiceSwitcher({ items, title = '' }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const isDesktop = useDesktopMode();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const pauseTimer = shouldPauseServiceTimer({
    itemCount: items.length,
    isHovered,
    isFocusWithin,
    isDocumentHidden,
    prefersReducedMotion,
  });

  const progress = prefersReducedMotion ? 1 : Math.min(elapsedMs / SERVICE_SWITCHER_INTERVAL_MS, 1);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setIsDocumentHidden(document.visibilityState === 'hidden');
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setActiveIndex(0);
      setElapsedMs(0);
      return;
    }

    setActiveIndex((current) => Math.min(current, items.length - 1));
  }, [items.length]);

  useEffect(() => {
    let animationFrame = 0;
    let previousTime = performance.now();

    // The timer runs in rAF so hover/focus/visibility pauses keep the visible progress line exact.
    const tick = (now: number) => {
      const deltaMs = now - previousTime;
      previousTime = now;

      setElapsedMs((currentElapsedMs) => {
        const next = advanceServiceTimer({
          activeIndex,
          elapsedMs: currentElapsedMs,
          deltaMs,
          itemCount: items.length,
          isPaused: pauseTimer,
        });

        if (next.activeIndex !== activeIndex) {
          setActiveIndex(next.activeIndex);
        }

        return next.elapsedMs;
      });

      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeIndex, items.length, pauseTimer]);

  const selectService = (index: number) => {
    const next = restartServiceTimer(index);
    setActiveIndex(next.activeIndex);
    setElapsedMs(next.elapsedMs);
  };

  const desktopTabs = useMemo(() => items.map((item, index) => {
    const isActive = index === activeIndex;
    const progressValue = isActive ? progress : 0;

    return (
      <button
        key={item.id}
        ref={(element) => {
          tabRefs.current[index] = element;
        }}
        id={`service-tab-${item.id}`}
        type="button"
        role="tab"
        tabIndex={isActive ? 0 : -1}
        aria-selected={isActive}
        aria-controls={`service-panel-${item.id}`}
        onClick={() => selectService(index)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectService(index);
            return;
          }

          const nextIndex = getServiceKeyTargetIndex(index, items.length, event.key);
          if (nextIndex === index) return;

          event.preventDefault();
          selectService(nextIndex);
          tabRefs.current[nextIndex]?.focus();
        }}
        className={`group flex w-full flex-col gap-4 border-b border-white/10 pb-5 text-left transition ${isActive ? 'text-paper' : 'text-white/58 hover:text-paper focus-visible:text-paper'}`}
      >
        <span className="font-heading text-3xl md:text-4xl">{item.name}</span>
        <span className="relative block h-px overflow-hidden bg-amaranth/20">
          <span
            className="absolute inset-y-0 left-0 bg-amaranth"
            style={{ width: `${progressValue * 100}%` }}
          />
        </span>
      </button>
    );
  }), [activeIndex, items, progress]);

  return (
    <section
      aria-label={title || 'Services'}
      className="border border-white/10 bg-ink text-paper shadow-[0_24px_80px_rgba(6,4,3,0.18)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocusWithin(false);
        }
      }}
    >
      {/* Only one mode stays exposed to assistive tech at a time even though CSS swaps layouts responsively. */}
      <div hidden={!isDesktop} aria-hidden={!isDesktop} className="grid gap-10 p-6 md:grid-cols-[0.95fr_1.05fr] md:p-10">
        <div role="tablist" aria-label={title || 'Services'} className="space-y-6">
          {desktopTabs}
        </div>

        <div>
          {items.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <div
                key={item.id}
                id={`service-panel-${item.id}`}
                role="tabpanel"
                aria-labelledby={`service-tab-${item.id}`}
                hidden={!isActive}
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                className="flex min-h-[18rem] items-center border border-white/10 bg-white/5 p-6 md:p-8"
              >
                <div className="max-w-2xl space-y-4">
                  <p className="font-body text-xs font-semibold uppercase tracking-[0.3em] text-paper">{item.name}</p>
                  <p className="text-lg leading-8 text-white/78">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div hidden={isDesktop} aria-hidden={isDesktop} className="divide-y divide-white/10">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const progressValue = isActive ? progress : 0;

          return (
            <div key={item.id} className="p-5">
              <button
                id={`service-mobile-trigger-${item.id}`}
                type="button"
                aria-expanded={isActive}
                aria-controls={`service-mobile-panel-${item.id}`}
                className="flex w-full flex-col gap-4 text-left"
                onClick={() => selectService(index)}
              >
                <span className={`font-heading text-2xl transition ${isActive ? 'text-paper' : 'text-white/72'}`}>{item.name}</span>
                <span className="relative block h-px overflow-hidden bg-amaranth/20">
                  <span
                    className="absolute inset-y-0 left-0 bg-amaranth"
                    style={{ width: `${progressValue * 100}%` }}
                  />
                </span>
              </button>

              <div
                id={`service-mobile-panel-${item.id}`}
                role="region"
                aria-labelledby={`service-mobile-trigger-${item.id}`}
                hidden={!isActive}
                aria-hidden={!isActive}
                className="pt-4"
              >
                <p className="text-base leading-7 text-white/78">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
