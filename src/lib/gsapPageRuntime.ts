import {
  waitForMotionRuntimeReady,
} from './motionRuntime.js';

export const GSAP_PAGE_SELECTOR = '[data-gsap-page]';

type LenisScrollSource = {
  on?: (event: 'scroll', callback: () => void) => void;
  off?: (event: 'scroll', callback: () => void) => void;
};

type MotionRuntimeSource = {
  subscribeLenis?: (subscriber: (lenis: LenisScrollSource | null) => void) => () => void;
};

type GsapPageRuntimeState = {
  cleanup: (() => void) | null;
  runId: number;
};

type GsapPageRuntimeModules = Awaited<ReturnType<typeof loadDefaultModules>>;

type GsapPageRuntimeOptions = {
  loadModules?: () => Promise<GsapPageRuntimeModules>;
  getMotionRuntime?: () => MotionRuntimeSource | null | undefined;
  requestFrame?: (callback: FrameRequestCallback) => number | ReturnType<typeof setTimeout>;
};

declare global {
  interface Window {
    __mgGsapPageRuntime?: GsapPageRuntimeState;
    __mgMotionRuntime?: MotionRuntimeSource | null;
  }
}

let gsapPageRuntimeRunId = 0;

function loadDefaultModules() {
  return Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
}

function hasLiveGsapPageMarker() {
  const marker = document.querySelector(GSAP_PAGE_SELECTOR);
  return Boolean(marker && document.body?.contains(marker));
}

function resetGsapPageRuntime(runId: number) {
  window.__mgGsapPageRuntime?.cleanup?.();
  window.__mgGsapPageRuntime = { cleanup: null, runId };
}

export function cleanupGsapPageRuntime() {
  const runId = ++gsapPageRuntimeRunId;

  resetGsapPageRuntime(runId);
}

export async function initGsapPageRuntime({
  loadModules = loadDefaultModules,
  getMotionRuntime = () => window.__mgMotionRuntime,
  requestFrame = (callback) => (
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(callback)
      : globalThis.setTimeout(() => callback(Date.now()), 0)
  ),
}: GsapPageRuntimeOptions = {}) {
  const runId = ++gsapPageRuntimeRunId;

  window.__mgGsapPageRuntime?.cleanup?.();

  if (!hasLiveGsapPageMarker()) {
    window.__mgGsapPageRuntime = { cleanup: null, runId };
    return;
  }

  let activeLenis: LenisScrollSource | null = null;
  let unsubscribeLenis = () => {};
  let cancelMotionRuntimeWait = () => {};
  let clearScrollMemory: (() => void) | undefined;

  const onLenisScroll = () => {
    scrollTriggerUpdate?.();
  };
  let scrollTriggerUpdate: (() => void) | undefined;

  const cleanup = () => {
    cancelMotionRuntimeWait();
    activeLenis?.off?.('scroll', onLenisScroll);
    activeLenis = null;
    unsubscribeLenis();
    unsubscribeLenis = () => {};
    document.removeEventListener('astro:page-load', onPageLoad);
    document.removeEventListener('astro:before-preparation', onBeforePreparation);
    clearScrollMemory?.();

    if (window.__mgGsapPageRuntime?.runId === runId) {
      window.__mgGsapPageRuntime = { cleanup: null, runId };
    }
  };

  const refreshScroll = () => {
    scrollTriggerRefresh?.();
  };
  const onPageLoad = () => {
    requestFrame(() => {
      if (window.__mgGsapPageRuntime?.runId !== runId || !hasLiveGsapPageMarker()) {
        return;
      }

      refreshScroll();
    });
  };
  const onBeforePreparation = () => {
    cleanupGsapPageRuntime();
  };
  let scrollTriggerRefresh: (() => void) | undefined;

  window.__mgGsapPageRuntime = {
    cleanup,
    runId,
  };

  const [{ default: gsap }, { ScrollTrigger }] = await loadModules();

  if (window.__mgGsapPageRuntime?.runId !== runId || !hasLiveGsapPageMarker()) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.lagSmoothing(0);

  scrollTriggerUpdate = () => ScrollTrigger.update();
  scrollTriggerRefresh = () => ScrollTrigger.refresh();
  clearScrollMemory = ScrollTrigger.clearScrollMemory?.bind(ScrollTrigger);

  const motionRuntime = getMotionRuntime();
  const readyHandle = motionRuntime?.subscribeLenis
    ? null
    : waitForMotionRuntimeReady({
      getRuntime: getMotionRuntime,
    });

  if (readyHandle) {
    cancelMotionRuntimeWait = readyHandle.cancel;
  }

  const activeMotionRuntime = motionRuntime?.subscribeLenis
    ? motionRuntime
    : await readyHandle?.promise;

  if (window.__mgGsapPageRuntime?.runId !== runId || !hasLiveGsapPageMarker()) {
    cancelMotionRuntimeWait();
    return;
  }

  if (activeMotionRuntime?.subscribeLenis) {
    unsubscribeLenis = activeMotionRuntime.subscribeLenis((lenis) => {
      activeLenis?.off?.('scroll', onLenisScroll);
      activeLenis = lenis;
      activeLenis?.on?.('scroll', onLenisScroll);
    });
  }

  document.addEventListener('astro:page-load', onPageLoad);
  document.addEventListener('astro:before-preparation', onBeforePreparation);
  refreshScroll();
}
