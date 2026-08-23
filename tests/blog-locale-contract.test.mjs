import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];
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

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

async function importModule(relativePath) {
  try {
    return await import(pathToFileURL(path.join(rootDir, relativePath)).href);
  } catch (error) {
    assert.fail(`${relativePath} should export the approved editorial blog helpers: ${error.message}`);
  }
}

function distBlogPostPath(locale, slug) {
  return locale === 'es'
    ? path.join(rootDir, 'dist', 'blog', slug, 'index.html')
    : path.join(rootDir, 'dist', locale, 'blog', slug, 'index.html');
}

function normalizeLatestArchive(result) {
  if (Array.isArray(result)) {
    return {
      latest: result[0] ?? null,
      archive: Array.isArray(result[1]) ? result[1] : [],
    };
  }

  if (result && typeof result === 'object') {
    return {
      latest: result.latest ?? result.featured ?? result.current ?? null,
      archive: Array.isArray(result.archive) ? result.archive : Array.isArray(result.remaining) ? result.remaining : [],
    };
  }

  return { latest: null, archive: [] };
}

function getAdjacentPostId(result) {
  if (!result) return null;
  if (typeof result === 'string') return result;
  if (typeof result === 'object' && 'id' in result && typeof result.id === 'string') return result.id;
  if (typeof result === 'object' && result.nextPost && typeof result.nextPost.id === 'string') return result.nextPost.id;
  if (typeof result === 'object' && result.post && typeof result.post.id === 'string') return result.post.id;
  return null;
}

test('all six locale files expose the editorial blog eyebrow, archive, and article chrome keys', async () => {
  const dictionaries = await Promise.all(
    locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)]),
  );

  const requiredBlogKeys = [
    'title',
    'eyebrow',
    'subtitle',
    'latestStory',
    'archive',
    'comingSoonTitle',
    'comingSoonMeta',
    'contentIndex',
    'readTime',
    'nextStory',
    'end',
    'readMore',
    'backToList',
  ];

  for (const [locale, dictionary] of dictionaries) {
    assert.ok(dictionary.blog && typeof dictionary.blog === 'object', `${locale} should define blog copy`);

    for (const key of requiredBlogKeys) {
      assert.equal(typeof dictionary.blog[key], 'string', `${locale} blog.${key} should be a string`);
      assert.notEqual(dictionary.blog[key].trim(), '', `${locale} blog.${key} should not be empty`);
    }
  }
});

test('blog locale helper filters posts by exact locale only, including ES', async () => {
  const {
    getBlogAlternateLinksForPost,
    getBlogStaticPathsForLocale,
    scopeBlogPostsToLocale,
  } = await importModule('src/lib/blog.ts');
  const posts = [
    { id: 'solo-es', data: { lang: 'es' } },
    { id: 'hello-en', data: { lang: 'en' } },
    { id: 'bonjour-fr', data: { lang: 'fr' } },
    { id: 'guia-es', data: { lang: 'es', translationKey: 'guide' } },
    { id: 'guide-en', data: { lang: 'en', translationKey: 'guide' } },
    { id: 'guide-fr', data: { lang: 'fr', translationKey: 'guide' } },
  ];

  assert.deepEqual(scopeBlogPostsToLocale(posts, 'es').map((post) => post.id), ['solo-es', 'guia-es']);
  assert.deepEqual(scopeBlogPostsToLocale(posts, 'en').map((post) => post.id), ['hello-en', 'guide-en']);
  assert.deepEqual(scopeBlogPostsToLocale(posts, 'de').map((post) => post.id), []);
  assert.deepEqual(
    getBlogStaticPathsForLocale(posts, 'es').map(({ params }) => params.slug),
    ['solo-es', 'guia-es'],
  );
  assert.deepEqual(
    getBlogStaticPathsForLocale(posts, 'fr').map(({ params }) => params.slug),
    ['bonjour-fr', 'guide-fr'],
  );
  assert.deepEqual(
    getBlogAlternateLinksForPost(posts, posts[0]),
    { es: '/blog/solo-es' },
    'slug-only posts should only advertise themselves when no sibling locales exist',
  );
  assert.deepEqual(
    getBlogAlternateLinksForPost(posts, posts[3]),
    {
      es: '/blog/guia-es',
      en: '/en/blog/guide-en',
      fr: '/fr/blog/guide-fr',
    },
    'translationKey-linked posts should map alternates to each sibling locale path',
  );
});

test('blog helper module promotes the newest current-locale story once and falls back cleanly when no adjacent post exists', async () => {
  const blogModule = await importModule('src/lib/blog.ts');
  const {
    scopeBlogPostsToLocale,
    getLatestAndArchive,
    getAdjacentLocalePost,
  } = blogModule;

  assert.equal(typeof getLatestAndArchive, 'function', 'src/lib/blog.ts should export getLatestAndArchive(posts)');
  assert.equal(typeof getAdjacentLocalePost, 'function', 'src/lib/blog.ts should export getAdjacentLocalePost(posts, currentPost)');

  const posts = [
    { id: 'es-old', data: { lang: 'es', date: new Date('2025-01-04') } },
    { id: 'en-new', data: { lang: 'en', date: new Date('2025-04-11') } },
    { id: 'es-new', data: { lang: 'es', date: new Date('2025-05-09') } },
    { id: 'es-mid', data: { lang: 'es', date: new Date('2025-03-07') } },
    { id: 'fr-new', data: { lang: 'fr', date: new Date('2025-06-12') } },
  ];

  const esPosts = scopeBlogPostsToLocale(posts, 'es');
  const { latest, archive } = normalizeLatestArchive(getLatestAndArchive(esPosts));

  assert.equal(latest?.id, 'es-new', 'getLatestAndArchive should promote the newest post in the current locale');
  assert.deepEqual(
    archive.map((post) => post.id),
    ['es-mid', 'es-old'],
    'archive should exclude the latest feature and stay newest-first',
  );
  assert.ok(
    archive.every((post) => post.id !== latest?.id),
    'archive should never repeat the featured latest story',
  );
  assert.equal(
    getAdjacentPostId(getAdjacentLocalePost(esPosts, latest)),
    'es-mid',
    'adjacent story lookup should return the next same-locale story when one exists',
  );
  assert.equal(
    getAdjacentPostId(getAdjacentLocalePost(esPosts, archive.at(-1))),
    null,
    'adjacent story lookup should return null so the article layout can fall back to the blog archive',
  );
});

test('blog index and localized slug pages stay wired to exact locale scoping', async () => {
  const [indexSource, ...articleSources] = await Promise.all([
    readSource('src/views/BlogIndexPage.astro'),
    ...Object.values(articlePagesByLocale).map((relativePath) => readSource(relativePath)),
  ]);

  assert.match(
    indexSource,
    /import\s+\{\s*scopeBlogPostsToLocale\s*\}\s+from\s+['"]..\/lib\/blog['"]|import\s+\{\s*scopeBlogPostsToLocale\s*\}\s+from\s+['"]\.\.\/lib\/blog['"]|import\s+\{\s*scopeBlogPostsToLocale\s*\}\s+from\s+['"]\.\.\/lib\/blog\.ts['"]/,
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
      /import\s+\{[\s\S]*getBlogStaticPathsForLocale[\s\S]*\}\s+from\s+['"].+\/lib\/blog['"]|import\s+\{[\s\S]*getBlogStaticPathsForLocale[\s\S]*\}\s+from\s+['"].+\/lib\/blog\.ts['"]/,
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

test('built Spanish-only blog post only advertises built alternates', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built blog SEO alternates.');
    return;
  }

  const html = await readFile(distBlogPostPath('es', spanishOnlySlug), 'utf8');
  const alternateEntries = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
    .map((match) => ({ hreflang: match[1], href: match[2] }));

  assert.deepEqual(
    alternateEntries,
    [
      { hreflang: 'es', href: 'https://marttelier.netlify.app/blog/mi-primer-post' },
      { hreflang: 'x-default', href: 'https://marttelier.netlify.app/blog/mi-primer-post' },
    ],
    'Spanish-only posts should not advertise unbuilt EN/FR/DE/IT/CA article routes',
  );
});
