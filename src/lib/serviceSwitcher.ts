export const SERVICE_SWITCHER_INTERVAL_MS = 6000;

export function getNextServiceIndex(activeIndex: number, itemCount: number) {
  if (itemCount <= 0) return 0;
  return (activeIndex + 1) % itemCount;
}

export function restartServiceTimer(activeIndex: number) {
  return {
    activeIndex,
    elapsedMs: 0,
  };
}

export function shouldPauseServiceTimer({
  itemCount,
  isHovered,
  isFocusWithin,
  isDocumentHidden,
  prefersReducedMotion,
}: {
  itemCount: number;
  isHovered: boolean;
  isFocusWithin: boolean;
  isDocumentHidden: boolean;
  prefersReducedMotion: boolean;
}) {
  return itemCount < 2 || isHovered || isFocusWithin || isDocumentHidden || prefersReducedMotion;
}

export function advanceServiceTimer({
  activeIndex,
  elapsedMs,
  deltaMs,
  itemCount,
  isPaused,
}: {
  activeIndex: number;
  elapsedMs: number;
  deltaMs: number;
  itemCount: number;
  isPaused: boolean;
}) {
  if (isPaused || itemCount < 2) {
    return { activeIndex, elapsedMs };
  }

  const nextElapsedMs = elapsedMs + deltaMs;
  if (nextElapsedMs < SERVICE_SWITCHER_INTERVAL_MS) {
    return { activeIndex, elapsedMs: nextElapsedMs };
  }

  return {
    activeIndex: getNextServiceIndex(activeIndex, itemCount),
    elapsedMs: nextElapsedMs - SERVICE_SWITCHER_INTERVAL_MS,
  };
}

export function getServiceKeyTargetIndex(activeIndex: number, itemCount: number, key: string) {
  if (itemCount <= 0) return 0;
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return (activeIndex + 1) % itemCount;
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return (activeIndex - 1 + itemCount) % itemCount;
  }
  if (key === 'Home') return 0;
  if (key === 'End') return itemCount - 1;
  return activeIndex;
}
