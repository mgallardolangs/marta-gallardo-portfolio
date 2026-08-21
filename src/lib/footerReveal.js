export const FOOTER_REVEAL_STORAGE_KEY = 'mg-footer-reveal-seen';

export function getFooterRevealMode({ hasSessionFlag, prefersReducedMotion }) {
  return hasSessionFlag || prefersReducedMotion ? 'skip' : 'play';
}

export function hasFooterRevealSessionFlag(storage) {
  try {
    return storage?.getItem(FOOTER_REVEAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function rememberFooterReveal(storage) {
  try {
    storage?.setItem(FOOTER_REVEAL_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage failures and fall back to in-memory/root-attribute behavior.
  }
}
