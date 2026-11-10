import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localizedRoutes } from '../src/lib/localizedRoutes.js';

const netlifyToml = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
const redirects = [...netlifyToml.matchAll(/\[\[redirects\]\]\s*from = "([^"]+)"\s*to = "([^"]+)"\s*status = (\d+)/g)]
  .map(([, from, to, status]) => ({ from, to, status: Number(status) }));

const expectedLegacyRedirects = {
  '/ugc': localizedRoutes.ugc.es,
  '/translation-seo': localizedRoutes.seo.es,
  '/contact': localizedRoutes.contact.es,
  ...Object.fromEntries(['en', 'fr', 'de', 'it', 'ca'].flatMap((locale) => [
    [`/${locale}/ugc`, localizedRoutes.ugc[locale]],
    [`/${locale}/translation-seo`, localizedRoutes.seo[locale]],
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
