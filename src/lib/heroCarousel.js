const heroCarouselCleanups = new WeakMap();
const activeHeroCarouselCleanups = new Set();

function cleanupHeroCarousel(container) {
  heroCarouselCleanups.get(container)?.();
  heroCarouselCleanups.delete(container);
  delete container.dataset.heroCarouselInitialized;
}

function cleanupAllHeroCarousels() {
  activeHeroCarouselCleanups.forEach((cleanup) => cleanup());
  activeHeroCarouselCleanups.clear();
}

export function initHeroCarousels(root = document) {
  cleanupAllHeroCarousels();

  root.querySelectorAll('.hero-carousel').forEach((container) => {
    if (!(container instanceof HTMLElement)) {
      return;
    }

    cleanupHeroCarousel(container);

    const slides = Array.from(container.querySelectorAll('.carousel-slide'));
    if (slides.length <= 1) {
      return;
    }

    const interval = Number.parseInt(container.dataset.interval ?? '3500', 10);
    let current = 0;
    let autoTimer = 0;
    let touchStartX = 0;

    const goTo = (idx) => {
      current = ((idx % slides.length) + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        slide.style.transform = `translateX(${(index - current) * 100}%)`;
      });
    };

    const next = () => goTo(current + 1);
    const prev = () => goTo(current - 1);
    const clearAuto = () => window.clearInterval(autoTimer);
    const resetAuto = () => {
      clearAuto();
      autoTimer = window.setInterval(next, interval);
    };

    const onWheel = (event) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || Math.abs(event.deltaY) > 30) {
        event.preventDefault();
        if (event.deltaX > 0 || event.deltaY > 0) {
          next();
        } else {
          prev();
        }
        resetAuto();
      }
    };

    const onTouchStart = (event) => {
      touchStartX = event.touches[0]?.clientX ?? 0;
    };

    const onTouchEnd = (event) => {
      const diff = touchStartX - (event.changedTouches[0]?.clientX ?? touchStartX);
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          next();
        } else {
          prev();
        }
        resetAuto();
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart);
    container.addEventListener('touchend', onTouchEnd);

    goTo(0);
    autoTimer = window.setInterval(next, interval);
    container.dataset.heroCarouselInitialized = 'true';

    const cleanup = () => {
      clearAuto();
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
      delete container.dataset.heroCarouselInitialized;
      activeHeroCarouselCleanups.delete(cleanup);
    };

    heroCarouselCleanups.set(container, cleanup);
    activeHeroCarouselCleanups.add(cleanup);
  });
}
