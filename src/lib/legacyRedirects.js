// URLs that no longer serve a page, mapped to the page that replaces them.
//
// Single source of truth for two places that must agree:
// - netlify.toml: one [[redirects]] rule per entry, for requests without a trailing slash.
// - netlify/edge-functions/trailing-slash.js: for "/en/ugc/" and the like, so the
//   edge function sends the visitor straight to the final URL in one 301 instead of
//   stripping the slash first and letting the Netlify rule redirect again (two hops).
//
// Every destination is a final, published page: chains are collapsed below, so an old
// URL that used to point at a German page now points at the English page directly.
//
// tests/legacy-redirects.test.mjs checks that netlify.toml and this map stay in sync.
import { localizedRoutes, unpublishedLocaleFallback } from './localizedRoutes.js';

const otherLocales = ['en', 'fr', 'de', 'it', 'ca'];

// Service URLs from before the localized service routes (November 2026).
const legacyServiceRedirects = {
  '/ugc': localizedRoutes.ugc.es,
  '/translation-seo': localizedRoutes.seo.es,
  '/contact': localizedRoutes.contact.es,
  ...Object.fromEntries(
    otherLocales.flatMap((locale) => [
      [`/${locale}/ugc`, localizedRoutes.ugc[locale]],
      [`/${locale}/translation-seo`, localizedRoutes.seo[locale]],
    ]),
  ),
};

// Blog posts kept the Spanish slug in every language until 14/11/2026.
const legacyBlogRedirects = {
  '/en/blog/seo-internacional-mas-alla-de-traducir-tu-web': '/en/blog/international-seo-beyond-translating-your-website',
  '/fr/blog/seo-internacional-mas-alla-de-traducir-tu-web': '/fr/blog/seo-international-au-dela-de-la-traduction-de-votre-site',
  '/de/blog/seo-internacional-mas-alla-de-traducir-tu-web': '/de/blog/internationale-seo-mehr-als-nur-uebersetzung-ihrer-website',
  '/it/blog/seo-internacional-mas-alla-de-traducir-tu-web': '/it/blog/seo-internazionale-oltre-la-traduzione-del-tuo-sito',
  '/ca/blog/seo-internacional-mas-alla-de-traducir-tu-web': '/ca/blog/seo-internacional-mes-enlla-de-traduir-el-teu-web',
  '/en/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones': '/en/blog/from-translator-to-seo-specialist',
  '/fr/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones': '/fr/blog/de-traductrice-a-specialiste-seo',
  '/de/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones': '/de/blog/von-der-uebersetzerin-zur-seo-spezialistin',
  '/it/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones': '/it/blog/da-traduttrice-a-specialista-seo',
  '/ca/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones': '/ca/blog/de-traductora-a-especialista-seo',
};

// Blog post URL in every locale, per post (translationKey = the post's folder name).
// Lets an unpublished locale's post redirect to the same post in its fallback locale.
// tests/legacy-redirects.test.mjs checks it against the slugs in src/content/blog.
export const blogPostPaths = {
  'seo-internacional-mas-alla-de-traducir-tu-web': {
    es: '/blog/seo-internacional-mas-alla-de-traducir-tu-web',
    en: '/en/blog/international-seo-beyond-translating-your-website',
    fr: '/fr/blog/seo-international-au-dela-de-la-traduction-de-votre-site',
    de: '/de/blog/internationale-seo-mehr-als-nur-uebersetzung-ihrer-website',
    it: '/it/blog/seo-internazionale-oltre-la-traduzione-del-tuo-sito',
    ca: '/ca/blog/seo-internacional-mes-enlla-de-traduir-el-teu-web',
  },
  'de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones': {
    es: '/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones',
    en: '/en/blog/from-translator-to-seo-specialist',
    fr: '/fr/blog/de-traductrice-a-specialiste-seo',
    de: '/de/blog/von-der-uebersetzerin-zur-seo-spezialistin',
    it: '/it/blog/da-traduttrice-a-specialista-seo',
    ca: '/ca/blog/de-traductora-a-especialista-seo',
  },
};

// German, Italian and Catalan are not published (15/11/2026): each of their pages
// redirects to the same page in the fallback locale (de, it -> en; ca -> es).
const unpublishedLocaleRedirects = Object.fromEntries(
  Object.entries(unpublishedLocaleFallback).flatMap(([locale, fallback]) => [
    ...Object.values(localizedRoutes).map((routes) => [routes[locale], routes[fallback]]),
    ...Object.values(blogPostPaths).map((paths) => [paths[locale], paths[fallback]]),
  ]),
);

const collapseChains = (redirects) => {
  const finalTarget = (target, seen = new Set()) => {
    if (!(target in redirects) || seen.has(target)) return target;
    seen.add(target);
    return finalTarget(redirects[target], seen);
  };

  return Object.fromEntries(Object.entries(redirects).map(([from, to]) => [from, finalTarget(to)]));
};

export const legacyRedirects = Object.freeze(
  collapseChains({
    ...legacyServiceRedirects,
    ...legacyBlogRedirects,
    ...unpublishedLocaleRedirects,
  }),
);
