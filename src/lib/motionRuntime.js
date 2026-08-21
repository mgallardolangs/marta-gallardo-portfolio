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
