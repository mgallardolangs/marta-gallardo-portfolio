import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_RELATED_ARTICLES, getRelatedArticles, relatedArticlesByRoute } from '../src/lib/relatedArticles.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFile(path.join(rootDir, relativePath), 'utf8');

test('every related article key is a post folder in src/content/blog', async () => {
  const folders = await readdir(path.join(rootDir, 'src/content/blog'));
  for (const [routeKey, keys] of Object.entries(relatedArticlesByRoute)) {
    assert.ok(keys.length > 0 && keys.length <= MAX_RELATED_ARTICLES, `${routeKey} lists one or two posts`);
    for (const key of keys) {
      assert.ok(folders.includes(key), `${routeKey} points at ${key}, which should be a post folder`);
    }
  }
});

test('getRelatedArticles keeps the configured order, the page language and the limit', () => {
  const post = (translationKey, lang) => ({ data: { translationKey, lang, slug: `${translationKey}-${lang}` } });
  const [first, second] = relatedArticlesByRoute.translation;
  const posts = [
    post(second, 'es'),
    post(first, 'es'),
    post(first, 'en'),
  ];

  assert.deepEqual(
    getRelatedArticles(posts, 'translation', 'es').map((p) => p.data.slug),
    [`${first}-es`, `${second}-es`],
    'posts come in the configured order, not in collection order',
  );
  assert.deepEqual(
    getRelatedArticles(posts, 'translation', 'en').map((p) => p.data.slug),
    [`${first}-en`],
    'a post without a translation in the page language is skipped',
  );
  assert.deepEqual(getRelatedArticles(posts, 'ugc', 'es'), [], 'pages without related posts render nothing');
});

test('the SEO, translation and about pages render the related articles block and every locale has its heading', async () => {
  for (const [view, routeKey] of [
    ['src/views/SeoServicePage.astro', 'seo'],
    ['src/views/TranslationServicePage.astro', 'translation'],
    ['src/views/AboutPage.astro', 'about'],
  ]) {
    assert.match(await read(view), new RegExp(`<RelatedArticles lang=\\{lang\\} routeKey="${routeKey}" />`));
  }
  for (const lang of ['es', 'en', 'fr', 'de', 'it', 'ca']) {
    const dictionary = JSON.parse(await read(`src/i18n/${lang}.json`));
    assert.ok(dictionary.blog.relatedTitle?.trim(), `${lang} should name the related articles block`);
  }
});

test('CHECK_DIST: built service and about pages link to their related posts in each published language', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built related article links.');
    return;
  }

  for (const [page, postHref] of [
    ['dist/servicios/seo.html', '/blog/seo-internacional-mas-alla-de-traducir-tu-web'],
    ['dist/en/services/seo.html', '/en/blog/international-seo-beyond-translating-your-website'],
    ['dist/fr/services/traduction.html', '/fr/blog/de-traductrice-a-specialiste-seo'],
    ['dist/sobre-mi.html', '/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones'],
  ]) {
    const html = await read(page);
    assert.match(html, /data-related-articles=/, `${page} should render the block`);
    assert.ok(html.includes(`href="${postHref}"`), `${page} should link to ${postHref}`);
  }
});
