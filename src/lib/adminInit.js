const LOCAL_ADMIN_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

export function shouldAllowTokenlessAdminInit(hostname = '') {
  const normalizedHostname = String(hostname).trim().replace(/^\[(.*)\]$/, '$1').toLowerCase();
  return LOCAL_ADMIN_HOSTS.has(normalizedHostname);
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
