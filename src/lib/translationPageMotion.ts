type TranslationPageMotionState = {
  cleanup: (() => void) | null;
  runId: number;
};

type TranslationPageMotionModules = Awaited<ReturnType<typeof loadDefaultModules>>;

type TranslationPageMotionOptions = {
  loadModules?: () => Promise<TranslationPageMotionModules>;
  matchMedia?: (query: string) => { matches: boolean };
};

declare global {
  interface Window {
    __mgTranslationPageMotion?: TranslationPageMotionState;
  }
}

let translationPageMotionRunId = 0;

function loadDefaultModules() {
  return Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
}

function applyReducedMotionState(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-arsenal-line]').forEach((line) => {
    line.style.transform = 'scaleX(1)';
    line.style.transformOrigin = 'left center';
  });

  root.querySelectorAll<HTMLElement>('[data-arsenal-item],[data-methodology-step],[data-why-card]').forEach((item) => {
    item.style.opacity = '1';
    item.style.transform = 'none';
    item.style.clipPath = 'inset(0 0 0% 0)';
  });

  root.querySelectorAll<HTMLElement>('[data-methodology-connector]').forEach((connector) => {
    connector.style.transform = 'scaleX(1)';
    connector.style.transformOrigin = 'left center';
  });
}

function resetTranslationPageMotion(runId: number) {
  window.__mgTranslationPageMotion?.cleanup?.();
  window.__mgTranslationPageMotion = { cleanup: null, runId };
}

export function cleanupTranslationPageMotion() {
  const runId = ++translationPageMotionRunId;

  resetTranslationPageMotion(runId);
}

export async function initTranslationPageMotion({
  loadModules = loadDefaultModules,
  matchMedia = (query) => window.matchMedia(query),
}: TranslationPageMotionOptions = {}) {
  const runId = ++translationPageMotionRunId;

  resetTranslationPageMotion(runId);

  const root = document.querySelector('[data-translation-page]');
  if (!(root instanceof HTMLElement)) {
    return;
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyReducedMotionState(root);
    return;
  }

  const [{ default: gsap }, { ScrollTrigger }] = await loadModules();

  if (window.__mgTranslationPageMotion?.runId !== runId) {
    return;
  }

  if (!document.body.contains(root)) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // One GSAP context owns all translation-page scroll animations so Astro navigations can revert cleanly.
  const context = gsap.context(() => {
    const arsenalSection = root.querySelector('[data-arsenal-section]');
    const arsenalLines = root.querySelectorAll('[data-arsenal-line]');
    const arsenalItems = root.querySelectorAll('[data-arsenal-item]');

    if (arsenalSection && arsenalLines.length > 0 && arsenalItems.length > 0) {
      gsap.set(arsenalLines, { scaleX: 0, transformOrigin: 'left center' });
      gsap.set(arsenalItems, { autoAlpha: 0, y: 22, clipPath: 'inset(0 0 100% 0)' });

      gsap.timeline({
        scrollTrigger: {
          trigger: arsenalSection,
          start: 'top 72%',
          once: true,
        },
      })
        .to(arsenalLines, { scaleX: 1, duration: 0.55, stagger: 0.12, ease: 'power2.out' })
        .to(arsenalItems, {
          autoAlpha: 1,
          y: 0,
          clipPath: 'inset(0 0 0% 0)',
          duration: 0.52,
          stagger: 0.06,
          ease: 'power2.out',
        }, '-=0.18');
    }

    const methodologySection = root.querySelector('[data-methodology-section]');
    const methodologyConnectors = root.querySelectorAll('[data-methodology-connector]');
    const methodologySteps = root.querySelectorAll('[data-methodology-step]');

    if (methodologySection && methodologyConnectors.length > 0 && methodologySteps.length > 0) {
      const isDesktop = matchMedia('(min-width: 768px)').matches;
      gsap.set(methodologyConnectors, {
        scaleX: isDesktop ? 0 : 1,
        scaleY: isDesktop ? 1 : 0,
        transformOrigin: isDesktop ? 'left center' : 'center top',
      });
      gsap.set(methodologySteps, { autoAlpha: 0, y: 26, clipPath: 'inset(0 0 100% 0)' });

      gsap.timeline({
        scrollTrigger: {
          trigger: methodologySection,
          start: 'top 72%',
          once: true,
        },
      })
        .to(methodologyConnectors, {
          scaleX: 1,
          scaleY: 1,
          duration: 0.6,
          ease: 'power2.out',
        })
        .to(methodologySteps, {
          autoAlpha: 1,
          y: 0,
          clipPath: 'inset(0 0 0% 0)',
          duration: 0.5,
          stagger: 0.12,
          ease: 'power2.out',
        }, '-=0.1');
    }

    const whySection = root.querySelector('[data-why-section]');
    const whyCards = root.querySelectorAll('[data-why-card]');

    if (whySection && whyCards.length > 0) {
      gsap.set(whyCards, { autoAlpha: 0, y: 24, clipPath: 'inset(0 0 100% 0)' });

      gsap.timeline({
        scrollTrigger: {
          trigger: whySection,
          start: 'top 76%',
          once: true,
        },
      }).to(whyCards, {
        autoAlpha: 1,
        y: 0,
        clipPath: 'inset(0 0 0% 0)',
        duration: 0.52,
        stagger: 0.1,
        ease: 'power2.out',
      });
    }
  }, root);

  if (window.__mgTranslationPageMotion?.runId !== runId) {
    context.revert();
    return;
  }

  window.__mgTranslationPageMotion = {
    runId,
    cleanup: () => {
      context.revert();
      if (window.__mgTranslationPageMotion?.runId === runId) {
        window.__mgTranslationPageMotion = { cleanup: null, runId };
      }
    },
  };
}
