import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const seoLangs = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const publicPickerLangs = ['es', 'en', 'fr'];
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

function getAnchorsByClass(html, className) {
  const pattern = new RegExp(
    `<a[^>]*(?:href="([^"]+)"[^>]*class="${className}[^"]*"|class="${className}[^"]*"[^>]*href="([^"]+)")[^>]*>`,
    'g',
  );
  return [...html.matchAll(pattern)].map((match) => match[1] ?? match[2]);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
}

test('site data defaults the public picker to ES EN FR while SEO keeps all six locales', async () => {
  const [site, headerSource, seoHeadSource, i18nSource] = await Promise.all([
    readJson('src/data/site.json'),
    readFile(path.join(rootDir, 'src/components/Header.astro'), 'utf8'),
    readFile(path.join(rootDir, 'src/components/SeoHead.astro'), 'utf8'),
    readFile(path.join(rootDir, 'src/i18n/index.ts'), 'utf8'),
  ]);

  assert.deepEqual(site.publicLanguagePicker, publicPickerLangs);
  assert.doesNotMatch(headerSource, /import\s+\{[^}]*\bvisibleLangs\b[^}]*\}\s+from\s+['"]\.\.\/i18n['"]/, 'Header should not import the public picker directly from src/i18n visibleLangs');
  assert.match(headerSource, /\bgetPublicLanguagePicker\b/, 'Header should derive public picker locales from site data');
  assert.match(headerSource, /visibleLangs:\s*publicLanguagePicker/, 'Header should pass the site-managed public picker into the shared resolver');
  assert.match(seoHeadSource, /\bvisibleLangs\b/, 'SeoHead should keep all six locales for hreflang generation');
  assert.match(i18nSource, /export const visibleLangs: Lang\[] = \['es', 'en', 'fr', 'de', 'it', 'ca'\];/);
});

test('header language helper filters mapped article locales and preserves normal page fallbacks', async () => {
  const { resolveHeaderLanguageLinks } = await importModule('src/lib/headerLanguageLinks.ts');

  assert.equal(typeof resolveHeaderLanguageLinks, 'function', 'src/lib/headerLanguageLinks.ts should export resolveHeaderLanguageLinks');

  const getLocalizedPath = (targetPath, lang) => (lang === 'es' ? targetPath : `/${lang}${targetPath}`);

  assert.deepEqual(
    resolveHeaderLanguageLinks({
      lang: 'es',
      path: '/blog/mi-primer-post',
      visibleLangs: publicPickerLangs,
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
      visibleLangs: publicPickerLangs,
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
      visibleLangs: publicPickerLangs,
      getLocalizedPath,
    }),
    [
      { lang: 'es', href: '/contact' },
      { lang: 'en', href: '/en/contact' },
      { lang: 'fr', href: '/fr/contact' },
    ],
    'ordinary pages should use the site-managed public picker when no alternate map is supplied',
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

test('built home header exposes only the public picker while DE IT CA routes and hreflang stay built', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built home language switcher links.');
    return;
  }

  const html = await readFile(path.join(rootDir, 'dist', 'index.html'), 'utf8');
  const desktopPickerHrefs = getAnchorsByClass(html, 'language-menu__link');
  const mobilePickerHrefs = getAnchorsByClass(html, 'language-chip');

  assert.equal(countMatches(html, /class="language-menu__link\b/g), publicPickerLangs.length, 'desktop home language menu should only show the public picker locales');
  assert.equal(countMatches(html, /class="language-chip\b/g), publicPickerLangs.length, 'mobile home language chips should only show the public picker locales');
  assert.deepEqual(desktopPickerHrefs, ['/', '/en/', '/fr/']);
  assert.deepEqual(mobilePickerHrefs, ['/', '/en/', '/fr/']);

  for (const hiddenLocale of ['de', 'it', 'ca']) {
    assert.ok(!desktopPickerHrefs.includes(`/${hiddenLocale}/`), `${hiddenLocale} should stay hidden from the desktop public picker until re-enabled`);
    assert.ok(!mobilePickerHrefs.includes(`/${hiddenLocale}/`), `${hiddenLocale} should stay hidden from the mobile public picker until re-enabled`);
    assert.match(
      html,
      new RegExp(`<link rel="alternate" hreflang="${hiddenLocale}" href="https://marttelier\\.netlify\\.app/${hiddenLocale}/"`),
      `${hiddenLocale} hreflang should remain available for SEO`,
    );
    await access(path.join(rootDir, 'dist', hiddenLocale, 'index.html'));
  }

  assert.equal(
    countMatches(html, /<link rel="alternate" hreflang="(?:es|en|fr|de|it|ca|x-default)"/g),
    seoLangs.length + 1,
    'home SEO alternates should still include all six locales plus x-default',
  );
});
