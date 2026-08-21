import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const nonSpanishLocales = ['en', 'fr', 'de', 'it', 'ca'];
const articlePagesByLocale = {
  es: 'src/pages/blog/[slug].astro',
  en: 'src/pages/en/blog/[slug].astro',
  fr: 'src/pages/fr/blog/[slug].astro',
  de: 'src/pages/de/blog/[slug].astro',
  it: 'src/pages/it/blog/[slug].astro',
  ca: 'src/pages/ca/blog/[slug].astro',
};
const spanishOnlySlug = 'mi-primer-post';

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

function distBlogPostPath(locale, slug) {
  return locale === 'es'
    ? path.join(rootDir, 'dist', 'blog', slug, 'index.html')
    : path.join(rootDir, 'dist', locale, 'blog', slug, 'index.html');
}

test('blog locale helper filters posts by exact locale only, including ES', async () => {
  const { getBlogStaticPathsForLocale, scopeBlogPostsToLocale } = await import('../src/lib/blog.ts');
  const posts = [
    { id: 'solo-es', data: { lang: 'es' } },
    { id: 'hello-en', data: { lang: 'en' } },
    { id: 'bonjour-fr', data: { lang: 'fr' } },
  ];

  assert.deepEqual(scopeBlogPostsToLocale(posts, 'es').map((post) => post.id), ['solo-es']);
  assert.deepEqual(scopeBlogPostsToLocale(posts, 'en').map((post) => post.id), ['hello-en']);
  assert.deepEqual(scopeBlogPostsToLocale(posts, 'de').map((post) => post.id), []);
  assert.deepEqual(
    getBlogStaticPathsForLocale(posts, 'es').map(({ params }) => params.slug),
    ['solo-es'],
  );
  assert.deepEqual(
    getBlogStaticPathsForLocale(posts, 'fr').map(({ params }) => params.slug),
    ['bonjour-fr'],
  );
});

test('blog index and localized slug pages stay wired to exact locale scoping', async () => {
  const [indexSource, ...articleSources] = await Promise.all([
    readSource('src/views/BlogIndexPage.astro'),
    ...Object.values(articlePagesByLocale).map((relativePath) => readSource(relativePath)),
  ]);

  assert.match(
    indexSource,
    /import\s+\{\s*scopeBlogPostsToLocale\s*\}\s+from\s+['"]..\/lib\/blog['"]/,
    'BlogIndexPage should use the shared locale-scoping helper',
  );
  assert.doesNotMatch(
    indexSource,
    /lang === 'es'/,
    'BlogIndexPage should not treat ES as a wildcard locale',
  );

  for (const [locale, relativePath] of Object.entries(articlePagesByLocale)) {
    const source = articleSources[Object.keys(articlePagesByLocale).indexOf(locale)];
    assert.match(
      source,
      /import\s+\{\s*getBlogStaticPathsForLocale\s*\}\s+from\s+['"].+\/lib\/blog['"]/,
      `${relativePath} should use the shared locale static-path helper`,
    );
    assert.match(
      source,
      new RegExp(`getBlogStaticPathsForLocale\\(posts,\\s*'${locale}'\\)`),
      `${relativePath} should scope getStaticPaths to ${locale} only`,
    );
  }
});

test('build only emits the Spanish root route for the Spanish-only blog post', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built blog paths.');
    return;
  }

  await access(distBlogPostPath('es', spanishOnlySlug));

  for (const locale of nonSpanishLocales) {
    await assert.rejects(
      access(distBlogPostPath(locale, spanishOnlySlug)),
      { code: 'ENOENT' },
      `${locale} build should not emit ${spanishOnlySlug}`,
    );
  }
});
