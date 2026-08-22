export const MOTION_RUNTIME_READY_EVENT = 'mg:motion-runtime-ready';

export function createMotionRuntimeController({
  createLenis,
  onLenisChange = () => {},
  setReducedMotion = () => {},
  clearReducedMotion = () => {},
}) {
  let lenis = null;
  const subscribers = new Set();

  const updateLenis = (nextLenis) => {
    lenis = nextLenis;
    onLenisChange(nextLenis);
    subscribers.forEach((subscriber) => subscriber(nextLenis));
    return lenis;
  };

  const ensureLenis = () => {
    if (lenis) return lenis;
    return updateLenis(createLenis());
  };

  const destroy = () => {
    if (!lenis) return null;
    lenis.destroy();
    return updateLenis(null);
  };

  return {
    getLenis() {
      return lenis;
    },
    subscribeLenis(subscriber) {
      subscribers.add(subscriber);
      subscriber(lenis);
      return () => {
        subscribers.delete(subscriber);
      };
    },
    syncPreference(prefersReducedMotion) {
      if (prefersReducedMotion) {
        destroy();
        setReducedMotion(true);
        return null;
      }

      const activeLenis = ensureLenis();
      setReducedMotion(false);
      activeLenis.resize();
      return activeLenis;
    },
    start() {
      ensureLenis().start();
      return lenis;
    },
    stop() {
      lenis?.stop();
      return lenis;
    },
    destroy,
    cleanup() {
      destroy();
      clearReducedMotion();
    },
  };
}

export function createDeferredMotionPreferenceSync({
  controller,
  reducedMotionMedia,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (frameId) => cancelAnimationFrame(frameId),
}) {
  let pendingFrame = null;

  const cancel = () => {
    if (pendingFrame === null) return;
    cancelFrame(pendingFrame);
    pendingFrame = null;
  };

  return {
    queue() {
      cancel();
      pendingFrame = requestFrame(() => {
        pendingFrame = null;
        controller.syncPreference(reducedMotionMedia.matches);
      });
      return pendingFrame;
    },
    cancel,
  };
}

export function waitForMotionRuntimeReady({
  getRuntime = () => window.__mgMotionRuntime ?? null,
  addReadyListener = (listener) => {
    document.addEventListener(MOTION_RUNTIME_READY_EVENT, listener);
    return () => document.removeEventListener(MOTION_RUNTIME_READY_EVENT, listener);
  },
} = {}) {
  let settled = false;
  let cleanupReadyListener = () => {};
  let resolvePromise = () => {};

  const settle = (runtime) => {
    if (settled) return;
    settled = true;
    cleanupReadyListener();
    resolvePromise(runtime);
  };

  const resolveIfReady = () => {
    const runtime = getRuntime();
    if (!runtime?.subscribeLenis) return false;
    settle(runtime);
    return true;
  };

  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  cleanupReadyListener = addReadyListener(() => {
    resolveIfReady();
  });
  resolveIfReady();

  return {
    promise,
    cancel() {
      settle(null);
    },
  };
}
