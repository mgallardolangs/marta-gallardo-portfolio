import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPageSeo, resolveSeoText, seoPageKeys } from '../src/lib/siteData.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const productionSite = 'https://marttelier.com';

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

test('Astro SEO settings use the canonical production origin and keep admin routes out of the sitemap', async () => {
  const astroConfigSource = await readSource('astro.config.mjs');

  assert.match(
    astroConfigSource,
    /site:\s*'https:\/\/marttelier\.com'/,
    'Astro should publish canonical URLs from the production marttelier.com origin',
  );
  assert.match(
    astroConfigSource,
    /sitemap\(\{\s*filter:\s*\(page\)\s*=>\s*!page\.includes\('\/admin'\),\s*\}\)/s,
    'The sitemap integration should exclude every /admin route from crawlable XML output',
  );
});

test('robots.txt allows public crawling, blocks /admin, and advertises the production sitemap index', async () => {
  const robots = await readSource('public/robots.txt');

  assert.equal(
    robots,
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${productionSite}/sitemap-index.xml\n`,
  );
});

test('SEO resolver prefers requested locale text, then Spanish, then explicit fallback', () => {
  assert.equal(
    resolveSeoText(
      { en: '  English title  ', es: '  Título español  ' },
      'en',
      '  Fallback title  ',
    ),
    'English title',
  );
  assert.equal(
    resolveSeoText(
      { en: '   ', es: '  Título español  ' },
      'fr',
      '  Fallback title  ',
    ),
    'Título español',
  );
  assert.equal(resolveSeoText(undefined, 'fr', '  Fallback title  '), 'Fallback title');
});

test('SEO helpers normalize whitespace and always return strings for page metadata', () => {
  assert.equal(
    resolveSeoText(
      { en: '\n  Multilingual\tSEO \n title  ', es: '  Título español  ' },
      'en',
      '  Fallback title  ',
    ),
    'Multilingual SEO title',
  );
  assert.equal(resolveSeoText({ en: ' \n ', es: '\t ' }, 'en', '  Contact  \n fallback '), 'Contact fallback');

  const resolved = getPageSeo(
    {
      seo: {
        home: {
          title: { fr: '  Page   title  ' },
          description: { it: '   ' },
        },
      },
    },
    'home',
    'fr',
    {
      title: { fr: '  Home fallback  ' },
      description: { es: '  Descripción \n fallback  ' },
    },
  );

  assert.deepEqual(resolved, {
    title: 'Page title',
    description: 'Descripción fallback',
  });
  assert.equal(typeof resolved.title, 'string');
  assert.equal(typeof resolved.description, 'string');
});

test('SEO page fallback maps prefer requested locale, then Spanish, then empty strings', () => {
  assert.deepEqual(getPageSeo(undefined, 'contact', 'en', {
    title: { en: '  English fallback title  ', es: '  Título español  ' },
    description: { es: '  Descripción fallback  ' },
  }), {
    title: 'English fallback title',
    description: 'Descripción fallback',
  });

  assert.deepEqual(getPageSeo(undefined, 'contact', 'fr', {
    title: { en: '  English only title  ' },
    description: { en: '  English only description  ' },
  }), {
    title: '',
    description: '',
  });
});

test('SEO site data exposes only the four editable page groups and keeps the runtime contract optional', async () => {
  const site = await readJson('src/data/site.json');
  const source = await readSource('src/lib/siteData.ts');

  assert.deepEqual(seoPageKeys, ['home', 'translationSeo', 'ugc', 'contact']);
  assert.deepEqual(Object.keys(site.seo).sort(), [...seoPageKeys].sort());

  for (const page of seoPageKeys) {
    assert.equal(typeof site.seo[page].title.es, 'string', `${page} should seed a Spanish title`);
    assert.notEqual(site.seo[page].title.es.trim(), '', `${page} Spanish title should stay nonblank`);
    assert.equal(typeof site.seo[page].description.es, 'string', `${page} should seed a Spanish description`);
    assert.notEqual(site.seo[page].description.es.trim(), '', `${page} Spanish description should stay nonblank`);
  }

  assert.match(source, /seo\?: Partial<Record<SeoPageKey, SeoPageValue>>;/);
  assert.match(source, /export type ResolvedSeoPageValue = \{\s*title: string;\s*description: string;\s*\};/s);
});
