export const ADMIN_INIT_RETRY_DELAY_MS = 500;
export const ADMIN_INIT_MAX_RETRIES = 12;
export const ADMIN_INIT_FALLBACK_DELAY_MS = 2000;

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
