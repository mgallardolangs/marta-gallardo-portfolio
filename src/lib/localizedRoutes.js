export const localizedRoutes = {
  home: {
    es: '/',
    en: '/en',
    fr: '/fr',
    de: '/de',
    it: '/it',
    ca: '/ca',
  },
  about: {
    es: '/sobre-mi',
    en: '/en/about',
    fr: '/fr/a-propos',
    de: '/de/ueber-mich',
    it: '/it/chi-sono',
    ca: '/ca/sobre-mi',
  },
  seo: {
    es: '/servicios/seo',
    en: '/en/services/seo',
    fr: '/fr/services/seo',
    de: '/de/dienstleistungen/seo',
    it: '/it/servizi/seo',
    ca: '/ca/serveis/seo',
  },
  translation: {
    es: '/servicios/traduccion',
    en: '/en/services/translation',
    fr: '/fr/services/traduction',
    de: '/de/dienstleistungen/uebersetzung',
    it: '/it/servizi/traduzione',
    ca: '/ca/serveis/traduccio',
  },
  ugc: {
    es: '/servicios/ugc',
    en: '/en/services/ugc',
    fr: '/fr/services/ugc',
    de: '/de/dienstleistungen/ugc',
    it: '/it/servizi/ugc',
    ca: '/ca/serveis/ugc',
  },
  blog: {
    es: '/blog',
    en: '/en/blog',
    fr: '/fr/blog',
    de: '/de/blog',
    it: '/it/blog',
    ca: '/ca/blog',
  },
  contact: {
    es: '/contacto',
    en: '/en/contact',
    fr: '/fr/contact',
    de: '/de/contact',
    it: '/it/contact',
    ca: '/ca/contact',
  },
  privacy: {
    es: '/politica-de-privacidad',
    en: '/en/privacy-policy',
    fr: '/fr/politique-de-confidentialite',
    de: '/de/datenschutz',
    it: '/it/privacy-policy',
    ca: '/ca/politica-de-privacitat',
  },
  cookies: {
    es: '/politica-de-cookies',
    en: '/en/cookie-policy',
    fr: '/fr/politique-de-cookies',
    de: '/de/cookie-richtlinie',
    it: '/it/cookie-policy',
    ca: '/ca/politica-de-galetes',
  },
  legalNotice: {
    es: '/aviso-legal',
    en: '/en/legal-notice',
    fr: '/fr/mentions-legales',
    de: '/de/impressum',
    it: '/it/note-legali',
    ca: '/ca/avis-legal',
  },
};

const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const routeKeys = Object.keys(localizedRoutes);
const routeAliases = new Map([
  ['/ugc', 'ugc'],
  ['/contact', 'contact'],
]);

function normalizePath(path) {
  const trimmedPath = typeof path === 'string' ? path.trim() : '';
  if (!trimmedPath) return '/';

  const withLeadingSlash = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
  const normalizedSlashes = withLeadingSlash.replace(/\/{2,}/g, '/');
  return normalizedSlashes === '/' ? '/' : normalizedSlashes.replace(/\/+$/, '');
}

function resolveBlogPath(path) {
  for (const locale of locales) {
    const blogPath = localizedRoutes.blog[locale];
    if (path === blogPath) return { locale, suffix: '' };
    if (path.startsWith(`${blogPath}/`)) {
      return { locale, suffix: path.slice(blogPath.length) };
    }
  }

  return null;
}

export function getLocalizedRoute(routeKey, locale) {
  const route = localizedRoutes[routeKey]?.[locale];
  if (!route) {
    throw new RangeError(`Unsupported localized route "${routeKey}" for locale "${locale}"`);
  }

  return route;
}

export function resolvePublicRouteKey(path) {
  const normalizedPath = normalizePath(path);
  const aliasRoute = routeAliases.get(normalizedPath);
  if (aliasRoute) return aliasRoute;

  for (const routeKey of routeKeys) {
    if (Object.values(localizedRoutes[routeKey]).includes(normalizedPath)) return routeKey;
  }

  return resolveBlogPath(normalizedPath) ? 'blog' : null;
}

export function stripLocaleFromPath(pathname) {
  const normalizedPath = normalizePath(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);
  const [first, ...rest] = segments;

  if (first && locales.includes(first)) {
    const nextPath = `/${rest.join('/')}`;
    return nextPath || '/';
  }

  return normalizedPath;
}

export function getLocalizedPath(path, locale) {
  const normalizedPath = normalizePath(path);
  const blogPath = resolveBlogPath(normalizedPath);
  if (blogPath) {
    return `${localizedRoutes.blog[locale]}${blogPath.suffix}`;
  }

  const routeKey = resolvePublicRouteKey(normalizedPath)
    ?? resolvePublicRouteKey(stripLocaleFromPath(normalizedPath));

  if (routeKey) return getLocalizedRoute(routeKey, locale);

  const localeStrippedPath = stripLocaleFromPath(normalizedPath);
  return locale === 'es' ? localeStrippedPath : `/${locale}${localeStrippedPath}`;
}
