export function createHeaderOverlayState() {
  return {
    activeOverlay: null,
    languageMenuOpen: false,
    mobileMenuOpen: false,
    bodyScrollLocked: false,
    restoreFocusTo: null,
  };
}

function createOpenResult(overlay, trigger) {
  const isLanguage = overlay === 'language';

  return {
    state: {
      activeOverlay: overlay,
      languageMenuOpen: isLanguage,
      mobileMenuOpen: !isLanguage,
      bodyScrollLocked: !isLanguage,
      restoreFocusTo: trigger,
    },
    focusTarget: isLanguage ? 'first-language-item' : 'mobile-close',
    restoreFocusTo: null,
  };
}

export function closeActiveHeaderOverlay(state) {
  if (!state.activeOverlay) {
    return {
      state,
      focusTarget: null,
      restoreFocusTo: null,
    };
  }

  return {
    state: createHeaderOverlayState(),
    focusTarget: null,
    restoreFocusTo: state.restoreFocusTo,
  };
}

export function toggleLanguageMenu(state, trigger) {
  if (state.activeOverlay === 'language') {
    return closeActiveHeaderOverlay(state);
  }

  return createOpenResult('language', trigger);
}

export function toggleMobileMenu(state, trigger) {
  if (state.activeOverlay === 'mobile') {
    return closeActiveHeaderOverlay(state);
  }

  return createOpenResult('mobile', trigger);
}

export function getFocusTrapTarget(state) {
  return state.activeOverlay;
}

export function getHeaderVisibilityState({
  currentHidden,
  overlayState,
  isDesktop,
  scrollY,
  lastScrollY,
}) {
  const compact = scrollY > 80;

  if (!isDesktop || overlayState.activeOverlay) {
    return {
      compact,
      hidden: false,
      lastScrollY: scrollY,
    };
  }

  const delta = scrollY - lastScrollY;

  if (scrollY <= 120 || delta < -8) {
    return {
      compact,
      hidden: false,
      lastScrollY: scrollY,
    };
  }

  if (delta > 8) {
    return {
      compact,
      hidden: true,
      lastScrollY: scrollY,
    };
  }

  return {
    compact,
    hidden: currentHidden,
    lastScrollY: scrollY,
  };
}
