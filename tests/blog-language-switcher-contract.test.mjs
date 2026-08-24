import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const visibleLangs = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const spanishOnlySlug = 'mi-primer-post';

async function importModule(relativePath) {
  try {
    return await import(pathToFileURL(path.join(rootDir, relativePath)).href);
  } catch (error) {
    assert.fail(`${relativePath} should export the approved header language helper: ${error.message}`);
  }
}

function distBlogPostPath(locale, slug) {
  return locale === 'es'
    ? path.join(rootDir, 'dist', 'blog', slug, 'index.html')
    : path.join(rootDir, 'dist', locale, 'blog', slug, 'index.html');
}

function countMatches(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

test('header language helper filters mapped article locales and preserves normal page fallbacks', async () => {
  const { resolveHeaderLanguageLinks } = await importModule('src/lib/headerLanguageLinks.ts');

  assert.equal(typeof resolveHeaderLanguageLinks, 'function', 'src/lib/headerLanguageLinks.ts should export resolveHeaderLanguageLinks');

  const getLocalizedPath = (targetPath, lang) => (lang === 'es' ? targetPath : `/${lang}${targetPath}`);

  assert.deepEqual(
    resolveHeaderLanguageLinks({
      lang: 'es',
      path: '/blog/mi-primer-post',
      visibleLangs,
      getLocalizedPath,
      alternateLinks: {
        es: 'blog/mi-primer-post',
        en: '/en/blog/my-first-post',
        fr: '   ',
        de: '',
      },
    }),
    [
      { lang: 'es', href: '/blog/mi-primer-post' },
      { lang: 'en', href: '/en/blog/my-first-post' },
    ],
    'article headers should only expose locales with explicit sibling article paths and should normalize a missing leading slash',
  );

  assert.deepEqual(
    resolveHeaderLanguageLinks({
      lang: 'es',
      path: '/blog/mi-primer-post',
      visibleLangs,
      getLocalizedPath,
      alternateLinks: {
        en: '/en/blog/my-first-post',
      },
    }),
    [{ lang: 'en', href: '/en/blog/my-first-post' }],
    'current locale should disappear when the article alternate map does not include it',
  );

  assert.deepEqual(
    resolveHeaderLanguageLinks({
      lang: 'fr',
      path: '/contact',
      visibleLangs,
      getLocalizedPath,
    }),
    [
      { lang: 'es', href: '/contact' },
      { lang: 'en', href: '/en/contact' },
      { lang: 'fr', href: '/fr/contact' },
      { lang: 'de', href: '/de/contact' },
      { lang: 'it', href: '/it/contact' },
      { lang: 'ca', href: '/ca/contact' },
    ],
    'ordinary pages should keep the existing all-visible locale path generation when no alternate map is supplied',
  );
});

test('built Spanish-only blog article header only links to the mapped article locale', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built blog article language switcher links.');
    return;
  }

  const html = await readFile(distBlogPostPath('es', spanishOnlySlug), 'utf8');

  assert.equal(countMatches(html, /class="language-menu__link\b/g), 1, 'desktop article language menu should only render one locale entry');
  assert.equal(countMatches(html, /class="language-chip\b/g), 1, 'mobile article language chips should only render one locale entry');
  assert.match(html, /href="\/blog\/mi-primer-post"[^>]*>ES</, 'Spanish-only article header should keep the ES locale link');

  for (const locale of ['en', 'fr', 'de', 'it', 'ca']) {
    assert.doesNotMatch(
      html,
      new RegExp(`href="/${locale}/blog/${spanishOnlySlug}"`),
      `${locale} article route should not appear anywhere in the Spanish-only article header`,
    );
  }
});

test('built ordinary page header still exposes every configured visible locale', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built ordinary page language switcher links.');
    return;
  }

  const html = await readFile(path.join(rootDir, 'dist', 'contact', 'index.html'), 'utf8');

  assert.equal(countMatches(html, /class="language-menu__link\b/g), visibleLangs.length, 'desktop ordinary page language menu should still show every visible locale');
  assert.equal(countMatches(html, /class="language-chip\b/g), visibleLangs.length, 'mobile ordinary page language chips should still show every visible locale');

  for (const expectedHref of ['/contact', '/en/contact', '/fr/contact', '/de/contact', '/it/contact', '/ca/contact']) {
    assert.match(html, new RegExp(`href="${expectedHref}"`), `${expectedHref} should remain available for ordinary pages`);
  }
});
