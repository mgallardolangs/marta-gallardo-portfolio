import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { isPublishedLocale, localizedRoutes, publishedLocales, unpublishedLocaleFallback } from '../src/lib/localizedRoutes.js';
import { blogPostPaths, legacyRedirects } from '../src/lib/legacyRedirects.js';

const netlifyToml = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
const redirects = [...netlifyToml.matchAll(/\[\[redirects\]\]\s*from = "([^"]+)"\s*to = "([^"]+)"\s*status = (\d+)/g)]
  .map(([, from, to, status]) => ({ from, to, status: Number(status) }));

const publishedOrFallback = (locale) => (isPublishedLocale(locale) ? locale : unpublishedLocaleFallback[locale]);

const expectedLegacyRedirects = {
  '/ugc': localizedRoutes.ugc.es,
  '/translation-seo': localizedRoutes.seo.es,
  '/contact': localizedRoutes.contact.es,
  ...Object.fromEntries(['en', 'fr', 'de', 'it', 'ca'].flatMap((locale) => [
    [`/${locale}/ugc`, localizedRoutes.ugc[publishedOrFallback(locale)]],
    [`/${locale}/translation-seo`, localizedRoutes.seo[publishedOrFallback(locale)]],
  ])),
};

test('legacy UGC, translation-seo and contact URLs redirect permanently to their current routes', () => {
  for (const [from, to] of Object.entries(expectedLegacyRedirects)) {
    const rule = redirects.find((redirect) => redirect.from === from);
    assert.ok(rule, `${from} should have a redirect`);
    assert.equal(rule.to, to, `${from} should point to ${to}`);
    assert.equal(rule.status, 301, `${from} should be a 301`);
  }
});

test('legacy redirects never chain into another redirect', () => {
  const sources = new Set(redirects.map((redirect) => redirect.from));
  for (const { from, to } of redirects) {
    assert.notEqual(from, to, `${from} should not redirect to itself`);
    assert.ok(!sources.has(to), `${from} -> ${to} should not chain into another redirect`);
  }
});

test('netlify.toml and the shared legacy map (used by the trailing-slash edge function) stay in sync', () => {
  const tomlLegacy = Object.fromEntries(
    redirects.filter((redirect) => redirect.from.startsWith('/')).map(({ from, to }) => [from, to]),
  );
  assert.deepEqual(tomlLegacy, { ...legacyRedirects });
  for (const to of Object.values(legacyRedirects)) {
    assert.ok(!(to in legacyRedirects), `${to} should be a final URL, not another legacy one`);
  }
});

test('only Spanish, English and French are published; German and Italian fall back to English, Catalan to Spanish', () => {
  assert.deepEqual(publishedLocales, ['es', 'en', 'fr']);
  assert.deepEqual(unpublishedLocaleFallback, { de: 'en', it: 'en', ca: 'es' });
});

test('every page of an unpublished locale redirects in one hop to the same page in its fallback locale', () => {
  for (const [locale, fallback] of Object.entries(unpublishedLocaleFallback)) {
    for (const [routeKey, routes] of Object.entries(localizedRoutes)) {
      const rule = redirects.find((redirect) => redirect.from === routes[locale]);
      assert.ok(rule, `${routes[locale]} (${routeKey}) should redirect`);
      assert.equal(rule.to, routes[fallback], `${routes[locale]} should go to ${routes[fallback]}`);
      assert.equal(rule.status, 301);
    }
    for (const paths of Object.values(blogPostPaths)) {
      if (!paths[locale]) continue; // post written after de/it/ca stopped being published
      const rule = redirects.find((redirect) => redirect.from === paths[locale]);
      assert.ok(rule, `${paths[locale]} should redirect`);
      assert.equal(rule.to, paths[fallback]);
    }
  }
});

test('no redirect lands on an unpublished locale or on another redirect', () => {
  const unpublishedPrefix = new RegExp(`^/(${Object.keys(unpublishedLocaleFallback).join('|')})(/|$)`);
  for (const { from, to } of redirects) {
    assert.doesNotMatch(to, unpublishedPrefix, `${from} -> ${to} should land on a published page`);
  }
});

test('the blog post path table matches the posts in src/content/blog', async () => {
  const folders = (await readdir(new URL('../src/content/blog/', import.meta.url))).filter((name) => !name.startsWith('.'));
  assert.deepEqual(Object.keys(blogPostPaths).sort(), folders.sort(), 'add every new post to blogPostPaths');
  for (const folder of folders) {
    for (const [lang, postPath] of Object.entries(blogPostPaths[folder])) {
      const md = await readFile(new URL(`../src/content/blog/${folder}/${lang}.md`, import.meta.url), 'utf8');
      const slug = md.match(/^slug: "([^"]+)"/m)[1];
      assert.equal(postPath, lang === 'es' ? `/blog/${slug}` : `/${lang}/blog/${slug}`);
    }
  }
});
