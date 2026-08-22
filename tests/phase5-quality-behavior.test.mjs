import test from 'node:test';
import assert from 'node:assert/strict';

import * as headerOverlayStateModule from '../src/lib/headerOverlayState.js';
import * as motionRuntimeModule from '../src/lib/motionRuntime.js';

const {
  createHeaderOverlayState,
  closeActiveHeaderOverlay,
  getFocusTrapTarget,
  toggleLanguageMenu,
  toggleMobileMenu,
} = headerOverlayStateModule;
const { createMotionRuntimeController, MOTION_RUNTIME_READY_EVENT } = motionRuntimeModule;

test('motion runtime destroys Lenis under reduced motion and recreates a fresh instance when motion returns', () => {
  const instances = [];
  let reducedMotionState = null;
  let clearedReducedMotion = false;
  const controller = createMotionRuntimeController({
    createLenis: () => {
      const instance = {
        id: instances.length + 1,
        startCalls: 0,
        stopCalls: 0,
        resizeCalls: 0,
        destroyCalls: 0,
        start() {
          this.startCalls += 1;
        },
        stop() {
          this.stopCalls += 1;
        },
        resize() {
          this.resizeCalls += 1;
        },
        destroy() {
          this.destroyCalls += 1;
        },
      };

      instances.push(instance);
      return instance;
    },
    setReducedMotion: (value) => {
      reducedMotionState = value;
    },
    clearReducedMotion: () => {
      clearedReducedMotion = true;
    },
  });

  assert.equal(controller.syncPreference(true), null);
  assert.equal(instances.length, 0, 'reduced motion should keep Lenis uninitialized so native scrolling stays in charge');

  const firstInstance = controller.syncPreference(false);
  assert.equal(instances.length, 1);
  assert.equal(firstInstance.resizeCalls, 1);
  assert.equal(reducedMotionState, false);

  controller.syncPreference(true);
  assert.equal(firstInstance.destroyCalls, 1, 'entering reduced motion should destroy the active Lenis instance');
  assert.equal(firstInstance.stopCalls, 0, 'reduced motion should never call stop() as a substitute for teardown');
  assert.equal(controller.getLenis(), null);
  assert.equal(reducedMotionState, true);

  const secondInstance = controller.syncPreference(false);
  assert.equal(instances.length, 2, 'leaving reduced motion should create a fresh Lenis instance');
  assert.notEqual(secondInstance, firstInstance);
  assert.equal(secondInstance.resizeCalls, 1);

  controller.cleanup();
  assert.equal(secondInstance.destroyCalls, 1);
  assert.equal(clearedReducedMotion, true);
});

test('motion runtime notifies live Lenis subscribers when reduced-motion toggles replace the instance', () => {
  const seenInstances = [];
  const controller = createMotionRuntimeController({
    createLenis: () => ({
      start() {},
      stop() {},
      resize() {},
      destroy() {},
    }),
  });

  const unsubscribe = controller.subscribeLenis((lenis) => {
    seenInstances.push(lenis);
  });

  assert.deepEqual(seenInstances, [null], 'subscribers should learn that no Lenis instance exists before full motion is enabled');

  const firstInstance = controller.syncPreference(false);
  controller.syncPreference(true);
  const secondInstance = controller.syncPreference(false);

  assert.equal(seenInstances[1], firstInstance, 'subscribers should receive the first live Lenis instance');
  assert.equal(seenInstances[2], null, 'subscribers should receive null when reduced motion tears Lenis down');
  assert.equal(seenInstances[3], secondInstance, 'subscribers should receive the fresh Lenis instance after reduced motion turns off');

  unsubscribe();
});

test('motion runtime deferred preference sync re-reads live reduced-motion state across rapid RAF races', () => {
  assert.equal(
    typeof motionRuntimeModule.createDeferredMotionPreferenceSync,
    'function',
    'motion runtime should expose a deterministic deferred sync helper for RAF race coverage',
  );

  const pendingFrames = new Map();
  let nextFrameId = 1;
  const syncCalls = [];
  let lenisCreateCount = 0;
  const reducedMotionMedia = { matches: false };
  const deferredSync = motionRuntimeModule.createDeferredMotionPreferenceSync({
    reducedMotionMedia,
    controller: {
      syncPreference(prefersReducedMotion) {
        syncCalls.push(prefersReducedMotion);
        if (!prefersReducedMotion) {
          lenisCreateCount += 1;
        }
      },
    },
    requestFrame: (callback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      pendingFrames.set(frameId, callback);
      return frameId;
    },
    cancelFrame: (frameId) => {
      pendingFrames.delete(frameId);
    },
  });

  deferredSync.queue();
  reducedMotionMedia.matches = true;
  pendingFrames.get(1)?.();

  assert.deepEqual(syncCalls, [true], 'the queued callback should re-read the media query and keep Lenis destroyed');
  assert.equal(lenisCreateCount, 0, 'a stale queued callback must not recreate Lenis after reduced motion turns on');

  deferredSync.queue();
  reducedMotionMedia.matches = false;
  pendingFrames.get(2)?.();

  assert.deepEqual(syncCalls, [true, false], 'the same helper should recreate Lenis when full motion returns before the frame runs');
  assert.equal(lenisCreateCount, 1);

  deferredSync.queue();
  deferredSync.cancel();
  pendingFrames.get(3)?.();

  assert.deepEqual(syncCalls, [true, false], 'cleanup should be able to cancel the pending RAF entirely');
});

test('header overlay state keeps language and mobile overlays mutually exclusive with active-overlay focus policies', () => {
  const languageTrigger = { id: 'language-toggle' };
  const mobileTrigger = { id: 'mobile-toggle' };

  let result = toggleMobileMenu(createHeaderOverlayState(), mobileTrigger);
  assert.equal(result.state.mobileMenuOpen, true);
  assert.equal(result.state.languageMenuOpen, false);
  assert.equal(result.state.bodyScrollLocked, true);
  assert.equal(result.focusTarget, 'mobile-close');
  assert.equal(getFocusTrapTarget(result.state), 'mobile');

  result = toggleLanguageMenu(result.state, languageTrigger);
  assert.equal(result.state.mobileMenuOpen, false, 'opening the language menu should close the mobile panel');
  assert.equal(result.state.languageMenuOpen, true);
  assert.equal(result.state.bodyScrollLocked, false, 'body scroll lock should clear when the mobile panel closes');
  assert.equal(result.focusTarget, 'first-language-item');
  assert.equal(result.restoreFocusTo, null, 'switching overlays should not bounce focus back to the previous trigger');
  assert.equal(getFocusTrapTarget(result.state), 'language');

  result = toggleMobileMenu(result.state, mobileTrigger);
  assert.equal(result.state.mobileMenuOpen, true, 'opening the mobile panel should close the language menu');
  assert.equal(result.state.languageMenuOpen, false);
  assert.equal(result.state.bodyScrollLocked, true);
  assert.equal(result.focusTarget, 'mobile-close');
  assert.equal(getFocusTrapTarget(result.state), 'mobile');

  const closed = closeActiveHeaderOverlay(result.state);
  assert.equal(closed.state.mobileMenuOpen, false);
  assert.equal(closed.state.languageMenuOpen, false);
  assert.equal(closed.state.bodyScrollLocked, false);
  assert.equal(closed.restoreFocusTo, mobileTrigger, 'closing the active overlay should restore the control that opened it');
  assert.equal(getFocusTrapTarget(closed.state), null);
});

test('header visibility stays pinned open while any overlay is active and resumes hide-on-scroll after close', () => {
  assert.equal(
    typeof headerOverlayStateModule.getHeaderVisibilityState,
    'function',
    'header overlay state should expose a shared visibility helper for overlay scroll races',
  );

  const languageOverlay = toggleLanguageMenu(createHeaderOverlayState(), { id: 'language-toggle' });
  const mobileOverlay = toggleMobileMenu(createHeaderOverlayState(), { id: 'mobile-toggle' });

  const visibleWithLanguage = headerOverlayStateModule.getHeaderVisibilityState({
    currentHidden: true,
    overlayState: languageOverlay.state,
    isDesktop: true,
    scrollY: 320,
    lastScrollY: 200,
  });
  assert.equal(visibleWithLanguage.hidden, false, 'scroll-down should not hide the active language overlay or its focus trap');
  assert.equal(visibleWithLanguage.compact, true);

  const visibleWithMobile = headerOverlayStateModule.getHeaderVisibilityState({
    currentHidden: true,
    overlayState: mobileOverlay.state,
    isDesktop: true,
    scrollY: 360,
    lastScrollY: 200,
  });
  assert.equal(visibleWithMobile.hidden, false, 'mobile overlay should also pin the header open');

  const hiddenAfterClose = headerOverlayStateModule.getHeaderVisibilityState({
    currentHidden: false,
    overlayState: closeActiveHeaderOverlay(languageOverlay.state).state,
    isDesktop: true,
    scrollY: 320,
    lastScrollY: 200,
  });
  assert.equal(hiddenAfterClose.hidden, true, 'normal scroll-hide behavior should resume once overlays close');
});

test('gsap page runtime subscribes when motion runtime becomes available later and cleanup leaves route-owned triggers alive', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

  const marker = { id: 'gsap-marker' };
  const documentListeners = new Map();
  const lenisScrollCallbacks = [];
  const lenisOffCallbacks = [];
  let scrollTriggerRefreshCalls = 0;
  let scrollTriggerUpdateCalls = 0;
  let scrollTriggerKillCalls = 0;
  let clearScrollMemoryCalls = 0;
  let unsubscribeCalls = 0;
  let resolveModules;
  const modulesPromise = new Promise((resolve) => {
    resolveModules = resolve;
  });

  globalThis.window = {
    __mgGsapPageRuntime: undefined,
    __mgMotionRuntime: undefined,
  };
  globalThis.document = {
    body: {
      contains: (element) => element === marker,
    },
    querySelector: (selector) => (selector === '[data-gsap-page]' ? marker : null),
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) ?? new Set();
      listeners.add(listener);
      documentListeners.set(type, listeners);
    },
    removeEventListener(type, listener) {
      documentListeners.get(type)?.delete(listener);
    },
    dispatchEvent(event) {
      for (const listener of documentListeners.get(event.type) ?? []) {
        listener(event);
      }
      return true;
    },
  };
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };

  try {
    const { cleanupGsapPageRuntime, initGsapPageRuntime } = await import('../src/lib/gsapPageRuntime.ts');

    const mountPromise = initGsapPageRuntime({
      loadModules: () => modulesPromise,
    });

    resolveModules([
      {
        default: {
          registerPlugin() {},
          ticker: {
            lagSmoothing() {},
          },
        },
      },
      {
        ScrollTrigger: {
          refresh() {
            scrollTriggerRefreshCalls += 1;
          },
          update() {
            scrollTriggerUpdateCalls += 1;
          },
          clearScrollMemory() {
            clearScrollMemoryCalls += 1;
          },
          getAll() {
            return [{
              kill() {
                scrollTriggerKillCalls += 1;
              },
            }];
          },
        },
      },
    ]);
    await Promise.resolve();

    assert.equal(
      documentListeners.get(MOTION_RUNTIME_READY_EVENT)?.size ?? 0,
      1,
      'the GSAP runtime should wait for MotionRuntime readiness on first load when Lenis is not ready yet',
    );

    window.__mgMotionRuntime = {
      subscribeLenis(subscriber) {
        const lenis = {
          on(event, callback) {
            if (event === 'scroll') {
              lenisScrollCallbacks.push(callback);
            }
          },
          off(event, callback) {
            if (event === 'scroll') {
              lenisOffCallbacks.push(callback);
            }
          },
        };

        subscriber(lenis);
        return () => {
          unsubscribeCalls += 1;
        };
      },
    };

    document.dispatchEvent({ type: MOTION_RUNTIME_READY_EVENT });
    await mountPromise;

    assert.equal(scrollTriggerRefreshCalls, 1, 'mount should refresh ScrollTrigger once after the bridge becomes live');
    assert.equal(lenisScrollCallbacks.length, 1, 'mount should subscribe exactly one Lenis scroll bridge');

    lenisScrollCallbacks[0]();
    assert.equal(scrollTriggerUpdateCalls, 1, 'Lenis scroll events should drive ScrollTrigger updates');

    cleanupGsapPageRuntime();

    assert.equal(lenisOffCallbacks.length, 1, 'cleanup should detach the exact Lenis scroll listener it added');
    assert.equal(unsubscribeCalls, 1, 'cleanup should unsubscribe from live MotionRuntime changes');
    assert.equal(clearScrollMemoryCalls, 1, 'cleanup may clear scroll memory for the departed route');
    assert.equal(scrollTriggerKillCalls, 0, 'cleanup must not kill route-owned ScrollTriggers from the current page');
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  }
});

test('gsap page runtime run-id cleanup cancels stale imports and pending motion-runtime readiness listeners', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  const marker = { id: 'gsap-marker' };
  const documentListeners = new Map();
  let subscribeCalls = 0;
  let resolveModules;
  const modulesPromise = new Promise((resolve) => {
    resolveModules = resolve;
  });

  globalThis.window = {
    __mgGsapPageRuntime: undefined,
    __mgMotionRuntime: undefined,
  };
  globalThis.document = {
    body: {
      contains: (element) => element === marker,
    },
    querySelector: (selector) => (selector === '[data-gsap-page]' ? marker : null),
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) ?? new Set();
      listeners.add(listener);
      documentListeners.set(type, listeners);
    },
    removeEventListener(type, listener) {
      documentListeners.get(type)?.delete(listener);
    },
    dispatchEvent(event) {
      for (const listener of documentListeners.get(event.type) ?? []) {
        listener(event);
      }
      return true;
    },
  };

  try {
    const { cleanupGsapPageRuntime, initGsapPageRuntime } = await import('../src/lib/gsapPageRuntime.ts');

    const firstMount = initGsapPageRuntime({
      loadModules: () => modulesPromise,
    });
    const secondMount = initGsapPageRuntime({
      loadModules: () => modulesPromise,
    });

    cleanupGsapPageRuntime();
    assert.equal(
      documentListeners.get(MOTION_RUNTIME_READY_EVENT)?.size ?? 0,
      0,
      'route cleanup should remove any pending motion-runtime readiness listener immediately',
    );

    resolveModules([
      {
        default: {
          registerPlugin() {},
          ticker: {
            lagSmoothing() {},
          },
        },
      },
      {
        ScrollTrigger: {
          refresh() {},
          update() {},
          clearScrollMemory() {},
        },
      },
    ]);

    await Promise.all([firstMount, secondMount]);

    window.__mgMotionRuntime = {
      subscribeLenis() {
        subscribeCalls += 1;
        return () => {};
      },
    };
    document.dispatchEvent({ type: MOTION_RUNTIME_READY_EVENT });

    assert.equal(subscribeCalls, 0, 'stale async mounts must not subscribe after a newer cleanup invalidates their run id');
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
