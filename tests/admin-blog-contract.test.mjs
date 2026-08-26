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
    'adminStore should define the approved admin blog locale subset',
  );
  assert.match(
    storeSource,
    /lang:\s*AdminBlogLang;/,
    'createBlogPost should type blog locales as AdminBlogLang',
  );
  assert.match(
    storeSource,
    /if \(!isAdminBlogLang\(post\.lang\)\) \{\s*throw new Error\('Las entradas de blog solo se pueden crear en ES, EN o FR\.'\);\s*\}/s,
    'createBlogPost should reject non-admin blog locales at runtime',
  );

  assert.match(
    formSource,
    /useState<AdminBlogLang>/,
    'BlogPostForm should keep its local language state scoped to AdminBlogLang',
  );
  assert.match(
    formSource,
    /ADMIN_BLOG_LANGS\.map\(\(locale\) => \(/,
    'BlogPostForm should render the language picker from the approved admin locale list',
  );
  assert.doesNotMatch(
    formSource,
    /Deutsch|Italiano|Català/,
    'BlogPostForm should not offer DE, IT, or CA blog creation options',
  );
});

test('createBlogPost rejects duplicate slug targets before writing and BlogPostForm only clears fields on success', async () => {
  const [{ AdminStore }, formSource] = await Promise.all([
    import('../src/components/admin/adminStore.ts'),
    readSource('src/components/admin/BlogPostForm.tsx'),
  ]);

  const store = new AdminStore();
  store.init({ es: {}, en: {}, fr: {} }, {}, 'en', 'publish-token');

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    fetchCalls.push({ input: String(input), init });

    if (String(input).includes('src/content/blog/mi-primer-post.md')) {
      return new Response(JSON.stringify({ sha: 'existing-post-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ content: { sha: 'unexpected-write' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await assert.rejects(
      store.createBlogPost({
        slug: 'mi-primer-post',
        title: 'Hello world',
        description: 'Localized duplicate attempt',
        date: '2025-08-01',
        tags: ['ugc'],
        lang: 'en',
        body: '# Hello world',
      }),
      /already exists/i,
      'same slug in another locale should still be rejected when it resolves to the same content path',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(
    fetchCalls.map((call) => `${call.init?.method ?? 'GET'} ${call.input}`),
    ['GET /.netlify/git/github/contents/src/content/blog/mi-primer-post.md'],
    'duplicate slug detection should stop before any PUT overwrite attempt',
  );
  assert.match(
    formSource,
    /catch \(submitError\) \{\s*setError\(submitError instanceof Error \? submitError\.message : 'No se pudo crear la entrada\.'\);\s*\}/s,
    'BlogPostForm should surface createBlogPost errors to the admin UI',
  );
  assert.match(
    formSource,
    /setSuccessPath\(path\);\s*setTitle\(''\);\s*setDescription\(''\);\s*setTags\(''\);\s*setBody\('# Nuevo post\\n\\nEscribe aquí\.\.\.'\);/s,
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
    const createdPath = await store.createBlogPost({
      slug: 'fresh-session-post',
      title: 'Fresh session',
      description: 'Token refresh regression',
      date: '2026-08-26',
      tags: ['admin'],
      lang: 'es',
      body: '# Fresh session',
    });
    assert.equal(createdPath, 'src/content/blog/fresh-session-post.md');
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
