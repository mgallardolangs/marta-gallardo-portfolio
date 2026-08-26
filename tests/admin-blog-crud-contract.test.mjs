import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SIX_LOCALES = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const VISIBLE_LOCALES = ['es', 'en', 'fr'];
const HIDDEN_LOCALES = ['de', 'it', 'ca'];

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readRequiredSource(relativePath) {
  try {
    return await readSource(relativePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      assert.fail(`${relativePath} should exist for the admin blog CRUD contract`);
    }

    throw error;
  }
}

async function readOptionalSource(relativePath) {
  try {
    return await readSource(relativePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function importModule(relativePath) {
  try {
    return await import(pathToFileURL(path.join(rootDir, relativePath)).href);
  } catch (error) {
    assert.fail(`${relativePath} should export the admin blog CRUD helpers: ${error.message}`);
  }
}

function createAdminStore(
  AdminStore,
  lang = 'es',
  token = 'stale-token',
  images = { publicLanguagePicker: [...VISIBLE_LOCALES] },
) {
  const store = new AdminStore();
  store.init(
    Object.fromEntries(SIX_LOCALES.map((locale) => [locale, {}])),
    images,
    lang,
    token,
  );
  return store;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeRepositoryPayload(body) {
  assert.ok(body, 'repository requests should include a JSON body');
  const payload = JSON.parse(String(body));
  return {
    ...payload,
    markdown: typeof payload.content === 'string'
      ? Buffer.from(payload.content, 'base64').toString('utf8')
      : '',
  };
}

function assertNonEmptyRepositoryMessage(payload, message) {
  assert.equal(typeof payload.message, 'string', message);
  assert.notEqual(payload.message.trim(), '', message);
}

function assertMarkdownFrontmatter(markdown, { slug, translationKey, title, description, date, tags, lang, body, image } = {}) {
  if (slug !== undefined) assert.match(markdown, new RegExp(`^slug:\\s*${escapeRegExp(JSON.stringify(slug))}$`, 'm'));
  if (translationKey !== undefined) assert.match(markdown, new RegExp(`^translationKey:\\s*${escapeRegExp(JSON.stringify(translationKey))}$`, 'm'));
  if (title !== undefined) assert.match(markdown, new RegExp(`^title:\\s*${escapeRegExp(JSON.stringify(title))}$`, 'm'));
  if (description !== undefined) assert.match(markdown, new RegExp(`^description:\\s*${escapeRegExp(JSON.stringify(description))}$`, 'm'));
  if (date !== undefined) assert.match(markdown, new RegExp(`^date:\\s*${escapeRegExp(JSON.stringify(date))}$`, 'm'));
  if (lang !== undefined) assert.match(markdown, new RegExp(`^lang:\\s*${escapeRegExp(JSON.stringify(lang))}$`, 'm'));
  if (tags !== undefined) {
    assert.match(
      markdown,
      new RegExp(`^tags:\\s*\\[[^\\]]*${tags.map((tag) => escapeRegExp(JSON.stringify(tag))).join('[^\\]]*')}[^\\]]*\\]$`, 'm'),
    );
  }
  if (body !== undefined) {
    assert.ok(markdown.trimEnd().endsWith(body.trim()), 'markdown should keep the intended body content intact');
  }
  if (image !== undefined) {
    if (image) {
      assert.match(markdown, new RegExp(`^image:\\s*${escapeRegExp(JSON.stringify(image))}$`, 'm'));
    } else {
      assert.doesNotMatch(markdown, /^image:/m);
    }
  }
}

function getFrontmatterField(markdown, field) {
  const match = markdown.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : undefined;
}

function buildFrontmatterFixture({ slug, translationKey, date, image, title, description, tags, lang, body }) {
  const quoted = (value) => JSON.stringify(value);
  const tagsLine = `[${tags.map((tag) => JSON.stringify(tag)).join(', ')}]`;
  const imageLine = image ? `image: ${quoted(image)}\n` : '';
  return `---\nslug: ${quoted(slug)}\ntranslationKey: ${quoted(translationKey)}\ntitle: ${quoted(title)}\ndescription: ${quoted(description)}\ndate: ${quoted(date)}\n${imageLine}tags: ${tagsLine}\nlang: ${quoted(lang)}\n---\n\n${body.trim()}\n`;
}

function getLocaleMarkdownPaths(slug) {
  return Object.fromEntries(SIX_LOCALES.map((locale) => [locale, `src/content/blog/${slug}/${locale}.md`]));
}

function getHiddenLocales(visibleLocales) {
  return SIX_LOCALES.filter((locale) => !visibleLocales.includes(locale));
}

function getSharedImagePaths(slug, extension = 'webp') {
  return {
    repositoryPath: `public/images/blog/${slug}.${extension}`,
    publicPath: `/images/blog/${slug}.${extension}`,
  };
}

function makeLocaleTranslation(locale, overrides = {}) {
  const fixtures = {
    es: { title: 'Título ES', description: 'Descripción ES', tags: ['seo'], body: '# Cuerpo ES' },
    en: { title: 'Title EN', description: 'Description EN', tags: ['seo'], body: '# Body EN' },
    fr: { title: 'Titre FR', description: 'Description FR', tags: ['seo'], body: '# Corps FR' },
    de: { title: 'Titel DE', description: 'Beschreibung DE', tags: ['seo'], body: '# Inhalt DE' },
    it: { title: 'Titolo IT', description: 'Descrizione IT', tags: ['seo'], body: '# Corpo IT' },
    ca: { title: 'Títol CA', description: 'Descripció CA', tags: ['seo'], body: '# Cos CA' },
  };

  return { ...fixtures[locale], ...overrides };
}

function makeTranslationsFixture(overrides = {}) {
  return {
    es: makeLocaleTranslation('es', overrides.es),
    en: makeLocaleTranslation('en', overrides.en),
    fr: makeLocaleTranslation('fr', overrides.fr),
  };
}

function makeAllLocaleTranslationsFixture(overrides = {}) {
  return Object.fromEntries(
    SIX_LOCALES.map((locale) => [locale, makeLocaleTranslation(locale, overrides[locale])]),
  );
}

function makeFakePost({ id, slug, translationKey, lang, date, image, title, description, tags = [], body = '' }) {
  return {
    id,
    body,
    data: {
      slug,
      translationKey,
      lang,
      date: new Date(date),
      image,
      title: title ?? `${slug} (${lang})`,
      description: description ?? `${slug} description (${lang})`,
      tags,
    },
  };
}

function getCallSummary(call) {
  return `${call.method} ${call.url}`;
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function extractWindowAround(source, needle, radius = 2200) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `source should include ${needle}`);
  return source.slice(Math.max(0, index - radius), Math.min(source.length, index + radius));
}

async function assertRejectsWithMessage(promise, patterns, failureMessage) {
  try {
    await promise;
    assert.fail(failureMessage ?? 'expected the promise to reject');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    for (const pattern of Array.isArray(patterns) ? patterns : [patterns]) {
      assert.match(message, pattern, `${failureMessage ?? 'rejection message mismatch'} (got: "${message}")`);
    }
  }
}

function normalizeDeleteResult(result) {
  const base = (() => {
    if (Array.isArray(result)) {
      return { status: String(result[0] ?? ''), message: String(result[1] ?? '') };
    }
    if (result && typeof result === 'object') {
      return {
        status: String(result.status ?? result.result ?? result.outcome ?? ''),
        message: String(result.message ?? result.notice ?? result.detail ?? ''),
      };
    }
    if (typeof result === 'string') {
      return { status: result, message: result };
    }
    return { status: '', message: '' };
  })();

  const remainingSource = (result && typeof result === 'object')
    ? (result.remainingPaths ?? result.pendingPaths ?? result.remaining ?? result.failedPaths ?? [])
    : [];

  return { ...base, remainingPaths: Array.isArray(remainingSource) ? remainingSource.map(String) : [] };
}

function normalizeAdminGroup(group) {
  const translationKey = group?.translationKey ?? group?.key ?? '';
  const slug = group?.slug ?? '';
  const localesSource = group?.locales ?? group?.byLocale ?? group?.translations ?? group?.posts ?? {};
  const locales = {};

  if (Array.isArray(localesSource)) {
    localesSource.forEach((entry) => {
      const lang = entry?.data?.lang ?? entry?.lang;
      if (lang) locales[lang] = entry;
    });
  } else if (localesSource && typeof localesSource === 'object') {
    Object.entries(localesSource).forEach(([lang, entry]) => {
      locales[lang] = entry;
    });
  }

  return { translationKey, slug, locales };
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const data = {};
  for (const line of match[1].split('\n')) {
    const fieldMatch = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!fieldMatch) continue;
    const [, key, rawValue] = fieldMatch;
    if (rawValue.startsWith('[') || rawValue.startsWith('"')) {
      try {
        data[key] = JSON.parse(rawValue);
        continue;
      } catch {
        // fall through to raw string handling below
      }
    }
    data[key] = rawValue;
  }
  return data;
}

async function listBlogMarkdownFiles() {
  const blogDir = path.join(rootDir, 'src/content/blog');
  const relativePaths = await readdir(blogDir, { recursive: true });
  return relativePaths
    .filter((relativePath) => relativePath.endsWith('.md') || relativePath.endsWith('.mdx'))
    .map((relativePath) => ({
      relativePath: path.posix.join('src/content/blog', relativePath.split(path.sep).join('/')),
      absolutePath: path.join(blogDir, relativePath),
    }));
}

// ---------------------------------------------------------------------------
// CONTENT MODEL
// ---------------------------------------------------------------------------

test('the blog content schema requires a shared slug and translationKey on every entry', async () => {
  const contentConfigSource = await readRequiredSource('src/content.config.ts');

  assert.match(
    contentConfigSource,
    /slug:\s*z\.string\(\)(?!\s*\.optional\(\))/,
    'the blog schema should require a non-optional slug field shared across locale files',
  );
  assert.match(
    contentConfigSource,
    /translationKey:\s*z\.string\(\)(?!\s*\.optional\(\))/,
    'the blog schema should require a non-optional translationKey field linking locale siblings',
  );
  assert.doesNotMatch(
    contentConfigSource,
    /translationKey:\s*z\.string\(\)\.optional\(\)/,
    'translationKey should no longer be optional now that six-file admin grouping depends on it',
  );
});

test('every logical blog post is represented by six locale Markdown files sharing slug/translationKey/date/image at unique repository paths', async () => {
  const files = await listBlogMarkdownFiles();
  assert.ok(files.length > 0, 'src/content/blog should contain locale Markdown files for the multilingual model');

  const uniquePaths = new Set(files.map((file) => file.relativePath));
  assert.equal(uniquePaths.size, files.length, 'every locale Markdown file should live at a unique repository path');

  const groups = new Map();
  for (const file of files) {
    const markdown = await readFile(file.absolutePath, 'utf8');
    const frontmatter = parseFrontmatter(markdown);
    assert.ok(frontmatter.translationKey, `${file.relativePath} should declare a translationKey linking its locale siblings`);
    assert.ok(frontmatter.slug, `${file.relativePath} should declare the shared slug`);
    assert.ok(frontmatter.lang, `${file.relativePath} should declare its own localized lang`);

    const group = groups.get(frontmatter.translationKey) ?? [];
    group.push({ ...frontmatter, path: file.relativePath });
    groups.set(frontmatter.translationKey, group);
  }

  assert.ok(groups.size > 0, 'at least one logical post group should exist');

  for (const [translationKey, group] of groups) {
    assert.equal(group.length, 6, `logical post "${translationKey}" should have exactly six locale Markdown files`);

    const langs = group.map((entry) => entry.lang).sort();
    assert.deepEqual(langs, [...SIX_LOCALES].sort(), `logical post "${translationKey}" should cover all six supported locales exactly once`);

    assert.equal(new Set(group.map((entry) => entry.slug)).size, 1, `logical post "${translationKey}" should share one slug across all locale files`);
    assert.equal(new Set(group.map((entry) => entry.date)).size, 1, `logical post "${translationKey}" should share one date across all locale files`);
    assert.equal(new Set(group.map((entry) => entry.image ?? '')).size, 1, `logical post "${translationKey}" should share one featured image across all locale files`);
    assert.equal(new Set(group.map((entry) => entry.path)).size, 6, `logical post "${translationKey}" locale files should each live at a unique repository path`);
  }
});

test('the initial mi-primer-post migration preserves the Spanish entry and Spanish-fallbacks the other five locales', async () => {
  const files = await listBlogMarkdownFiles();
  const migrated = [];

  for (const file of files) {
    const markdown = await readFile(file.absolutePath, 'utf8');
    const frontmatter = parseFrontmatter(markdown);
    if (frontmatter.slug === 'mi-primer-post') {
      migrated.push({ ...frontmatter, path: file.relativePath, markdown });
    }
  }

  assert.equal(migrated.length, 6, 'the mi-primer-post migration should produce six locale Markdown files');

  const spanish = migrated.find((entry) => entry.lang === 'es');
  assert.ok(spanish, 'the migrated group should keep a Spanish (es) locale file');
  assert.equal(spanish.title, 'Mi primer post', 'the Spanish entry should preserve its original title');
  assert.match(spanish.markdown, /Bienvenidos a mi blog/, 'the Spanish entry should preserve its original body content');

  for (const lang of HIDDEN_LOCALES.concat('en', 'fr')) {
    const entry = migrated.find((candidate) => candidate.lang === lang);
    assert.ok(entry, `the migration should create a ${lang} locale file for mi-primer-post`);
    assert.equal(entry.lang, lang, `the ${lang} locale file should declare its own lang even though the content is a fallback`);
    assert.equal(entry.title, spanish.title, `${lang} should Spanish-fallback the title until translated`);
    assert.equal(entry.description, spanish.description, `${lang} should Spanish-fallback the description until translated`);
    assert.match(entry.markdown, /Bienvenidos a mi blog/, `${lang} should Spanish-fallback the body until translated`);
  }
});

// ---------------------------------------------------------------------------
// BLOG HELPERS / PUBLIC ROUTES
// ---------------------------------------------------------------------------

test('groupBlogPostsForAdmin groups localized entries into one admin row per translationKey', async () => {
  const blogModule = await importModule('src/lib/blog.ts');
  assert.equal(
    typeof blogModule.groupBlogPostsForAdmin,
    'function',
    'src/lib/blog.ts should export groupBlogPostsForAdmin(posts) for the grouped admin archive',
  );

  const posts = [
    makeFakePost({ id: 'mi-post/es', slug: 'mi-post', translationKey: 'tk-1', lang: 'es', date: '2026-01-01', image: '/images/blog/mi-post.webp' }),
    makeFakePost({ id: 'mi-post/en', slug: 'mi-post', translationKey: 'tk-1', lang: 'en', date: '2026-01-01', image: '/images/blog/mi-post.webp' }),
    makeFakePost({ id: 'mi-post/fr', slug: 'mi-post', translationKey: 'tk-1', lang: 'fr', date: '2026-01-01', image: '/images/blog/mi-post.webp' }),
    makeFakePost({ id: 'otro-post/es', slug: 'otro-post', translationKey: 'tk-2', lang: 'es', date: '2026-02-02' }),
  ];

  const groups = blogModule.groupBlogPostsForAdmin(posts);
  assert.ok(Array.isArray(groups), 'groupBlogPostsForAdmin should return an array of admin rows');
  assert.equal(groups.length, 2, 'groupBlogPostsForAdmin should return exactly one row per distinct translationKey');

  const firstGroup = normalizeAdminGroup(groups.find((group) => (group?.translationKey ?? group?.key) === 'tk-1'));
  assert.equal(firstGroup.slug, 'mi-post', 'the admin group should expose the shared slug');
  assert.deepEqual(
    Object.keys(firstGroup.locales).sort(),
    ['en', 'es', 'fr'],
    'the admin group should index every locale entry it was given',
  );

  const secondGroup = normalizeAdminGroup(groups.find((group) => (group?.translationKey ?? group?.key) === 'tk-2'));
  assert.equal(secondGroup.slug, 'otro-post', 'a distinct logical post should produce a distinct admin row');
});

test('getBlogStaticPathsForLocale keys static params on the shared post.data.slug instead of the internal collection id', async () => {
  const blogModule = await importModule('src/lib/blog.ts');
  const posts = [
    makeFakePost({ id: 'mi-post/es', slug: 'mi-post', translationKey: 'tk-1', lang: 'es', date: '2026-01-01' }),
    makeFakePost({ id: 'otro-post/es', slug: 'otro-post', translationKey: 'tk-2', lang: 'es', date: '2026-02-02' }),
  ];

  const staticPaths = blogModule.getBlogStaticPathsForLocale(posts, 'es');
  assert.equal(staticPaths.length, 2);
  assert.deepEqual(
    staticPaths.map((entry) => entry.params.slug).sort(),
    ['mi-post', 'otro-post'],
    'static paths should key the route param on the shared frontmatter slug',
  );
  assert.ok(
    staticPaths.every((entry) => entry.params.slug !== entry.props.post.id),
    'the slug route param should differ from the internal per-locale collection id',
  );
});

test('BlogArticleLayout and BlogIndexPage build blog links from post.data.slug instead of the internal collection id', async () => {
  const [articleLayoutSource, blogIndexSource] = await Promise.all([
    readRequiredSource('src/components/BlogArticleLayout.astro'),
    readRequiredSource('src/views/BlogIndexPage.astro'),
  ]);

  for (const [label, source] of [
    ['BlogArticleLayout', articleLayoutSource],
    ['BlogIndexPage', blogIndexSource],
  ]) {
    assert.match(source, /\/blog\/\$\{[\w.]*\.data\.slug\}/, `${label} should build blog links from post.data.slug`);
    assert.doesNotMatch(source, /\/blog\/\$\{[\w.]*\.id\}/, `${label} should stop linking blog posts by their internal collection id`);
  }
});

test('getBlogAlternateLinksForPost groups siblings by translationKey and points every locale at the same shared slug', async () => {
  const blogModule = await importModule('src/lib/blog.ts');
  const posts = [
    makeFakePost({ id: 'mi-post/es', slug: 'mi-post', translationKey: 'tk-1', lang: 'es', date: '2026-01-01' }),
    makeFakePost({ id: 'mi-post/en', slug: 'mi-post', translationKey: 'tk-1', lang: 'en', date: '2026-01-01' }),
    makeFakePost({ id: 'mi-post/fr', slug: 'mi-post', translationKey: 'tk-1', lang: 'fr', date: '2026-01-01' }),
    makeFakePost({ id: 'otro-post/es', slug: 'otro-post', translationKey: 'tk-2', lang: 'es', date: '2026-02-02' }),
  ];

  const alternates = blogModule.getBlogAlternateLinksForPost(posts, posts[0]);

  assert.equal(alternates.es, '/blog/mi-post', 'the Spanish alternate should point at the shared slug');
  assert.equal(alternates.en, '/en/blog/mi-post', 'the English alternate should point at the shared slug, not its own internal id');
  assert.equal(alternates.fr, '/fr/blog/mi-post', 'the French alternate should point at the shared slug, not its own internal id');
  assert.equal(alternates.de, undefined, 'locales without a translationKey sibling should not appear in the alternates map');
  assert.ok(
    Object.values(alternates).every((href) => !href.includes('otro-post')),
    'alternates should never leak a different logical post\'s slug',
  );
});

test('shouldShowBlogComingSoon returns true for zero/one localized posts and false once a locale has two or more posts', async () => {
  const blogModule = await importModule('src/lib/blog.ts');

  assert.equal(
    typeof blogModule.shouldShowBlogComingSoon,
    'function',
    'src/lib/blog.ts should export shouldShowBlogComingSoon(count)',
  );
  assert.equal(blogModule.shouldShowBlogComingSoon(0), true);
  assert.equal(blogModule.shouldShowBlogComingSoon(1), true);
  assert.equal(blogModule.shouldShowBlogComingSoon(2), false);
  assert.equal(blogModule.shouldShowBlogComingSoon(5), false);
});

test('BlogIndexPage uses shouldShowBlogComingSoon with the localized post count for per-language archive behavior', async () => {
  const source = await readRequiredSource('src/views/BlogIndexPage.astro');

  assert.match(
    source,
    /import\s+\{[\s\S]*shouldShowBlogComingSoon[\s\S]*\}\s+from\s+['"]\.\.\/lib\/blog(?:\.ts)?['"]/,
    'BlogIndexPage should import the coming-soon helper from the shared blog helpers',
  );
  assert.match(
    source,
    /shouldShowBlogComingSoon\(\s*localizedPosts\.length\s*\)/,
    'BlogIndexPage should base the coming-soon row on the current locale post count',
  );
  assert.match(source, /i\.blog\.comingSoonTitle/, 'BlogIndexPage should keep the localized coming-soon title');
  assert.match(source, /i\.blog\.comingSoonMeta/, 'BlogIndexPage should keep the localized coming-soon meta');
  assert.doesNotMatch(
    source,
    /archive\.length\s*>\s*0/,
    'BlogIndexPage should stop keying the coming-soon row off the archive array length alone',
  );
});

// ---------------------------------------------------------------------------
// STORE CRUD
// ---------------------------------------------------------------------------

test('createBlogPost validates required visible-locale translations from publicLanguagePicker before any repository write', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  assert.equal(typeof store.createBlogPost, 'function', 'AdminStore should expose createBlogPost for the create flow');
  assert.deepEqual(
    store.getPublicLanguagePicker(),
    VISIBLE_LOCALES,
    'this contract fixture should expose the default ES/EN/FR public picker used to derive required create panels',
  );

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    fetchCalls.push({ method: init.method ?? 'GET', url: String(input) });
    return new Response(JSON.stringify({ message: 'Unexpected network call' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await assertRejectsWithMessage(
      store.createBlogPost({
        slug: 'mi-post',
        date: '2026-08-26',
        translations: {
          es: { title: 'Título', description: 'Descripción', tags: ['seo'], body: '# Cuerpo' },
          fr: { title: 'Titre', description: 'Description', tags: ['seo'], body: '# Corps' },
        },
      }),
      [/obligatori|requerid|falta|required/i, /\ben\b/i],
      'creating without every visible-locale translation (missing EN here) should reject before any write',
    );

    await assertRejectsWithMessage(
      store.createBlogPost({
        slug: 'mi-post',
        date: '2026-08-26',
        translations: makeTranslationsFixture({ en: { title: '   ' } }),
      }),
      [/obligatori|requerid|falta|required/i, /t[ií]tulo|title/i],
      'a blank required field for a visible locale should reject before any write',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(fetchCalls, [], 'invalid create payloads should fail before any Git Gateway write');
});

test('publicLanguagePicker can make DE a required create/edit locale, and BlogPostForm must derive panels from the live picker instead of hardcoded ES/EN/FR', async () => {
  const [{ AdminStore }, formSource] = await Promise.all([
    importModule('src/components/admin/adminStore.ts'),
    readRequiredSource('src/components/admin/BlogPostForm.tsx'),
  ]);

  const dynamicVisibleLocales = ['es', 'en', 'fr', 'de'];
  const slug = 'mi-post-con-de';
  const localePaths = getLocaleMarkdownPaths(slug);
  const createTranslations = {
    ...makeTranslationsFixture(),
    de: makeLocaleTranslation('de'),
  };
  const updateTranslations = {
    es: makeLocaleTranslation('es', {
      title: 'Título ES actualizado',
      description: 'Descripción ES actualizada',
      tags: ['seo', 'actualizado'],
      body: '# Cuerpo ES actualizado',
    }),
    en: makeLocaleTranslation('en', {
      title: 'Updated Title EN',
      description: 'Updated Description EN',
      tags: ['seo', 'updated'],
      body: '# Updated Body EN',
    }),
    fr: makeLocaleTranslation('fr', {
      title: 'Titre FR mis à jour',
      description: 'Description FR mise à jour',
      tags: ['seo', 'maj'],
      body: '# Corps FR mis à jour',
    }),
    de: makeLocaleTranslation('de', {
      title: 'Titel DE aktualisiert',
      description: 'Beschreibung DE aktualisiert',
      tags: ['seo', 'aktualisiert'],
      body: '# Inhalt DE aktualisiert',
    }),
  };
  const existingUpdateTranslations = {
    es: makeLocaleTranslation('es', {
      title: 'Título ES previo',
      description: 'Descripción ES previa',
      tags: ['seo', 'previo-es'],
      body: '# Cuerpo ES previo',
    }),
    en: makeLocaleTranslation('en', {
      title: 'Title EN previous',
      description: 'Description EN previous',
      tags: ['seo', 'previous-en'],
      body: '# Body EN previous',
    }),
    fr: makeLocaleTranslation('fr', {
      title: 'Titre FR précédent',
      description: 'Description FR précédente',
      tags: ['seo', 'precedent-fr'],
      body: '# Corps FR précédent',
    }),
    de: makeLocaleTranslation('de', {
      title: 'Titel DE vorher',
      description: 'Beschreibung DE vorher',
      tags: ['seo', 'vorher-de'],
      body: '# Inhalt DE vorher',
    }),
    it: makeLocaleTranslation('it', {
      title: 'Titolo IT preservato',
      description: 'Descrizione IT preservata',
      tags: ['seo', 'preserva-it'],
      body: '# Corpo IT preservato',
    }),
    ca: makeLocaleTranslation('ca', {
      title: 'Títol CA preservat',
      description: 'Descripció CA preservada',
      tags: ['seo', 'preserva-ca'],
      body: '# Cos CA preservat',
    }),
  };
  const existingUpdateShaByLocale = {
    es: 'es-existing-sha',
    en: 'en-existing-sha',
    fr: 'fr-existing-sha',
    de: 'de-existing-sha',
    it: 'it-existing-sha',
    ca: 'ca-existing-sha',
  };
  const store = createAdminStore(
    AdminStore,
    'es',
    'stale-token',
    { publicLanguagePicker: dynamicVisibleLocales },
  );

  assert.deepEqual(
    store.getPublicLanguagePicker(),
    dynamicVisibleLocales,
    'this contract fixture should allow the site picker to surface DE as a visible admin blog locale',
  );
  assert.deepEqual(
    getHiddenLocales(dynamicVisibleLocales),
    ['it', 'ca'],
    'once DE is visible, only IT and CA should remain hidden for fallback behavior',
  );

  const originalFetch = globalThis.fetch;
  const createFetchCalls = [];
  const updateFetchCalls = [];
  let currentPhase = 'create';
  globalThis.fetch = async (input, init = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), body: init.body ?? null };

    if (currentPhase === 'update') {
      updateFetchCalls.push(call);
    } else {
      createFetchCalls.push(call);
    }

    for (const [locale, filePath] of Object.entries(localePaths)) {
      if (!call.url.includes(filePath)) continue;

      if (call.method === 'GET') {
        if (currentPhase === 'update') {
          const existingMarkdown = buildFrontmatterFixture({
            slug,
            translationKey: 'tk-mi-post-con-de',
            date: '2026-08-26',
            image: '/images/blog/mi-post-con-de.webp',
            ...existingUpdateTranslations[locale],
            lang: locale,
          });
          return new Response(JSON.stringify({
            sha: existingUpdateShaByLocale[locale],
            content: Buffer.from(existingMarkdown, 'utf8').toString('base64'),
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ message: 'Not Found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (call.method === 'PUT') {
        return new Response(JSON.stringify({
          content: {
            sha: `${locale}-${currentPhase === 'update' ? 'updated' : 'created'}-sha`,
          },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await assertRejectsWithMessage(
      store.createBlogPost({
        slug,
        date: '2026-08-26',
        translations: makeTranslationsFixture(),
      }),
      /obligatori|requerid|falta|completa|rellena/i,
      'making DE visible should require a DE translation during create before any repository access',
    );

    await assertRejectsWithMessage(
      store.updateBlogPost({
        slug,
        date: '2026-09-01',
        currentImage: '/images/blog/mi-post-con-de.webp',
        translations: makeTranslationsFixture(),
      }),
      [/obligatori|requerid|falta|required/i, /\bde\b/i],
      'making DE visible should require update validation to name the missing DE locale before any repository access',
    );

    assert.deepEqual(createFetchCalls, [], 'missing DE should fail validation before any Git Gateway call');
    await assert.doesNotReject(
      store.createBlogPost({
        slug,
        date: '2026-08-26',
        translations: createTranslations,
      }),
      'once DE is supplied, the create flow should treat IT/CA as the only hidden locales and proceed to repository IO',
    );

    currentPhase = 'update';
    await assert.doesNotReject(
      store.updateBlogPost({
        slug,
        date: '2026-09-01',
        currentImage: '/images/blog/mi-post-con-de.webp',
        translations: updateTranslations,
      }),
      'once DE is supplied, the edit flow should treat IT/CA as the only hidden locales and proceed to repository IO',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(
    createFetchCalls.length > 0,
    'once DE is present, create should no longer fail validation as if DE were hidden and should proceed to Git Gateway IO',
  );
  assert.ok(
    createFetchCalls.every((call) => Object.values(localePaths).some((filePath) => call.url.includes(filePath))),
    'the DE-visible create flow should probe/write locale-specific Markdown paths rather than an old singleton slug file',
  );

  const putCalls = createFetchCalls.filter((call) => call.method === 'PUT');
  const payloadsByLocale = Object.fromEntries(
    Object.entries(localePaths).map(([locale, filePath]) => {
      const putCall = putCalls.find((call) => call.url.includes(filePath));
      assert.ok(putCall, `the DE-visible create flow should write ${filePath}`);
      return [locale, decodeRepositoryPayload(putCall.body)];
    }),
  );

  assertMarkdownFrontmatter(payloadsByLocale.de.markdown, {
    ...makeLocaleTranslation('de'),
    lang: 'de',
  });
  for (const locale of ['it', 'ca']) {
    assertMarkdownFrontmatter(payloadsByLocale[locale].markdown, {
      ...makeLocaleTranslation('es'),
      lang: locale,
    });
  }

  assert.ok(
    updateFetchCalls.length > 0,
    'once DE is present, edit should no longer fail validation as if DE were hidden and should proceed to Git Gateway IO',
  );
  assert.ok(
    updateFetchCalls.every((call) => Object.values(localePaths).some((filePath) => call.url.includes(filePath))),
    'the DE-visible edit flow should probe/write locale-specific Markdown paths rather than an old singleton slug file',
  );

  const updatePutCalls = updateFetchCalls.filter((call) => call.method === 'PUT');
  assert.equal(updatePutCalls.length, 6, 'updateBlogPost should still upsert all six locale Markdown files when DE becomes visible');

  for (const [locale, filePath] of Object.entries(localePaths)) {
    const getCall = updateFetchCalls.find((call) => call.method === 'GET' && call.url.includes(filePath));
    const putCall = updatePutCalls.find((call) => call.url.includes(filePath));
    assert.ok(getCall, `updateBlogPost should read the current sha for the ${locale} locale file when DE is visible`);
    assert.ok(putCall, `updateBlogPost should upsert the ${locale} locale file when DE is visible`);

    const payload = decodeRepositoryPayload(putCall.body);
    assert.equal(payload.sha, existingUpdateShaByLocale[locale], `the ${locale} locale upsert should use its own freshly-fetched sha`);
    assertMarkdownFrontmatter(payload.markdown, {
      slug,
      date: '2026-09-01',
      image: '/images/blog/mi-post-con-de.webp',
      lang: locale,
    });
  }

  for (const locale of dynamicVisibleLocales) {
    const putCall = updatePutCalls.find((call) => call.url.includes(localePaths[locale]));
    assertMarkdownFrontmatter(decodeRepositoryPayload(putCall.body).markdown, updateTranslations[locale]);
  }

  for (const locale of getHiddenLocales(dynamicVisibleLocales)) {
    const putCall = updatePutCalls.find((call) => call.url.includes(localePaths[locale]));
    assertMarkdownFrontmatter(decodeRepositoryPayload(putCall.body).markdown, {
      ...existingUpdateTranslations[locale],
      lang: locale,
    });
  }

  const updateSlugSegments = new Set(
    updatePutCalls.map((call) => call.url.replace(/^.*\/contents\//, '').split('/').slice(0, -1).join('/')),
  );
  assert.equal(updateSlugSegments.size, 1, 'every DE-visible locale upsert should still live under the same fixed slug');
  assert.ok([...updateSlugSegments][0].includes(slug), 'the DE-visible edit flow should keep the original slug directory during update');

  assert.match(
    formSource,
    /getPublicLanguagePicker\(\)|store\.getPublicLanguagePicker/,
    'BlogPostForm should read the visible admin blog locales from the store picker contract',
  );
  assert.match(
    formSource,
    /store\.getPublicLanguagePicker\(\)\.map\(\(locale\)|const\s+\w+\s*=\s*store\.getPublicLanguagePicker\(\)/,
    'BlogPostForm should derive translation panels from the live picker result so DE can appear without changing the component source',
  );
  assert.doesNotMatch(
    formSource,
    /ADMIN_BLOG_LANGS\.map\(\(locale\)\s*=>/,
    'BlogPostForm should not hardcode the translation panel loop to ADMIN_BLOG_LANGS once the picker can expose DE',
  );
  assert.doesNotMatch(
    formSource,
    /\[['"]es['"],\s*['"]en['"],\s*['"]fr['"]\]/,
    'BlogPostForm should not inline a fixed ES/EN/FR panel list',
  );
});

test('createBlogPost retry-upserts partially existing locale files by reading every locale path first and reusing sha only where the file already exists', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  const slug = 'mi-post-retry';
  const localePaths = getLocaleMarkdownPaths(slug);
  const existingShaByLocale = {
    es: 'es-existing-sha',
    de: 'de-existing-sha',
    it: 'it-existing-sha',
  };

  const originalFetch = globalThis.fetch;
  const fetchCalls = [];

  globalThis.fetch = async (input, init = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), body: init.body ?? null };
    fetchCalls.push(call);

    for (const [locale, filePath] of Object.entries(localePaths)) {
      if (!call.url.includes(filePath)) continue;

      if (call.method === 'GET') {
        const existingSha = existingShaByLocale[locale];
        if (existingSha) {
          const existingMarkdown = buildFrontmatterFixture({
            slug,
            translationKey: 'tk-mi-post-retry',
            date: '2026-08-20',
            image: '/images/blog/mi-post-retry.webp',
            lang: locale,
            ...makeLocaleTranslation(locale),
          });

          return new Response(JSON.stringify({
            sha: existingSha,
            content: Buffer.from(existingMarkdown, 'utf8').toString('base64'),
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ message: 'Not Found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (call.method === 'PUT') {
        return new Response(JSON.stringify({ content: { sha: `${locale}-written-sha` } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await store.createBlogPost({
      slug,
      date: '2026-08-26',
      translations: makeTranslationsFixture(),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const getCalls = fetchCalls.filter((call) => call.method === 'GET');
  const putCalls = fetchCalls.filter((call) => call.method === 'PUT');
  const sequence = fetchCalls.map(getCallSummary);

  assert.equal(getCalls.length, 6, 'retry-safe create should probe every locale Markdown path before writing');
  assert.equal(putCalls.length, 6, 'retry-safe create should still upsert all six locale Markdown files');
  assert.ok(
    !sequence.some((summary) => summary.includes(`src/content/blog/${slug}.md`)),
    'retry-safe create should stop using the old singleton Markdown path that caused false duplicate-slug rejections',
  );

  const payloadsByLocale = {};
  for (const [locale, filePath] of Object.entries(localePaths)) {
    const getCall = getCalls.find((call) => call.url.includes(filePath));
    const putCall = putCalls.find((call) => call.url.includes(filePath));

    assert.ok(getCall, `retry-safe create should read ${filePath} before deciding whether the locale needs a create or update`);
    assert.ok(putCall, `retry-safe create should write ${filePath}`);

    const payload = decodeRepositoryPayload(putCall.body);
    payloadsByLocale[locale] = payload;
    assertNonEmptyRepositoryMessage(payload, `${locale} retry-safe create should include a commit message`);

    if (existingShaByLocale[locale]) {
      assert.equal(
        payload.sha,
        existingShaByLocale[locale],
        `retry-safe create should upsert the previously-created ${locale} locale using the fetched sha`,
      );
    } else {
      assert.equal(
        payload.sha,
        undefined,
        `retry-safe create should create the missing ${locale} locale without attaching an update sha`,
      );
    }

    const getIndex = sequence.indexOf(`GET /.netlify/git/github/contents/${filePath}`);
    const putIndex = sequence.indexOf(`PUT /.netlify/git/github/contents/${filePath}`);
    assert.ok(getIndex > -1 && putIndex > getIndex, `${filePath} should be fetched before its corresponding retry PUT`);
  }

  const translations = makeTranslationsFixture();
  for (const locale of VISIBLE_LOCALES) {
    assertMarkdownFrontmatter(payloadsByLocale[locale].markdown, { ...translations[locale], lang: locale });
  }

  for (const hiddenLocale of HIDDEN_LOCALES) {
    assertMarkdownFrontmatter(payloadsByLocale[hiddenLocale].markdown, {
      title: translations.es.title,
      description: translations.es.description,
      tags: translations.es.tags,
      body: translations.es.body,
      lang: hiddenLocale,
    });
  }
});

test('createBlogPost writes six locale Markdown files sharing slug/translationKey/date, Spanish-falling-back hidden DE/IT/CA content', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore, 'es', 'expired-token');

  const previousWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  let refreshCalls = 0;

  globalThis.window = {
    netlifyIdentity: {
      currentUser: () => ({ id: 'editor' }),
      refresh: async () => {
        refreshCalls += 1;
        return 'fresh-create-token';
      },
    },
  };

  const localePaths = getLocaleMarkdownPaths('mi-post');

  globalThis.fetch = async (input, init = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), headers: init.headers ?? {}, body: init.body ?? null };
    fetchCalls.push(call);

    for (const filePath of Object.values(localePaths)) {
      if (call.url.includes(filePath)) {
        if (call.method === 'GET') return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        if (call.method === 'PUT') return new Response(JSON.stringify({ content: { sha: 'new-sha' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    await store.createBlogPost({
      slug: 'mi-post',
      date: '2026-08-26',
      translations: makeTranslationsFixture(),
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }

  assert.equal(refreshCalls, 1, 'creating a post should refresh Netlify Identity before any Git Gateway write');
  assert.ok(
    fetchCalls.every((call) => String(call.headers.Authorization ?? '').includes('fresh-create-token')),
    'create requests should use the refreshed Identity token',
  );

  const putCalls = fetchCalls.filter((call) => call.method === 'PUT');
  assert.equal(putCalls.length, 6, 'createBlogPost should write exactly six locale Markdown files');

  const payloadsByLocale = {};
  for (const [locale, filePath] of Object.entries(localePaths)) {
    const putCall = putCalls.find((call) => call.url.includes(filePath));
    assert.ok(putCall, `createBlogPost should write the ${locale} locale Markdown file at ${filePath}`);
    payloadsByLocale[locale] = decodeRepositoryPayload(putCall.body);
    assertNonEmptyRepositoryMessage(payloadsByLocale[locale], `${locale} markdown create should include a commit message`);
  }

  assert.equal(new Set(Object.values(payloadsByLocale).map((payload) => getFrontmatterField(payload.markdown, 'slug'))).size, 1, 'every locale file should share the same slug');
  assert.equal(new Set(Object.values(payloadsByLocale).map((payload) => getFrontmatterField(payload.markdown, 'translationKey'))).size, 1, 'every locale file should share the same translationKey');
  assert.equal(new Set(Object.values(payloadsByLocale).map((payload) => getFrontmatterField(payload.markdown, 'date'))).size, 1, 'every locale file should share the same date');

  const translations = makeTranslationsFixture();
  for (const locale of VISIBLE_LOCALES) {
    assertMarkdownFrontmatter(payloadsByLocale[locale].markdown, { ...translations[locale], lang: locale });
  }

  for (const hiddenLocale of HIDDEN_LOCALES) {
    assertMarkdownFrontmatter(payloadsByLocale[hiddenLocale].markdown, {
      title: translations.es.title,
      description: translations.es.description,
      tags: translations.es.tags,
      body: translations.es.body,
      lang: hiddenLocale,
    });
  }
});

test('createBlogPost uploads the shared featured image once before any locale Markdown writes', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  const localePaths = getLocaleMarkdownPaths('mi-post');
  const { repositoryPath: imagePath, publicPath: imagePublicPath } = getSharedImagePaths('mi-post', 'png');

  const originalFetch = globalThis.fetch;
  const fetchCalls = [];

  globalThis.fetch = async (input, init = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), body: init.body ?? null };
    fetchCalls.push(call);

    if (call.url.includes(imagePath)) {
      if (call.method === 'GET') return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      if (call.method === 'PUT') return new Response(JSON.stringify({ content: { sha: 'image-sha' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    for (const filePath of Object.values(localePaths)) {
      if (call.url.includes(filePath)) {
        if (call.method === 'GET') return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        if (call.method === 'PUT') return new Response(JSON.stringify({ content: { sha: 'markdown-sha' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    await store.createBlogPost({
      slug: 'mi-post',
      date: '2026-08-26',
      translations: makeTranslationsFixture(),
      featuredImage: new File(['image-bytes'], 'mi-post.png', { type: 'image/png' }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const sequence = fetchCalls.map(getCallSummary);
  const imagePutIndex = sequence.indexOf(`PUT /.netlify/git/github/contents/${imagePath}`);
  assert.ok(imagePutIndex > -1, 'creating with a featured image should upload the shared image');

  for (const filePath of Object.values(localePaths)) {
    const markdownPutIndex = sequence.indexOf(`PUT /.netlify/git/github/contents/${filePath}`);
    assert.ok(markdownPutIndex > imagePutIndex, `the ${filePath} write should happen after the shared image upload`);
  }

  const putCalls = fetchCalls.filter((call) => call.method === 'PUT' && Object.values(localePaths).some((filePath) => call.url.includes(filePath)));
  for (const putCall of putCalls) {
    const payload = decodeRepositoryPayload(putCall.body);
    assertMarkdownFrontmatter(payload.markdown, { image: imagePublicPath });
  }
});

test('updateBlogPost upserts every locale file with its own current sha, applies submitted visible translations and shared date/image updates, and preserves untouched hidden-locale content', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore, 'es', 'expired-token');

  assert.equal(typeof store.updateBlogPost, 'function', 'AdminStore should expose updateBlogPost for the edit flow');

  const previousWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  let refreshCalls = 0;

  globalThis.window = {
    netlifyIdentity: {
      currentUser: () => ({ id: 'editor' }),
      refresh: async () => {
        refreshCalls += 1;
        return 'fresh-update-token';
      },
    },
  };

  const localePaths = getLocaleMarkdownPaths('mi-post');
  const shaByLocale = { es: 'es-sha', en: 'en-sha', fr: 'fr-sha', de: 'de-sha', it: 'it-sha', ca: 'ca-sha' };
  const previousFrontmatterFixture = {
    slug: 'mi-post',
    translationKey: 'tk-mi-post',
    date: '2026-01-01',
    image: '/images/blog/mi-post.webp',
    title: 'Título ES',
    description: 'Descripción ES',
    tags: ['seo'],
    body: '# Cuerpo ES',
  };

  globalThis.fetch = async (input, init = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), headers: init.headers ?? {}, body: init.body ?? null };
    fetchCalls.push(call);

    for (const [locale, filePath] of Object.entries(localePaths)) {
      if (!call.url.includes(filePath)) continue;

      if (call.method === 'GET') {
        const existingMarkdown = buildFrontmatterFixture({ ...previousFrontmatterFixture, lang: locale });
        return new Response(JSON.stringify({
          sha: shaByLocale[locale],
          content: Buffer.from(existingMarkdown, 'utf8').toString('base64'),
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (call.method === 'PUT') {
        return new Response(JSON.stringify({ content: { sha: `${locale}-updated-sha` } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  };

  const updatedTranslations = {
    es: { title: 'Título ES actualizado', description: 'Descripción ES actualizada', tags: ['seo', 'ugc'], body: '# Cuerpo ES actualizado' },
    en: { title: 'Updated Title EN', description: 'Updated Description EN', tags: ['seo', 'ugc'], body: '# Updated Body EN' },
    fr: { title: 'Titre FR mis à jour', description: 'Description FR mise à jour', tags: ['seo', 'ugc'], body: '# Corps FR mis à jour' },
  };

  try {
    await store.updateBlogPost({
      slug: 'mi-post',
      date: '2026-09-01',
      currentImage: '/images/blog/mi-post.webp',
      translations: updatedTranslations,
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }

  assert.equal(refreshCalls, 1, 'editing should refresh Netlify Identity before touching Git Gateway');
  assert.ok(
    fetchCalls.every((call) => String(call.headers.Authorization ?? '').includes('fresh-update-token')),
    'update requests should use the refreshed Identity token',
  );

  const putCalls = fetchCalls.filter((call) => call.method === 'PUT');
  assert.equal(putCalls.length, 6, 'updateBlogPost should upsert all six locale Markdown files, not just the submitted ones');

  for (const [locale, filePath] of Object.entries(localePaths)) {
    const getCall = fetchCalls.find((call) => call.method === 'GET' && call.url.includes(filePath));
    const putCall = putCalls.find((call) => call.url.includes(filePath));
    assert.ok(getCall, `updateBlogPost should read the current sha for the ${locale} locale file`);
    assert.ok(putCall, `updateBlogPost should upsert the ${locale} locale file`);

    const payload = decodeRepositoryPayload(putCall.body);
    assert.equal(payload.sha, shaByLocale[locale], `the ${locale} locale upsert should use its own freshly-fetched sha`);
    assertMarkdownFrontmatter(payload.markdown, { slug: 'mi-post', date: '2026-09-01', image: '/images/blog/mi-post.webp', lang: locale });
  }

  for (const locale of VISIBLE_LOCALES) {
    const putCall = putCalls.find((call) => call.url.includes(localePaths[locale]));
    assertMarkdownFrontmatter(decodeRepositoryPayload(putCall.body).markdown, updatedTranslations[locale]);
  }

  for (const hiddenLocale of HIDDEN_LOCALES) {
    const putCall = putCalls.find((call) => call.url.includes(localePaths[hiddenLocale]));
    assertMarkdownFrontmatter(decodeRepositoryPayload(putCall.body).markdown, {
      title: previousFrontmatterFixture.title,
      description: previousFrontmatterFixture.description,
      tags: previousFrontmatterFixture.tags,
      body: previousFrontmatterFixture.body,
    });
  }

  const slugSegments = new Set(
    putCalls.map((call) => call.url.replace(/^.*\/contents\//, '').split('/').slice(0, -1).join('/')),
  );
  assert.equal(slugSegments.size, 1, 'every upserted locale path should live under the same fixed slug');
  assert.ok([...slugSegments][0].includes('mi-post'), 'the slug directory should remain fixed to the original slug during edit');
});

test('updateBlogPost uploads a replacement shared image before any locale writes, and re-running the same update stays retry-safe by upserting the already-uploaded image', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  const localePaths = getLocaleMarkdownPaths('mi-post');
  const { repositoryPath: imagePath, publicPath: imagePublicPath } = getSharedImagePaths('mi-post', 'png');
  const existingTranslationsByLocale = makeAllLocaleTranslationsFixture({
    de: {
      title: 'Titel DE versteckt',
      description: 'Beschreibung DE bleibt unverändert',
      tags: ['seo', 'behalten-de'],
      body: '# Inhalt DE bleibt exakt',
    },
    it: {
      title: 'Titolo IT nascosto',
      description: 'Descrizione IT resta invariata',
      tags: ['seo', 'mantieni-it'],
      body: '# Corpo IT resta identico',
    },
    ca: {
      title: 'Títol CA ocult',
      description: 'Descripció CA es manté intacta',
      tags: ['seo', 'mantenir-ca'],
      body: '# Cos CA es manté exacte',
    },
  });
  const existingMarkdownByLocale = Object.fromEntries(
    SIX_LOCALES.map((locale) => [locale, buildFrontmatterFixture({
      slug: 'mi-post',
      translationKey: 'tk-mi-post',
      date: '2026-08-26',
      image: '/images/blog/mi-post.webp',
      ...existingTranslationsByLocale[locale],
      lang: locale,
    })]),
  );

  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  let imageSha = null;

  globalThis.fetch = async (input, init = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), body: init.body ?? null };
    fetchCalls.push(call);

    if (call.url.includes(imagePath)) {
      if (call.method === 'GET') {
        return imageSha
          ? new Response(JSON.stringify({ sha: imageSha }), { status: 200, headers: { 'Content-Type': 'application/json' } })
          : new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      if (call.method === 'PUT') {
        imageSha = 'image-sha-after-upload';
        return new Response(JSON.stringify({ content: { sha: imageSha } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    for (const filePath of Object.values(localePaths)) {
      const locale = Object.entries(localePaths).find(([, candidatePath]) => candidatePath === filePath)?.[0];
      if (call.url.includes(filePath) && locale) {
        if (call.method === 'GET') {
          return new Response(JSON.stringify({
            sha: `${filePath}-sha`,
            content: Buffer.from(existingMarkdownByLocale[locale], 'utf8').toString('base64'),
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (call.method === 'PUT') return new Response(JSON.stringify({ content: { sha: `${filePath}-updated-sha` } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  };

  const performUpdate = () => store.updateBlogPost({
    slug: 'mi-post',
    date: '2026-08-26',
    currentImage: '/images/blog/mi-post.webp',
    featuredImage: new File(['replacement'], 'mi-post.png', { type: 'image/png' }),
    translations: makeTranslationsFixture(),
  });

  try {
    await performUpdate();
    const firstCallCount = fetchCalls.length;
    const firstBatch = fetchCalls.slice(0, firstCallCount);
    await performUpdate();
    const secondBatch = fetchCalls.slice(firstCallCount);

    const firstSequence = firstBatch.map(getCallSummary);
    const firstImagePutIndex = firstSequence.indexOf(`PUT /.netlify/git/github/contents/${imagePath}`);
    assert.ok(firstImagePutIndex > -1, 'the first update should upload the replacement image');
    for (const filePath of Object.values(localePaths)) {
      const markdownPutIndex = firstSequence.indexOf(`PUT /.netlify/git/github/contents/${filePath}`);
      assert.ok(markdownPutIndex > firstImagePutIndex, `the ${filePath} write should happen after the image upload on the first call`);
    }

    for (const hiddenLocale of HIDDEN_LOCALES) {
      const putCall = firstBatch.find((call) => call.method === 'PUT' && call.url.includes(localePaths[hiddenLocale]));
      assert.ok(putCall, `the first replacement-image update should still upsert the hidden ${hiddenLocale} locale file`);
      const payload = decodeRepositoryPayload(putCall.body);
      assert.equal(
        payload.markdown,
        existingMarkdownByLocale[hiddenLocale].replace(
          'image: "/images/blog/mi-post.webp"\n',
          `image: ${JSON.stringify(imagePublicPath)}\n`,
        ),
        `the hidden ${hiddenLocale} locale should preserve its localized title/description/tags/body when only the shared image changes`,
      );
    }

    const secondImageGet = secondBatch.find((call) => call.method === 'GET' && call.url.includes(imagePath));
    const secondImagePut = secondBatch.find((call) => call.method === 'PUT' && call.url.includes(imagePath));
    assert.ok(secondImageGet, 'retrying the same update should re-check the image sha instead of assuming the path is free');
    assert.ok(secondImagePut, 'retrying the same update should still upsert the shared image');

    const secondImagePayload = decodeRepositoryPayload(secondImagePut.body);
    assert.equal(
      secondImagePayload.sha,
      'image-sha-after-upload',
      'retrying the update should upsert the existing image using its current sha instead of erroring as a duplicate create',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('updateBlogPost validates missing or blank required fields for currently visible locales in Spanish before any repository fetch or write', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  assert.equal(typeof store.updateBlogPost, 'function', 'AdminStore should expose updateBlogPost for the edit flow');
  assert.deepEqual(
    store.getPublicLanguagePicker(),
    VISIBLE_LOCALES,
    'this contract fixture should expose the default ES/EN/FR public picker used to derive required edit panels',
  );

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    fetchCalls.push({ method: init.method ?? 'GET', url: String(input) });
    return new Response(JSON.stringify({ message: 'Unexpected network call' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await assertRejectsWithMessage(
      store.updateBlogPost({
        slug: 'mi-post',
        date: '2026-09-01',
        currentImage: '/images/blog/mi-post.webp',
        translations: {
          es: makeLocaleTranslation('es'),
          fr: makeLocaleTranslation('fr'),
        },
      }),
      [/obligatori|requerid|falta|required/i, /\ben\b/i],
      'editing without every visible-locale translation (missing EN here) should reject with the exact locale before any repository access',
    );

    await assertRejectsWithMessage(
      store.updateBlogPost({
        slug: 'mi-post',
        date: '2026-09-01',
        currentImage: '/images/blog/mi-post.webp',
        translations: makeTranslationsFixture({ en: { title: '   ' } }),
      }),
      [/obligatori|requerid|falta|required/i, /\ben\b/i, /t[ií]tulo|title/i],
      'a blank EN title should reject with the exact locale and field before any repository mutation',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(fetchCalls, [], 'invalid update payloads should fail before any Git Gateway fetch or write');
});

test('updateBlogPost removing the shared image clears the image frontmatter on every locale file and only deletes the previously owned asset after all six locale writes succeed', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  const localePaths = getLocaleMarkdownPaths('mi-post');
  const { repositoryPath: imagePath } = getSharedImagePaths('mi-post', 'webp');
  const existingTranslationsByLocale = makeAllLocaleTranslationsFixture({
    de: {
      title: 'Titel DE versteckt',
      description: 'Beschreibung DE bleibt unverändert',
      tags: ['seo', 'behalten-de'],
      body: '# Inhalt DE bleibt exakt',
    },
    it: {
      title: 'Titolo IT nascosto',
      description: 'Descrizione IT resta invariata',
      tags: ['seo', 'mantieni-it'],
      body: '# Corpo IT resta identico',
    },
    ca: {
      title: 'Títol CA ocult',
      description: 'Descripció CA es manté intacta',
      tags: ['seo', 'mantenir-ca'],
      body: '# Cos CA es manté exacte',
    },
  });
  const existingMarkdownByLocale = Object.fromEntries(
    SIX_LOCALES.map((locale) => [locale, buildFrontmatterFixture({
      slug: 'mi-post',
      translationKey: 'tk-mi-post',
      date: '2026-08-26',
      image: '/images/blog/mi-post.webp',
      ...existingTranslationsByLocale[locale],
      lang: locale,
    })]),
  );

  const originalFetch = globalThis.fetch;
  const fetchCalls = [];

  globalThis.fetch = async (input, init = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), body: init.body ?? null };
    fetchCalls.push(call);

    for (const filePath of Object.values(localePaths)) {
      const locale = Object.entries(localePaths).find(([, candidatePath]) => candidatePath === filePath)?.[0];
      if (call.url.includes(filePath) && locale) {
        if (call.method === 'GET') {
          return new Response(JSON.stringify({
            sha: `${filePath}-sha`,
            content: Buffer.from(existingMarkdownByLocale[locale], 'utf8').toString('base64'),
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (call.method === 'PUT') return new Response(JSON.stringify({ content: { sha: `${filePath}-updated-sha` } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (call.url.includes(imagePath)) {
      if (call.method === 'GET') return new Response(JSON.stringify({ sha: 'owned-image-sha' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (call.method === 'DELETE') return new Response(JSON.stringify({ commit: { sha: 'deleted-image-sha' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    await store.updateBlogPost({
      slug: 'mi-post',
      date: '2026-08-26',
      currentImage: '/images/blog/mi-post.webp',
      removeImage: true,
      translations: makeTranslationsFixture(),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  for (const filePath of Object.values(localePaths)) {
    const putCall = fetchCalls.find((call) => call.method === 'PUT' && call.url.includes(filePath));
    assert.ok(putCall, `updateBlogPost should still upsert ${filePath} when removing the shared image`);
    assertMarkdownFrontmatter(decodeRepositoryPayload(putCall.body).markdown, { image: null });
  }

  for (const hiddenLocale of HIDDEN_LOCALES) {
    const putCall = fetchCalls.find((call) => call.method === 'PUT' && call.url.includes(localePaths[hiddenLocale]));
    assert.ok(putCall, `removing the shared image should still upsert the hidden ${hiddenLocale} locale file`);
    const payload = decodeRepositoryPayload(putCall.body);
    assert.equal(
      payload.markdown,
      existingMarkdownByLocale[hiddenLocale].replace('image: "/images/blog/mi-post.webp"\n', ''),
      `the hidden ${hiddenLocale} locale should preserve its localized title/description/tags/body when only the shared image is removed`,
    );
  }

  const sequence = fetchCalls.map(getCallSummary);
  const lastMarkdownPutIndex = Math.max(
    ...Object.values(localePaths).map((filePath) => sequence.indexOf(`PUT /.netlify/git/github/contents/${filePath}`)),
  );
  const imageDeleteIndex = sequence.indexOf(`DELETE /.netlify/git/github/contents/${imagePath}`);
  assert.ok(imageDeleteIndex > -1, 'removing the shared image should delete the previously owned asset');
  assert.ok(imageDeleteIndex > lastMarkdownPutIndex, 'the owned image should only be deleted after every locale Markdown file is rewritten without it');
});

test('deleteBlogPost refreshes Identity, deletes all six locale Markdown files, then deletes the owned shared image', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore, 'es', 'expired-token');

  assert.equal(typeof store.deleteBlogPost, 'function', 'AdminStore should expose deleteBlogPost for the admin list');

  const previousWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  let refreshCalls = 0;

  globalThis.window = {
    netlifyIdentity: {
      currentUser: () => ({ id: 'editor' }),
      refresh: async () => {
        refreshCalls += 1;
        return 'fresh-delete-token';
      },
    },
  };

  const localePaths = getLocaleMarkdownPaths('mi-post');
  const { repositoryPath: imagePath } = getSharedImagePaths('mi-post', 'webp');

  globalThis.fetch = async (input, init = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), headers: init.headers ?? {}, body: init.body ?? null };
    fetchCalls.push(call);

    for (const filePath of Object.values(localePaths)) {
      if (call.url.includes(filePath)) {
        if (call.method === 'GET') return new Response(JSON.stringify({ sha: `${filePath}-sha` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (call.method === 'DELETE') return new Response(JSON.stringify({ commit: { sha: 'deleted' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (call.url.includes(imagePath)) {
      if (call.method === 'GET') return new Response(JSON.stringify({ sha: 'image-sha' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (call.method === 'DELETE') return new Response(JSON.stringify({ commit: { sha: 'deleted-image' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  };

  let result;
  try {
    result = await store.deleteBlogPost({ slug: 'mi-post', image: '/images/blog/mi-post.webp' });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }

  assert.equal(refreshCalls, 1, 'deleteBlogPost should refresh Netlify Identity before using Git Gateway');
  assert.ok(
    fetchCalls.every((call) => String(call.headers.Authorization ?? '').includes('fresh-delete-token')),
    'delete requests should use the refreshed Identity token',
  );

  const sequence = fetchCalls.map(getCallSummary);
  for (const filePath of Object.values(localePaths)) {
    assert.ok(
      sequence.includes(`DELETE /.netlify/git/github/contents/${filePath}`),
      `deleteBlogPost should delete the locale file at ${filePath}`,
    );
  }

  const lastLocaleDeleteIndex = Math.max(
    ...Object.values(localePaths).map((filePath) => sequence.indexOf(`DELETE /.netlify/git/github/contents/${filePath}`)),
  );
  const imageDeleteIndex = sequence.indexOf(`DELETE /.netlify/git/github/contents/${imagePath}`);
  assert.ok(imageDeleteIndex > lastLocaleDeleteIndex, 'the shared image should only be deleted after every locale Markdown file is deleted');

  assert.equal(normalizeDeleteResult(result).status, 'post-deleted', 'a fully successful delete should report the post-deleted status');
});

test('deleteBlogPost reports the remaining locale paths and skips image cleanup when a locale deletion fails partway through', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  const localePaths = getLocaleMarkdownPaths('mi-post');
  const { repositoryPath: imagePath } = getSharedImagePaths('mi-post', 'webp');

  const originalFetch = globalThis.fetch;
  const fetchCalls = [];

  globalThis.fetch = async (input, init = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), body: init.body ?? null };
    fetchCalls.push(call);

    if (call.url.includes(localePaths.fr) && call.method === 'DELETE') {
      return new Response(JSON.stringify({ message: 'Locale delete failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    for (const filePath of Object.values(localePaths)) {
      if (call.url.includes(filePath)) {
        if (call.method === 'GET') return new Response(JSON.stringify({ sha: `${filePath}-sha` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (call.method === 'DELETE') return new Response(JSON.stringify({ commit: { sha: 'deleted' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (call.url.includes(imagePath)) {
      return new Response(JSON.stringify({ commit: { sha: 'deleted-image' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  };

  let result;
  try {
    result = await store.deleteBlogPost({ slug: 'mi-post', image: '/images/blog/mi-post.webp' });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const normalized = normalizeDeleteResult(result);
  assert.notEqual(normalized.status, 'post-deleted', 'a partial locale-delete failure should not report the full-success status');
  assert.ok(
    normalized.remainingPaths.some((remainingPath) => remainingPath.includes(localePaths.fr)),
    'the partial-failure result should surface the still-remaining fr locale path',
  );

  const sequence = fetchCalls.map(getCallSummary);
  assert.equal(
    sequence.includes(`DELETE /.netlify/git/github/contents/${imagePath}`),
    false,
    'image cleanup should be skipped until every locale Markdown file has been deleted',
  );
});

// ---------------------------------------------------------------------------
// ADMIN UI
// ---------------------------------------------------------------------------

test('admin blog index mounts one grouped, client-loaded AdminBlogList row per translationKey and drops the static per-file loop', async () => {
  const [indexSource, listSource] = await Promise.all([
    readRequiredSource('src/pages/admin/blog/index.astro'),
    readOptionalSource('src/components/admin/AdminBlogList.tsx'),
  ]);

  assert.ok(listSource, 'src/components/admin/AdminBlogList.tsx should exist for the grouped admin blog archive');
  assert.match(indexSource, /import\s+AdminBlogList\s+from\s+['"].+AdminBlogList(?:\.tsx)?['"]/);
  assert.equal(
    countMatches(indexSource, /<AdminBlogList\b[^>]*client:load/g),
    1,
    'the admin blog index should mount exactly one client-loaded AdminBlogList',
  );
  assert.match(
    indexSource,
    /groupBlogPostsForAdmin\(/,
    'the admin index should group the fetched posts by translationKey before serializing them into AdminBlogList',
  );
  assert.match(indexSource, /JSON\.stringify\(/, 'the admin blog index should serialize the grouped posts for the client list');
  assert.doesNotMatch(indexSource, /posts\.map\(/, 'the Astro page should stop rendering post rows in a static per-file loop');

  assert.match(listSource, /translationKey/, 'AdminBlogList should key its rows on translationKey');
  assert.match(listSource, />\s*Editar\s*</, 'AdminBlogList should render a Spanish edit action');
  assert.match(listSource, />\s*Eliminar\s*</, 'AdminBlogList should render a Spanish delete action');
  assert.match(listSource, /confirm\((['"`])(?:(?!\1).)*eliminar(?:(?!\1).)*\1\)/i, 'AdminBlogList should confirm deletions in Spanish');
  assert.match(listSource, /deleteBlogPost/, 'AdminBlogList should call the store deleteBlogPost contract');
  assert.match(listSource, /set[A-Za-z]*Error\(/, 'AdminBlogList should surface inline deletion errors');
  assert.match(
    listSource,
    /set[A-Za-z]*Posts\(\(\w+\)\s*=>\s*\w+\.filter\(/,
    'AdminBlogList should remove a fully-deleted group row from local state',
  );

  const deleteHandlerWindow = extractWindowAround(listSource, 'deleteBlogPost');
  const deleteCallIndex = deleteHandlerWindow.search(/await\s+store\.deleteBlogPost/);
  const localRemovalIndex = deleteHandlerWindow.search(/set[A-Za-z]*Posts\(\(\w+\)\s*=>\s*\w+\.filter\(/);
  assert.ok(deleteCallIndex > -1, 'AdminBlogList delete flow should await the store contract');
  assert.ok(localRemovalIndex > deleteCallIndex, 'AdminBlogList should only remove the local row after the delete call resolves');
  assert.match(
    deleteHandlerWindow,
    /post-deleted|remainingPaths|status/i,
    'AdminBlogList should branch on the delete result status so a partial locale-delete failure keeps the row visible instead of always clearing it',
  );
});

test('BlogPostForm renders one panel per publicLanguagePicker locale, requiring title/description/tags/body per visible locale with shared slug/date/image controls', async () => {
  const source = await readRequiredSource('src/components/admin/BlogPostForm.tsx');

  assert.match(
    source,
    /mode:\s*['"]create['"]\s*\|\s*['"]edit['"]|type\s+\w+\s*=\s*\{[\s\S]*mode:\s*['"]create['"]\s*\|\s*['"]edit['"]/,
    'BlogPostForm should type its create/edit modes explicitly',
  );
  assert.match(
    source,
    /getPublicLanguagePicker\(\)|store\.getPublicLanguagePicker/,
    'BlogPostForm should derive its required translation panels from the public language picker instead of a fixed locale list',
  );
  assert.match(source, /translations/, 'BlogPostForm should keep a translations map keyed by locale');
  assert.match(source, /slug:\s*string/, 'BlogPostForm should keep the shared slug typed');
  assert.match(source, /date:\s*string/, 'BlogPostForm should keep the shared date typed');
  assert.match(source, /image\??:\s*string/, 'BlogPostForm should keep the shared image typed');
  assert.match(
    source,
    /readOnly=\{mode\s*===\s*['"]edit['"]\}/,
    'the shared slug field should be fixed/read-only during editing',
  );
  assert.match(source, /removeImage/, 'BlogPostForm should track explicit shared-image removal');
  assert.match(source, /featuredImageState/, 'BlogPostForm should keep the shared replacement image state');
  assert.match(source, /store\.createBlogPost/, 'create mode should call createBlogPost with the translations map');
  assert.match(source, /store\.updateBlogPost/, 'edit mode should call updateBlogPost with the translations map');
  assert.match(
    source,
    /mode\s*===\s*['"]create['"]|if\s*\(\s*mode\s*===\s*['"]edit['"]\s*\)/,
    'BlogPostForm submit handling should branch between create and edit mode',
  );
});

test('the admin blog edit route is keyed by translationKey, builds one static path per logical post, and serializes every locale translation into BlogPostForm', async () => {
  const editSource = await readOptionalSource('src/pages/admin/blog/edit/[translationKey].astro');

  assert.ok(editSource, 'src/pages/admin/blog/edit/[translationKey].astro should exist for the grouped admin blog editor');
  assert.match(editSource, /export\s+async\s+function\s+getStaticPaths\s*\(\)/, 'the edit route should define getStaticPaths');
  assert.match(editSource, /getCollection\(\s*['"]blog['"]\s*\)/, 'the edit route should read the blog collection');
  assert.match(
    editSource,
    /groupBlogPostsForAdmin\(/,
    'the edit route should build one static path per logical post using the shared admin grouping helper',
  );
  assert.match(
    editSource,
    /params:\s*\{\s*translationKey:/,
    'getStaticPaths should key each edit route on translationKey instead of a single locale slug',
  );
  assert.match(editSource, /slug:\s*/, 'the edit route should serialize the shared slug into the form props');
  assert.match(editSource, /date:\s*/, 'the edit route should serialize the shared date into the form props');
  assert.match(editSource, /image:\s*/, 'the edit route should serialize the shared image into the form props');
  assert.match(
    editSource,
    /translations:\s*/,
    'the edit route should serialize a translations map covering every locale (including hidden ones) into the form props',
  );
  assert.match(
    editSource,
    /<BlogPostForm\b[\s\S]*client:load[\s\S]*mode=(?:["']edit["']|\{'edit'\})[\s\S]*initial(?:Post|Values)=\{/,
    'the edit route should mount BlogPostForm in edit mode with serializable initial values',
  );
});
