import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

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

function createAdminStore(AdminStore, lang = 'es', token = 'stale-token') {
  const store = new AdminStore();
  store.init({ es: {}, en: {}, fr: {} }, {}, lang, token);
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

function assertMarkdownFields(markdown, { title, description, date, tags, lang, body, image }) {
  assert.match(markdown, new RegExp(`^title:\\s*${escapeRegExp(JSON.stringify(title))}$`, 'm'));
  assert.match(markdown, new RegExp(`^description:\\s*${escapeRegExp(JSON.stringify(description))}$`, 'm'));
  assert.match(markdown, new RegExp(`^date:\\s*${escapeRegExp(JSON.stringify(date))}$`, 'm'));
  assert.match(markdown, new RegExp(`^lang:\\s*${escapeRegExp(JSON.stringify(lang))}$`, 'm'));
  assert.match(
    markdown,
    new RegExp(`^tags:\\s*\\[[^\\]]*${tags.map((tag) => escapeRegExp(JSON.stringify(tag))).join('[^\\]]*')}[^\\]]*\\]$`, 'm'),
  );
  assert.ok(
    markdown.trimEnd().endsWith(body.trim()),
    'updated markdown should keep the edited body content intact',
  );

  if (image) {
    assert.match(markdown, new RegExp(`^image:\\s*${escapeRegExp(JSON.stringify(image))}$`, 'm'));
  } else {
    assert.doesNotMatch(markdown, /^image:/m);
  }
}

function getCallSummary(call) {
  return `${call.method} ${call.url}`;
}

function normalizeDeleteResult(result) {
  if (Array.isArray(result)) {
    return {
      status: String(result[0] ?? ''),
      message: String(result[1] ?? ''),
    };
  }

  if (result && typeof result === 'object') {
    return {
      status: String(result.status ?? result.result ?? result.outcome ?? ''),
      message: String(result.message ?? result.notice ?? result.detail ?? ''),
    };
  }

  if (typeof result === 'string') {
    return {
      status: result,
      message: result,
    };
  }

  return { status: '', message: '' };
}

function normalizeUpdatePath(result) {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    return String(result.path ?? result.markdownPath ?? result.filePath ?? '');
  }
  return '';
}

function extractWindowAround(source, needle, radius = 2200) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `source should include ${needle}`);
  return source.slice(Math.max(0, index - radius), Math.min(source.length, index + radius));
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

test('updateBlogPost validates required fields and approved admin locales before any repository write', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  assert.equal(typeof store.updateBlogPost, 'function', 'AdminStore should expose updateBlogPost for the edit flow');

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    fetchCalls.push({ input: String(input), init });
    return new Response(JSON.stringify({ message: 'Unexpected network call' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await assert.rejects(
      store.updateBlogPost({
        slug: 'mi-post',
        title: '   ',
        description: 'Descripción preservada',
        date: '2026-08-26',
        tags: ['seo'],
        lang: 'es',
        body: '# Cuerpo',
        currentImage: '/images/blog/mi-post.webp',
      }),
      /t[ií]tulo|obligatori/i,
      'editing should reject missing required fields',
    );

    await assert.rejects(
      store.updateBlogPost({
        slug: 'mi-post',
        title: 'Título válido',
        description: 'Descripción válida',
        date: '2026-08-26',
        tags: ['seo'],
        lang: 'de',
        body: '# Cuerpo',
        currentImage: '/images/blog/mi-post.webp',
      }),
      /ES,\s*EN\s*o\s*FR/i,
      'editing should reject non-admin locales at runtime',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(fetchCalls, [], 'invalid edit payloads should fail before any Git Gateway write');
});

test('updateBlogPost refreshes Identity, preserves the slug path, and keeps the existing image when no replacement is requested', async () => {
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
        return 'fresh-edit-token';
      },
    },
  };

  globalThis.fetch = async (input, init = {}) => {
    const call = {
      method: init.method ?? 'GET',
      url: String(input),
      headers: init.headers ?? {},
      body: init.body ?? null,
    };
    fetchCalls.push(call);

    if (call.method === 'GET' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ sha: 'existing-markdown-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'PUT' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ content: { sha: 'updated-markdown-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await store.updateBlogPost({
      slug: 'mi-post',
      title: 'Nuevo título editorial',
      description: 'Descripción actualizada',
      date: '2026-08-26',
      tags: ['seo', 'ugc'],
      lang: 'en',
      body: '# Nuevo cuerpo\n\nCon cambios.',
      currentImage: '/images/blog/mi-post.webp',
    });

    assert.equal(
      normalizeUpdatePath(result),
      'src/content/blog/mi-post.md',
      'edit mode should keep writing to the original markdown path instead of generating a new slug target',
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }

  assert.equal(refreshCalls, 1, 'editing should refresh Netlify Identity before touching Git Gateway');
  assert.deepEqual(
    fetchCalls.map(getCallSummary),
    [
      'GET /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'PUT /.netlify/git/github/contents/src/content/blog/mi-post.md',
    ],
    'editing without a replacement image should only read and rewrite the original markdown file',
  );
  assert.ok(
    fetchCalls.every((call) => String(call.headers.Authorization ?? '').includes('fresh-edit-token')),
    'edit requests should use the refreshed Identity token',
  );

  const markdownPayload = decodeRepositoryPayload(fetchCalls.at(-1)?.body);
  assert.equal(markdownPayload.sha, 'existing-markdown-sha', 'markdown updates should include the fetched sha');
  assertNonEmptyRepositoryMessage(markdownPayload, 'markdown updates should include a commit message');
  assertMarkdownFields(markdownPayload.markdown, {
    title: 'Nuevo título editorial',
    description: 'Descripción actualizada',
    date: '2026-08-26',
    tags: ['seo', 'ugc'],
    lang: 'en',
    body: '# Nuevo cuerpo\n\nCon cambios.',
    image: '/images/blog/mi-post.webp',
  });
});

test('updateBlogPost removes image frontmatter and deletes only the old owned image after the markdown update succeeds', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  assert.equal(typeof store.updateBlogPost, 'function', 'AdminStore should expose updateBlogPost for the edit flow');

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const call = {
      method: init.method ?? 'GET',
      url: String(input),
      body: init.body ?? null,
    };
    fetchCalls.push(call);

    if (call.method === 'GET' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ sha: 'existing-markdown-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'PUT' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ content: { sha: 'updated-markdown-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'GET' && call.url.includes('public/images/blog/mi-post.webp')) {
      return new Response(JSON.stringify({ sha: 'old-owned-image-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'DELETE' && call.url.includes('public/images/blog/mi-post.webp')) {
      return new Response(JSON.stringify({ commit: { sha: 'deleted-image-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await store.updateBlogPost({
      slug: 'mi-post',
      title: 'Post sin imagen',
      description: 'Eliminar portada antigua',
      date: '2026-08-26',
      tags: ['seo'],
      lang: 'es',
      body: '# Sin imagen',
      currentImage: '/images/blog/mi-post.webp',
      removeImage: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(
    fetchCalls.map(getCallSummary),
    [
      'GET /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'PUT /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'GET /.netlify/git/github/contents/public/images/blog/mi-post.webp',
      'DELETE /.netlify/git/github/contents/public/images/blog/mi-post.webp',
    ],
    'owned image cleanup should happen only after the markdown update succeeds',
  );

  const markdownPayload = decodeRepositoryPayload(fetchCalls[1].body);
  assert.equal(markdownPayload.sha, 'existing-markdown-sha');
  assertMarkdownFields(markdownPayload.markdown, {
    title: 'Post sin imagen',
    description: 'Eliminar portada antigua',
    date: '2026-08-26',
    tags: ['seo'],
    lang: 'es',
    body: '# Sin imagen',
    image: null,
  });

  const imageDeletePayload = JSON.parse(String(fetchCalls[3].body));
  assert.equal(imageDeletePayload.sha, 'old-owned-image-sha', 'owned image deletes should include the fetched sha');
  assertNonEmptyRepositoryMessage(imageDeletePayload, 'owned image deletes should include a commit message');
});

test('updateBlogPost uploads replacement images before rewriting markdown and never deletes shared paths', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  assert.equal(typeof store.updateBlogPost, 'function', 'AdminStore should expose updateBlogPost for the edit flow');

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const call = {
      method: init.method ?? 'GET',
      url: String(input),
      body: init.body ?? null,
    };
    fetchCalls.push(call);

    if (call.method === 'GET' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ sha: 'existing-markdown-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'GET' && call.url.includes('public/images/blog/mi-post.png')) {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'PUT' && call.url.includes('public/images/blog/mi-post.png')) {
      return new Response(JSON.stringify({ content: { sha: 'replacement-image-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'PUT' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ content: { sha: 'updated-markdown-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await store.updateBlogPost({
      slug: 'mi-post',
      title: 'Portada nueva',
      description: 'Reemplazo sin tocar assets compartidos',
      date: '2026-08-26',
      tags: ['seo', 'brand'],
      lang: 'fr',
      body: '# Portada nueva',
      currentImage: '/images/shared/brand-banner.webp',
      featuredImage: new File(['replacement'], 'mi-post.png', { type: 'image/png' }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const sequence = fetchCalls.map(getCallSummary);
  const replacementPutIndex = sequence.findIndex((entry) => entry === 'PUT /.netlify/git/github/contents/public/images/blog/mi-post.png');
  const markdownPutIndex = sequence.findIndex((entry) => entry === 'PUT /.netlify/git/github/contents/src/content/blog/mi-post.md');

  assert.ok(replacementPutIndex > -1, 'replacement edits should upload the new owned image');
  assert.ok(markdownPutIndex > replacementPutIndex, 'replacement uploads should complete before the markdown rewrite');
  assert.equal(
    sequence.filter((entry) => entry.startsWith('DELETE /.netlify/git/github/contents/')).length,
    0,
    'shared or non-owned images should never be deleted during replacement edits',
  );

  const markdownPayload = decodeRepositoryPayload(fetchCalls[markdownPutIndex].body);
  assertMarkdownFields(markdownPayload.markdown, {
    title: 'Portada nueva',
    description: 'Reemplazo sin tocar assets compartidos',
    date: '2026-08-26',
    tags: ['seo', 'brand'],
    lang: 'fr',
    body: '# Portada nueva',
    image: '/images/blog/mi-post.png',
  });
});

test('deleteBlogPost refreshes Identity, deletes markdown first, then deletes only the owned image with sha-backed payloads', async () => {
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

  globalThis.fetch = async (input, init = {}) => {
    const call = {
      method: init.method ?? 'GET',
      url: String(input),
      headers: init.headers ?? {},
      body: init.body ?? null,
    };
    fetchCalls.push(call);

    if (call.method === 'GET' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ sha: 'markdown-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'DELETE' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ commit: { sha: 'deleted-markdown-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'GET' && call.url.includes('public/images/blog/mi-post.webp')) {
      return new Response(JSON.stringify({ sha: 'image-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'DELETE' && call.url.includes('public/images/blog/mi-post.webp')) {
      return new Response(JSON.stringify({ commit: { sha: 'deleted-image-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  let result;
  try {
    result = await store.deleteBlogPost({
      slug: 'mi-post',
      image: '/images/blog/mi-post.webp',
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }

  const normalizedResult = normalizeDeleteResult(result);
  assert.equal(refreshCalls, 1, 'deleteBlogPost should refresh Netlify Identity before using Git Gateway');
  assert.deepEqual(
    fetchCalls.map(getCallSummary),
    [
      'GET /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'DELETE /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'GET /.netlify/git/github/contents/public/images/blog/mi-post.webp',
      'DELETE /.netlify/git/github/contents/public/images/blog/mi-post.webp',
    ],
    'post deletion should remove markdown first, then clean up the owned featured image',
  );
  assert.ok(
    fetchCalls.every((call) => String(call.headers.Authorization ?? '').includes('fresh-delete-token')),
    'delete requests should use the refreshed Identity token',
  );

  const markdownDeletePayload = JSON.parse(String(fetchCalls[1].body));
  assert.equal(markdownDeletePayload.sha, 'markdown-sha', 'markdown deletes should include the fetched sha');
  assertNonEmptyRepositoryMessage(markdownDeletePayload, 'markdown deletes should include a commit message');

  const imageDeletePayload = JSON.parse(String(fetchCalls[3].body));
  assert.equal(imageDeletePayload.sha, 'image-sha', 'owned image deletes should include the fetched sha');
  assertNonEmptyRepositoryMessage(imageDeletePayload, 'owned image deletes should include a commit message');

  assert.equal(normalizedResult.status, 'post-deleted', 'successful deletes should report a distinct post-deleted result');
});

test('deleteBlogPost treats a missing owned image as a successful post deletion and skips shared image cleanup entirely', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  assert.equal(typeof store.deleteBlogPost, 'function', 'AdminStore should expose deleteBlogPost for the admin list');

  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  globalThis.fetch = async (input, init = {}) => {
    const call = {
      method: init.method ?? 'GET',
      url: String(input),
      body: init.body ?? null,
    };
    fetchCalls.push(call);

    if (call.method === 'GET' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ sha: 'markdown-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'DELETE' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ commit: { sha: 'deleted-markdown-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'GET' && call.url.includes('public/images/blog/mi-post.webp')) {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  let missingOwnedImageResult;
  let sharedImageResult;
  try {
    missingOwnedImageResult = await store.deleteBlogPost({
      slug: 'mi-post',
      image: '/images/blog/mi-post.webp',
    });

    sharedImageResult = await store.deleteBlogPost({
      slug: 'mi-post',
      image: '/images/shared/brand-banner.webp',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(
    fetchCalls.map(getCallSummary),
    [
      'GET /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'DELETE /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'GET /.netlify/git/github/contents/public/images/blog/mi-post.webp',
      'GET /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'DELETE /.netlify/git/github/contents/src/content/blog/mi-post.md',
    ],
    'owned image cleanup should tolerate 404s, while shared image paths should be skipped entirely',
  );
  assert.equal(normalizeDeleteResult(missingOwnedImageResult).status, 'post-deleted');
  assert.equal(normalizeDeleteResult(sharedImageResult).status, 'post-deleted');
});

test('deleteBlogPost returns a distinct Spanish partial-success result when image cleanup fails after the markdown deletion', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = createAdminStore(AdminStore);

  assert.equal(typeof store.deleteBlogPost, 'function', 'AdminStore should expose deleteBlogPost for the admin list');

  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  globalThis.fetch = async (input, init = {}) => {
    const call = {
      method: init.method ?? 'GET',
      url: String(input),
      body: init.body ?? null,
    };
    fetchCalls.push(call);

    if (call.method === 'GET' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ sha: 'markdown-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'DELETE' && call.url.includes('src/content/blog/mi-post.md')) {
      return new Response(JSON.stringify({ commit: { sha: 'deleted-markdown-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'GET' && call.url.includes('public/images/blog/mi-post.webp')) {
      return new Response(JSON.stringify({ sha: 'image-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (call.method === 'DELETE' && call.url.includes('public/images/blog/mi-post.webp')) {
      return new Response(JSON.stringify({ message: 'Image cleanup failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${call.method} ${call.url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  let result;
  try {
    result = await store.deleteBlogPost({
      slug: 'mi-post',
      image: '/images/blog/mi-post.webp',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const normalizedResult = normalizeDeleteResult(result);
  assert.deepEqual(
    fetchCalls.map(getCallSummary),
    [
      'GET /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'DELETE /.netlify/git/github/contents/src/content/blog/mi-post.md',
      'GET /.netlify/git/github/contents/public/images/blog/mi-post.webp',
      'DELETE /.netlify/git/github/contents/public/images/blog/mi-post.webp',
    ],
    'partial-success cleanup should still delete the markdown before attempting image cleanup',
  );
  assert.equal(
    normalizedResult.status,
    'image-cleanup-failed',
    'image cleanup failures should report a distinct partial-success status instead of a total delete failure',
  );
  assert.match(
    normalizedResult.message,
    /entrada|post/i,
    'partial-success delete feedback should mention that the post was deleted',
  );
  assert.match(
    normalizedResult.message,
    /imagen|destacad/i,
    'partial-success delete feedback should mention the image cleanup problem in Spanish',
  );
  assert.doesNotMatch(
    normalizedResult.message,
    /could not delete|failed to delete/i,
    'partial-success delete feedback should stay localized instead of falling back to English total-failure copy',
  );
});

test('admin blog index mounts one client-loaded AdminBlogList seeded with serialized posts and drops the static post loop', async () => {
  const [indexSource, listSource] = await Promise.all([
    readRequiredSource('src/pages/admin/blog/index.astro'),
    readOptionalSource('src/components/admin/AdminBlogList.tsx'),
  ]);

  assert.ok(listSource, 'src/components/admin/AdminBlogList.tsx should exist for the admin blog CRUD contract');
  assert.match(indexSource, /import\s+AdminBlogList\s+from\s+['"].+AdminBlogList(?:\.tsx)?['"]/);
  assert.equal(
    countMatches(indexSource, /<AdminBlogList\b[^>]*client:load/g),
    1,
    'the admin blog index should mount exactly one client-loaded AdminBlogList',
  );
  assert.match(indexSource, /JSON\.stringify\(/, 'the admin blog index should serialize the server-fetched posts for the client list');
  assert.match(
    indexSource,
    /<AdminBlogList\b[\s\S]*(posts|initialPosts|postsJson)=\{[A-Za-z_$][\w$]*\}/,
    'the admin blog index should seed AdminBlogList with serialized post data',
  );
  assert.doesNotMatch(indexSource, /posts\.map\(/, 'the Astro page should stop rendering the post rows in a static loop');

  assert.match(listSource, />\s*Editar\s*</, 'AdminBlogList should render a Spanish edit action');
  assert.match(listSource, />\s*Eliminar\s*</, 'AdminBlogList should render a Spanish delete action');
  assert.match(listSource, /confirm\((['"`])(?:(?!\1).)*eliminar(?:(?!\1).)*\1\)/i, 'AdminBlogList should confirm deletions in Spanish');
  assert.match(listSource, /deleteBlogPost/, 'AdminBlogList should call the store deleteBlogPost contract');
  assert.match(listSource, /set[A-Za-z]*Error\(/, 'AdminBlogList should surface inline deletion errors');
  assert.match(
    listSource,
    /set[A-Za-z]*Posts\(\(\w+\)\s*=>\s*\w+\.filter\(/,
    'AdminBlogList should remove deleted rows from local state after a successful delete',
  );

  const deleteHandlerWindow = extractWindowAround(listSource, 'deleteBlogPost');
  const deleteCallIndex = deleteHandlerWindow.search(/await\s+store\.deleteBlogPost/);
  const localRemovalIndex = deleteHandlerWindow.search(/set[A-Za-z]*Posts\(\(\w+\)\s*=>\s*\w+\.filter\(/);
  assert.ok(deleteCallIndex > -1, 'AdminBlogList delete flow should await the store contract');
  assert.ok(
    localRemovalIndex > deleteCallIndex,
    'AdminBlogList should only remove the local row after the post deletion succeeds',
  );
});

test('admin edit route exists, builds static paths for every post, and passes serializable edit data into BlogPostForm', async () => {
  const editSource = await readOptionalSource('src/pages/admin/blog/edit/[slug].astro');

  assert.ok(editSource, 'src/pages/admin/blog/edit/[slug].astro should exist for admin blog editing');
  assert.match(editSource, /export\s+async\s+function\s+getStaticPaths\s*\(\)/, 'the edit route should define getStaticPaths');
  assert.match(editSource, /getCollection\(\s*['"]blog['"]\s*\)/, 'the edit route should read the blog collection');
  assert.match(
    editSource,
    /params:\s*\{\s*slug:\s*post\.id\s*\}/,
    'getStaticPaths should create one edit route per blog slug',
  );
  assert.match(editSource, /slug:\s*post\.id/, 'the edit route should serialize the original slug into the form props');
  assert.match(editSource, /title:\s*post\.data\.title/, 'the edit route should serialize the current title');
  assert.match(editSource, /description:\s*post\.data\.description/, 'the edit route should serialize the current description');
  assert.match(editSource, /date:\s*[\s\S]*post\.data\.date/, 'the edit route should serialize the current date');
  assert.match(editSource, /tags:\s*post\.data\.tags/, 'the edit route should serialize the current tags');
  assert.match(editSource, /lang:\s*post\.data\.lang/, 'the edit route should serialize the current language');
  assert.match(editSource, /body:\s*(?:post\.body|body)/, 'the edit route should serialize the markdown body');
  assert.match(editSource, /image:\s*post\.data\.image/, 'the edit route should serialize the featured image');
  assert.match(
    editSource,
    /<BlogPostForm\b[\s\S]*client:load[\s\S]*mode=(?:["']edit["']|\{'edit'\})[\s\S]*initial(?:Post|Values)=\{/,
    'the edit route should mount BlogPostForm in edit mode with serializable initial values',
  );
});

test('BlogPostForm supports typed create/edit modes, prefilled edit state, fixed edit slugs, image keep-replace-remove controls, and create/update branching without failure resets', async () => {
  const source = await readRequiredSource('src/components/admin/BlogPostForm.tsx');

  assert.match(
    source,
    /mode:\s*['"]create['"]\s*\|\s*['"]edit['"]|type\s+\w+\s*=\s*\{[\s\S]*mode:\s*['"]create['"]\s*\|\s*['"]edit['"]/,
    'BlogPostForm should type its create/edit modes explicitly',
  );
  assert.match(source, /initial(?:Post|Values)\??:/, 'BlogPostForm should accept serializable initial edit data');
  assert.match(source, /slug:\s*string/, 'BlogPostForm edit data should include the original slug');
  assert.match(source, /title:\s*string/, 'BlogPostForm edit data should include the current title');
  assert.match(source, /description:\s*string/, 'BlogPostForm edit data should include the current description');
  assert.match(source, /date:\s*string/, 'BlogPostForm edit data should include the current date');
  assert.match(source, /tags:\s*(?:string\[\]|readonly string\[\])/, 'BlogPostForm edit data should include the current tags');
  assert.match(source, /lang:\s*AdminBlogLang/, 'BlogPostForm edit data should keep admin locale typing');
  assert.match(source, /body:\s*string/, 'BlogPostForm edit data should include the current body');
  assert.match(source, /image\??:\s*string/, 'BlogPostForm edit data should include the current image path');

  assert.match(source, /useState\(\(\)\s*=>\s*initial(?:Post|Values)\?\.title\s*\?\?/, 'edit mode should prefill the title');
  assert.match(source, /useState\(\(\)\s*=>\s*initial(?:Post|Values)\?\.description\s*\?\?/, 'edit mode should prefill the description');
  assert.match(source, /useState\(\(\)\s*=>\s*initial(?:Post|Values)\?\.date\s*\?\?/, 'edit mode should prefill the date');
  assert.match(source, /useState\(\(\)\s*=>\s*initial(?:Post|Values)\?\.body\s*\?\?/, 'edit mode should prefill the body');
  assert.match(
    source,
    /mode\s*===\s*['"]edit['"]\s*\?\s*initial(?:Post|Values)\.slug\s*:\s*slugify\(title\)/,
    'edit mode should keep the original slug instead of regenerating it from the edited title',
  );
  assert.match(
    source,
    /readOnly=\{mode\s*===\s*['"]edit['"]\}/,
    'the slug field should be fixed/read-only during editing',
  );
  assert.match(source, /removeImage/, 'BlogPostForm should track explicit image removal in edit mode');
  assert.match(source, /featuredImageState/, 'BlogPostForm should keep replacement image state');
  assert.match(source, /initial(?:Post|Values)\?\.image/, 'BlogPostForm should preserve the current image when no replacement is selected');
  assert.match(source, /store\.createBlogPost/, 'create mode should still call createBlogPost');
  assert.match(source, /store\.updateBlogPost/, 'edit mode should call updateBlogPost');
  assert.match(
    source,
    /mode\s*===\s*['"]create['"]|if\s*\(\s*mode\s*===\s*['"]edit['"]\s*\)/,
    'BlogPostForm submit handling should branch between create and edit mode',
  );
  assert.doesNotMatch(
    source,
    /catch\s*\([^)]*\)\s*\{[\s\S]{0,800}(?:setTitle\(''\)|setDescription\(''\)|setTags\(''\)|setBody\(|clearBlogImagePreviewState\()/s,
    'BlogPostForm should not clear edit/create fields from the failure branch',
  );
  assert.doesNotMatch(
    source,
    /finally\s*\{[\s\S]{0,800}(?:setTitle\(''\)|setDescription\(''\)|setTags\(''\)|setBody\(|clearBlogImagePreviewState\()/s,
    'BlogPostForm should not reset fields from finally before success is known',
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
