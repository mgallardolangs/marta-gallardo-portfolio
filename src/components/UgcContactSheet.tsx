import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useAdminStore } from './admin/useAdminStore';
import { localize, type Locale, type UgcCategory, type UgcPortfolioItem } from '../lib/siteData.ts';
import {
  INITIAL_UGC_FILTER,
  canOpenUgcItem,
  filterUgcPortfolio,
  getNextUgcIndex,
  getUgcTileVisibility,
  playFocusedVideoPlayback,
  resetFocusedVideoPlayback,
  type UgcFilter,
  type UgcTileVisibility,
} from '../lib/ugcPortfolio.ts';

type UgcContactSheetCopy = {
  eyebrow: string;
  headline: string;
  filters: Record<UgcFilter, string>;
  close: string;
  previous: string;
  next: string;
  formatLabel: string;
  pieceLabel: string;
};

type Props = {
  items: UgcPortfolioItem[];
  lang: Locale;
  copy: UgcContactSheetCopy;
  adminPreview?: boolean;
};

const FILTERS: UgcFilter[] = ['all', 'travel', 'languages', 'art'];

export default function UgcContactSheet({
  items: initialItems,
  lang,
  copy,
  adminPreview = false,
}: Props) {
  const adminStore = useAdminStore();
  const items = adminPreview && adminStore.initialized
    ? adminStore.getUgcPortfolio()
    : initialItems;

  const [filter, setFilter] = useState<UgcFilter>(INITIAL_UGC_FILTER);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [navigationDirection, setNavigationDirection] = useState<-1 | 1>(1);
  const [focusedVideoPlaying, setFocusedVideoPlaying] = useState(false);

  const previewVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const focusedVideoRef = useRef<HTMLVideoElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const gesturePlaybackItemRef = useRef<string | null>(null);

  const visibleItems = useMemo(
    () => filterUgcPortfolio(items, filter),
    [items, filter],
  );

  const activeVisibleIndex = visibleItems.findIndex((item) => item.id === activeId);
  const activeItem = activeVisibleIndex >= 0 ? visibleItems[activeVisibleIndex] : null;

  useEffect(() => {
    if (activeId && !items.some((item) => item.id === activeId)) {
      setActiveId(null);
    }
  }, [items, activeId]);

  useEffect(() => {
    if (activeId && activeVisibleIndex === -1) {
      resetFocusedVideoPlayback(focusedVideoRef.current);
      setFocusedVideoPlaying(false);
      setActiveId(null);
    }
  }, [activeId, activeVisibleIndex]);

  useEffect(() => {
    if (!activeId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeItem) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        navigate('previous');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        navigate('next');
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], video[tabindex], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeItem, activeVisibleIndex, visibleItems]);

  useEffect(() => {
    if (!activeItem || activeItem.type !== 'video') {
      setFocusedVideoPlaying(false);
      return;
    }

    const video = focusedVideoRef.current;
    if (!video) return;

    const shouldStartFromEffect = gesturePlaybackItemRef.current !== activeItem.id;
    gesturePlaybackItemRef.current = null;

    if (shouldStartFromEffect) {
      void playFocusedVideoPlayback(video, setFocusedVideoPlaying);
    }

    return () => {
      resetFocusedVideoPlayback(video);
      setFocusedVideoPlaying(false);
    };
  }, [activeItem]);

  const closeDialog = () => {
    resetFocusedVideoPlayback(focusedVideoRef.current);
    setFocusedVideoPlaying(false);
    setActiveId(null);
  };

  const navigate = (direction: 'previous' | 'next') => {
    if (!activeItem) return;

    const currentIndex = visibleItems.findIndex((item) => item.id === activeId);
    if (currentIndex === -1) return;

    const nextIndex = getNextUgcIndex(visibleItems.length, currentIndex, direction);
    const nextItem = visibleItems[nextIndex];
    if (!nextItem) return;

    resetFocusedVideoPlayback(focusedVideoRef.current);
    setFocusedVideoPlaying(false);
    setNavigationDirection(direction === 'next' ? 1 : -1);
    setActiveId(nextItem.id);
  };

  const handlePreviewEnter = (item: UgcPortfolioItem, visibility: UgcTileVisibility) => {
    if (item.type !== 'video' || !canOpenUgcItem({ visibility })) return;

    const previewVideo = previewVideoRefs.current[item.id];
    if (!previewVideo) return;

    previewVideo.currentTime = 0;
    previewVideo.muted = true;
    const playback = previewVideo.play();
    if (playback instanceof Promise) {
      playback.catch(() => undefined);
    }
  };

  const handlePreviewLeave = (item: UgcPortfolioItem) => {
    if (item.type !== 'video') return;

    const previewVideo = previewVideoRefs.current[item.id];
    if (!previewVideo) return;

    previewVideo.pause();
    previewVideo.currentTime = 0;
  };

  const handleDialogVideoClick = () => {
    const video = focusedVideoRef.current;
    if (!video) return;

    const togglePlayback = video.paused ? video.play() : video.pause();

    if (togglePlayback instanceof Promise) {
      togglePlayback
        .then(() => setFocusedVideoPlaying(true))
        .catch(() => setFocusedVideoPlaying(false));
      return;
    }

    setFocusedVideoPlaying(!video.paused);
  };

  const diagonalDelay = (index: number) => ((index % 4) + Math.floor(index / 4)) * 0.04;
  const categoryLabel = (category: UgcCategory) => copy.filters[category];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        {FILTERS.map((currentFilter) => {
          const isActive = currentFilter === filter;

          return (
            <button
              key={currentFilter}
              type="button"
              aria-pressed={isActive}
              onClick={() => setFilter(currentFilter)}
              className={`group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] transition ${
                isActive ? 'text-amaranth' : 'text-ink hover:text-amaranth'
              }`}
            >
              <span className={`transition ${isActive ? 'text-amaranth' : 'text-ink/24 group-hover:text-amaranth'}`}>[</span>
              <span>{copy.filters[currentFilter]}</span>
              <span className={`transition ${isActive ? 'text-amaranth' : 'text-ink/24 group-hover:text-amaranth'}`}>]</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {items.map((item, index) => {
          const visibility = getUgcTileVisibility(item, filter);
          const isVisible = visibility === 'visible';
          const localizedLabel = localize(item.label, lang);
          const localizedAlt = localize(item.alt, lang);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: diagonalDelay(index), ease: 'easeOut' }}
              className={`relative aspect-square overflow-hidden bg-paper ${isVisible ? '' : 'pointer-events-none'}`}
            >
              <button
                type="button"
                disabled={!canOpenUgcItem({ visibility })}
                tabIndex={isVisible ? 0 : -1}
                onClick={(event) => {
                  if (!canOpenUgcItem({ visibility })) return;

                  flushSync(() => {
                    restoreFocusRef.current = event.currentTarget;
                    setNavigationDirection(1);
                    setActiveId(item.id);
                  });

                  if (item.type === 'video') {
                    gesturePlaybackItemRef.current = item.id;
                    void playFocusedVideoPlayback(focusedVideoRef.current, setFocusedVideoPlaying);
                  }
                }}
                onKeyDown={(event) => {
                  if (!canOpenUgcItem({ visibility })) return;
                  if (!['Enter', ' ', 'Space', 'Spacebar', 'NumpadEnter'].includes(event.key)) return;
                  event.preventDefault();

                  flushSync(() => {
                    restoreFocusRef.current = event.currentTarget as HTMLButtonElement;
                    setNavigationDirection(1);
                    setActiveId(item.id);
                  });

                  if (item.type === 'video') {
                    gesturePlaybackItemRef.current = item.id;
                    void playFocusedVideoPlayback(focusedVideoRef.current, setFocusedVideoPlaying);
                  }
                }}
                onPointerEnter={() => handlePreviewEnter(item, visibility)}
                onPointerLeave={() => handlePreviewLeave(item)}
                className={`group relative h-full w-full text-left ${isVisible ? '' : 'pointer-events-none'} bg-paper`}
              >
                {item.type === 'video' ? (
                  <video
                    ref={(node) => {
                      previewVideoRefs.current[item.id] = node;
                    }}
                    src={item.src}
                    poster={item.poster ?? undefined}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className={`h-full w-full object-cover transition duration-300 ${
                      isVisible ? 'opacity-100 group-hover:scale-[1.055]' : 'opacity-0'
                    }`}
                  />
                ) : (
                  <img
                    src={item.src}
                    alt={localizedAlt}
                    loading="lazy"
                    className={`h-full w-full object-cover transition duration-300 ${
                      isVisible ? 'opacity-100 group-hover:scale-[1.055]' : 'opacity-0'
                    }`}
                  />
                )}

                <span
                  className={`absolute inset-x-3 bottom-3 inline-flex max-w-[calc(100%-1.5rem)] items-center justify-start bg-ink px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-paper transition ${
                    isVisible ? 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100' : 'opacity-0'
                  }`}
                >
                  {localizedLabel}
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {activeItem ? (
          <motion.div
            key="ugc-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-ink/84 backdrop-blur-sm"
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={localize(activeItem.title, lang)}
              className="flex min-h-full items-center justify-center p-4 md:p-8"
            >
              <div className="relative w-full max-w-7xl pr-20 text-paper md:pr-24">
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeDialog}
                  className="absolute right-4 top-4 z-10 inline-flex items-center justify-center border border-paper/16 bg-paper px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink transition hover:border-amaranth hover:text-amaranth md:right-6 md:top-6"
                >
                  {copy.close}
                </button>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:items-center">
                  <div className="order-1 space-y-4 lg:order-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amaranth">
                    {categoryLabel(activeItem.category)} · {localize(activeItem.format, lang)}
                  </p>
                  <h2 className="text-3xl text-paper md:text-4xl">{localize(activeItem.title, lang)}</h2>
                  <p className="max-w-md text-sm leading-7 text-paper/80 md:text-base">
                    {localize(activeItem.description, lang)}
                  </p>
                  <dl className="grid gap-3 text-sm text-paper/80">
                    <div className="space-y-1 border-t border-paper/12 pt-3">
                      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amaranth">{copy.formatLabel}</dt>
                      <dd className="text-paper">{localize(activeItem.format, lang)}</dd>
                    </div>
                    <div className="space-y-1 border-t border-paper/12 pt-3">
                      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amaranth">{copy.pieceLabel}</dt>
                      <dd className="text-paper">{activeVisibleIndex + 1} / {visibleItems.length}</dd>
                    </div>
                  </dl>
                  </div>

                  <div className="order-2 flex justify-center lg:order-2">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={activeItem.id}
                        initial={{ opacity: 0, y: navigationDirection > 0 ? 24 : -24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: navigationDirection > 0 ? -24 : 24, scale: 0.96 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="aspect-[9/16] w-full max-w-sm overflow-hidden bg-paper"
                      >
                        {activeItem.type === 'video' ? (
                          <video
                            ref={focusedVideoRef}
                            src={activeItem.src}
                            poster={activeItem.poster ?? undefined}
                            loop
                            playsInline
                            preload="metadata"
                            tabIndex={0}
                            onClick={handleDialogVideoClick}
                            className="h-full w-full cursor-pointer object-cover"
                          />
                        ) : (
                          <img
                            src={activeItem.src}
                            alt={localize(activeItem.alt, lang)}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 md:right-6">
                  <button
                    type="button"
                    onClick={() => navigate('previous')}
                    className="inline-flex h-12 w-12 items-center justify-center border border-paper/16 text-paper transition hover:border-amaranth hover:text-amaranth"
                    aria-label={copy.previous}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('next')}
                    className="inline-flex h-12 w-12 items-center justify-center border border-paper/16 text-paper transition hover:border-amaranth hover:text-amaranth"
                    aria-label={copy.next}
                  >
                    ↓
                  </button>
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-paper/70">
                    {activeVisibleIndex + 1} / {visibleItems.length}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
