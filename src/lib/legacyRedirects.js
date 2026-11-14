// Old URLs that moved in November 2026, mapped to where they live now.
//
// Single source of truth for two places that must agree:
// - netlify.toml: one [[redirects]] rule per entry, for requests without a trailing slash.
// - netlify/edge-functions/trailing-slash.js: for "/en/ugc/" and the like, so the
//   edge function sends the visitor straight to the final URL in one 301 instead of
//   stripping the slash first and letting the Netlify rule redirect again (two hops).
//
// tests/legacy-redirects.test.mjs checks that netlify.toml and this map stay in sync.
import { localizedRoutes } from './localizedRoutes.js';

const otherLocales = ['en', 'fr', 'de', 'it', 'ca'];

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

export const legacyRedirects = Object.freeze({
  ...legacyServiceRedirects,
  ...legacyBlogRedirects,
});
