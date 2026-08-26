export const ADMIN_INIT_RETRY_DELAY_MS = 500;
export const ADMIN_INIT_MAX_RETRIES = 12;
export const ADMIN_INIT_FALLBACK_DELAY_MS = 2000;

export function shouldAllowTokenlessAdminInit(_hostname) {
  return true;
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
