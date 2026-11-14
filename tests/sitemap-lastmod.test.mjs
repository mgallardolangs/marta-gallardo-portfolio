import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getBlogLastmodMap } from '../src/lib/sitemapLastmod.mjs';
import { translatorPostSlugs } from './fixtures/blog-slugs.mjs';

const site = 'https://marttelier.com';

test('every blog post URL (at its translated slug) and every blog index gets a lastmod date', () => {
  const map = getBlogLastmodMap(site);
  for (const [lang, slug] of Object.entries(translatorPostSlugs)) {
    const prefix = lang === 'es' ? '' : `/${lang}`;
    const date = map.get(`${site}${prefix}/blog/${slug}`);
    assert.ok(date instanceof Date && !Number.isNaN(date.valueOf()), `${lang} post should have a lastmod`);
    const index = map.get(`${site}${prefix}/blog`);
    assert.ok(index >= date, `${lang} blog index lastmod should be at least the newest post's`);
  }
  for (const url of map.keys()) assert.ok(!url.includes('/admin'), `${url} should not be in the lastmod map`);
});

test('built sitemap writes lastmod for blog URLs', async (t) => {
  if (process.env.CHECK_DIST !== '1') return t.skip('Set CHECK_DIST=1 after npm run build.');
  const xml = await readFile(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8');
  assert.match(xml, new RegExp(`<loc>${site}/en/blog/${translatorPostSlugs.en}</loc><lastmod>\\d{4}-\\d{2}-\\d{2}T`));
});
