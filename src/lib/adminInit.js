export const ADMIN_INIT_RETRY_DELAY_MS = 500;
export const ADMIN_INIT_MAX_RETRIES = 12;
export const ADMIN_INIT_FALLBACK_DELAY_MS = 2000;

// Bounded retry for AdminAuthGate's login auto-open: the Netlify Identity
// widget script can still be loading when the gate mounts, so it retries a
// few times on a short timer instead of silently giving up or opening more
// than once (a "modal storm").
export const ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS = 250;
export const ADMIN_AUTH_GATE_OPEN_MAX_RETRIES = 20;

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

export function shouldAllowTokenlessAdminInit(hostname) {
  if (typeof hostname !== 'string') return false;

  const normalized = hostname.trim().toLowerCase();
  const unbracketed = normalized.startsWith('[') && normalized.endsWith(']')
    ? normalized.slice(1, -1)
    : normalized;

  return LOOPBACK_HOSTNAMES.has(unbracketed);
}

export function getNetlifyIdentityToken(user) {
  const token = user?.token?.access_token;
  return typeof token === 'string' ? token : '';
}

export function getAdminInitDecision({ isInitialized, identityToken, allowTokenlessFallback }) {
  if (identityToken) {
    return isInitialized ? 'update-token' : 'init-with-token';
  }

  if (!isInitialized && allowTokenlessFallback) {
    return 'init-without-token';
  }

  return 'wait';
}

export function createAdminAuthGateOpenController({
  tryOpen,
  scheduleRetry,
  clearRetry,
  retryDelayMs = ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS,
  maxRetries = ADMIN_AUTH_GATE_OPEN_MAX_RETRIES,
}) {
  let attempts = 0;
  let autoOpenSatisfied = false;
  let retryTimeoutId;

  const clearPendingRetry = () => {
    if (retryTimeoutId === undefined) return;
    clearRetry(retryTimeoutId);
    retryTimeoutId = undefined;
  };

  const markAutoOpenSatisfied = () => {
    autoOpenSatisfied = true;
    clearPendingRetry();
  };

  const attemptAutoOpen = () => {
    if (autoOpenSatisfied) return false;

    if (tryOpen('auto')) {
      markAutoOpenSatisfied();
      return true;
    }

    attempts += 1;
    if (attempts >= maxRetries) return false;

    clearPendingRetry();
    retryTimeoutId = scheduleRetry(() => {
      retryTimeoutId = undefined;
      attemptAutoOpen();
    }, retryDelayMs);

    return false;
  };

  const attemptManualOpen = () => {
    const didOpen = tryOpen('manual');
    if (didOpen) {
      markAutoOpenSatisfied();
    }

    return didOpen;
  };

  return {
    attemptAutoOpen,
    attemptManualOpen,
    dispose: clearPendingRetry,
  };
}
