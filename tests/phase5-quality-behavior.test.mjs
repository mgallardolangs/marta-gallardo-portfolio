import test from 'node:test';
import assert from 'node:assert/strict';

import { createHeaderOverlayState, closeActiveHeaderOverlay, getFocusTrapTarget, toggleLanguageMenu, toggleMobileMenu } from '../src/lib/headerOverlayState.js';
import { createMotionRuntimeController } from '../src/lib/motionRuntime.js';

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
