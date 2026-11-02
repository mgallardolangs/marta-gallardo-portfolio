import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocalizedPath, getLocalizedRoute, resolvePublicRouteKey, stripLocaleFromPath } from '../src/lib/localizedRoutes.js';

const expectedRoutes = {
  es: {
    home: '/',
    about: '/sobre-mi',
    seo: '/servicios/seo',
    translation: '/servicios/traduccion',
    ugc: '/servicios/ugc',
    blog: '/blog',
    contact: '/contacto',
  },
  en: {
    home: '/en',
    about: '/en/about',
    seo: '/en/services/seo',
    translation: '/en/services/translation',
    ugc: '/en/services/ugc',
    blog: '/en/blog',
    contact: '/en/contact',
  },
  fr: {
    home: '/fr',
    about: '/fr/a-propos',
    seo: '/fr/services/seo',
    translation: '/fr/services/traduction',
    ugc: '/fr/services/ugc',
    blog: '/fr/blog',
    contact: '/fr/contact',
  },
  de: {
    home: '/de',
    about: '/de/ueber-mich',
    seo: '/de/dienstleistungen/seo',
    translation: '/de/dienstleistungen/uebersetzung',
    ugc: '/de/dienstleistungen/ugc',
    blog: '/de/blog',
    contact: '/de/contact',
  },
  it: {
    home: '/it',
    about: '/it/chi-sono',
    seo: '/it/servizi/seo',
    translation: '/it/servizi/traduzione',
    ugc: '/it/servizi/ugc',
    blog: '/it/blog',
    contact: '/it/contact',
  },
  ca: {
    home: '/ca',
    about: '/ca/sobre-mi',
    seo: '/ca/serveis/seo',
    translation: '/ca/serveis/traduccio',
    ugc: '/ca/serveis/ugc',
    blog: '/ca/blog',
    contact: '/ca/contact',
  },
};

test('localized route map covers the approved public pages in all six locales', () => {
  for (const [locale, routes] of Object.entries(expectedRoutes)) {
    for (const [routeKey, expectedPath] of Object.entries(routes)) {
      assert.equal(getLocalizedRoute(routeKey, locale), expectedPath, `${routeKey} route for ${locale}`);
      assert.equal(getLocalizedPath(expectedPath, locale), expectedPath, `${expectedPath} should remain canonical`);
    }
  }
});

test('legacy contact and UGC path helpers resolve to their new localized routes', () => {
  assert.equal(getLocalizedPath('/contact', 'es'), '/contacto');
  assert.equal(getLocalizedPath('/ugc', 'es'), '/servicios/ugc');
  assert.equal(getLocalizedPath('/ugc', 'fr'), '/fr/services/ugc');
});

test('localized page paths resolve back to their shared route keys', () => {
  assert.equal(resolvePublicRouteKey('/sobre-mi'), 'about');
  assert.equal(resolvePublicRouteKey('/de/dienstleistungen/uebersetzung'), 'translation');
  assert.equal(resolvePublicRouteKey('/it/servizi/seo'), 'seo');
  assert.equal(resolvePublicRouteKey('/ca/blog/mi-primer-post'), 'blog');
  assert.equal(resolvePublicRouteKey('/translation-seo'), null);
});

test('localized blog article paths preserve their slug when switching locales', () => {
  assert.equal(getLocalizedPath('/blog/mi-primer-post', 'en'), '/en/blog/mi-primer-post');
  assert.equal(getLocalizedPath('/fr/blog/article-fr', 'es'), '/blog/article-fr');
  assert.equal(stripLocaleFromPath('/fr/services/traduction/'), '/services/traduction');
});
