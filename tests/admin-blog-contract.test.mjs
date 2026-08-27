import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

test('admin blog creation stays scoped to approved ES/EN/FR locales', async () => {
  const [formSource, storeSource] = await Promise.all([
    readSource('src/components/admin/BlogPostForm.tsx'),
    readSource('src/components/admin/adminStore.ts'),
  ]);

  assert.match(
    storeSource,
    /export const SUPPORTED_LANGS = \['es', 'en', 'fr', 'de', 'it', 'ca'\] as const;/,
    'adminStore should keep the full public locale list available',
  );
  assert.match(
    storeSource,
    /export const ADMIN_BLOG_LANGS = \['es', 'en', 'fr'\] as const;/,
    'adminStore should define the approved admin blog locale subset for the BlogPostForm language selector',
  );
  assert.match(
    storeSource,
    /const visibleLocales = this\.getPublicLanguagePicker\(\);/,
    'createBlogPost should derive its required visible locales from the live publicLanguagePicker instead of a fixed admin locale gate',
  );

  assert.match(
    formSource,
    /store\.getPublicLanguagePicker\(\)/,
    'BlogPostForm should derive its visible locale tabs from the live publicLanguagePicker instead of a fixed AdminBlogLang selector',
  );
  assert.doesNotMatch(
    formSource,
    /ADMIN_BLOG_LANGS\.map\(\(locale\)\s*=>/,
    'BlogPostForm should not render the language picker from the fixed ADMIN_BLOG_LANGS list once the picker is dynamic',
  );
  assert.match(
    formSource,
    /Deutsch|Italiano|Català/,
    'BlogPostForm should be able to offer DE, IT, or CA blog panels once the publicLanguagePicker exposes them',
  );
});

test('createBlogPost retry-upserts an already-partially-written slug across every locale file instead of duplicate-rejecting it, and BlogPostForm only clears fields on success', async () => {
  const [{ AdminStore }, formSource] = await Promise.all([
    import('../src/components/admin/adminStore.ts'),
    readSource('src/components/admin/BlogPostForm.tsx'),
  ]);

  const store = new AdminStore();
  store.init({ es: {}, en: {}, fr: {} }, {}, 'en', 'publish-token');

  const localePaths = {
    es: 'src/content/blog/mi-primer-post/es.md',
    en: 'src/content/blog/mi-primer-post/en.md',
    fr: 'src/content/blog/mi-primer-post/fr.md',
    de: 'src/content/blog/mi-primer-post/de.md',
    it: 'src/content/blog/mi-primer-post/it.md',
    ca: 'src/content/blog/mi-primer-post/ca.md',
  };

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const method = init.method ?? 'GET';
    fetchCalls.push({ method, input: String(input), body: init.body ?? null });

    if (method === 'GET' && String(input).includes(localePaths.es)) {
      return new Response(JSON.stringify({ sha: 'existing-post-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET') {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ content: { sha: 'written-sha' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  let translationKey;
  try {
    translationKey = await store.createBlogPost({
      slug: 'mi-primer-post',
      date: '2025-08-01',
      translations: {
        es: { title: 'Hola mundo', description: 'Reintento seguro', tags: ['ugc'], body: '# Hola mundo' },
        en: { title: 'Hello world', description: 'Localized duplicate retry attempt', tags: ['ugc'], body: '# Hello world' },
        fr: { title: 'Bonjour le monde', description: 'Nouvelle tentative sécurisée', tags: ['ugc'], body: '# Bonjour le monde' },
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    translationKey,
    'mi-primer-post',
    'retrying create on an already-partially-written slug should upsert instead of throwing a duplicate-slug error',
  );

  const esPut = fetchCalls.find((call) => call.method === 'PUT' && call.input.includes(localePaths.es));
  assert.ok(esPut, 'the existing ES locale file should be upserted, not duplicate-rejected');
  assert.equal(
    JSON.parse(esPut.body ?? '{}').sha,
    'existing-post-sha',
    'the existing ES locale sha should be reused for a safe retry-upsert instead of erroring on duplicate detection',
  );

  assert.match(
    formSource,
    /catch \(submitError\) \{\s*setError\(submitError instanceof Error \? submitError\.message : [\s\S]{0,80}?'No se pudo crear la entrada\.'[\s\S]{0,10}?\);/,
    'BlogPostForm should surface createBlogPost errors to the admin UI',
  );
  assert.match(
    formSource,
    /setSuccessPath\(path\);\s*setTranslations\(createInitialTranslationsMap\(visibleLocales\)\);\s*setDate\(getDefaultDate\(\)\);/s,
    'BlogPostForm should keep form input intact on failure and only clear fields after a successful create',
  );
});

test('createBlogPost refreshes Identity before using Git Gateway after a long editing session', async () => {
  const { AdminStore } = await import('../src/components/admin/adminStore.ts');
  const store = new AdminStore();
  store.init({ es: {}, en: {}, fr: {} }, {}, 'es', 'expired-token');

  const previousWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  let refreshCalls = 0;
  const fetchCalls = [];
  globalThis.window = {
    netlifyIdentity: {
      currentUser: () => ({ id: 'editor' }),
      refresh: async () => {
        refreshCalls += 1;
        return 'fresh-blog-token';
      },
    },
  };
  globalThis.fetch = async (input, init = {}) => {
    const call = { input: String(input), init };
    fetchCalls.push(call);
    if (String(init.headers?.Authorization ?? '') !== 'Bearer fresh-blog-token') {
      return new Response(JSON.stringify({ message: 'This endpoint requires a valid bearer token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!init.method || init.method === 'GET') {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ content: { sha: 'created-post-sha' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const translationKey = await store.createBlogPost({
      slug: 'fresh-session-post',
      date: '2026-08-26',
      translations: {
        es: { title: 'Fresh session', description: 'Token refresh regression', tags: ['admin'], body: '# Fresh session' },
        en: { title: 'Fresh session EN', description: 'Token refresh regression EN', tags: ['admin'], body: '# Fresh session EN' },
        fr: { title: 'Fresh session FR', description: 'Token refresh regression FR', tags: ['admin'], body: '# Fresh session FR' },
      },
    });
    assert.equal(translationKey, 'fresh-session-post');
  } finally {
    globalThis.fetch = originalFetch;
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }

  assert.equal(refreshCalls, 1);
  assert.ok(
    fetchCalls.every((call) => String(call.init.headers?.Authorization ?? '') === 'Bearer fresh-blog-token'),
    'blog reads and writes should use the refreshed token',
  );
});
