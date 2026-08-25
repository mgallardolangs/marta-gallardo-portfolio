import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const articlePagesByLocale = {
  es: 'src/pages/blog/[slug].astro',
  en: 'src/pages/en/blog/[slug].astro',
  fr: 'src/pages/fr/blog/[slug].astro',
  de: 'src/pages/de/blog/[slug].astro',
  it: 'src/pages/it/blog/[slug].astro',
  ca: 'src/pages/ca/blog/[slug].astro',
};

async function readSource(relativePath) {
  try {
    return await readFile(path.join(rootDir, relativePath), 'utf8');
  } catch (error) {
    assert.fail(`${relativePath} should exist for the approved Blog editorial contract: ${error.message}`);
  }
}

async function importModule(relativePath) {
  try {
    return await import(pathToFileURL(path.join(rootDir, relativePath)).href);
  } catch (error) {
    assert.fail(`${relativePath} should export the approved Blog editorial helpers: ${error.message}`);
  }
}

function extractWindowAround(source, needle, label, radius = 2600) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${label} should include ${needle}`);
  return source.slice(Math.max(0, index - radius), Math.min(source.length, index + radius));
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function getOutlineChildren(entry) {
  if (Array.isArray(entry?.children)) return entry.children;
  if (Array.isArray(entry?.items)) return entry.items;
  return [];
}

function getOutlineLabel(entry) {
  return String(entry?.text ?? entry?.title ?? entry?.label ?? entry?.name ?? '');
}

function getOutlineNumber(entry) {
  return String(entry?.number ?? entry?.index ?? entry?.marker ?? entry?.counter ?? '');
}

function getOutlineId(entry) {
  const raw = entry?.id ?? entry?.slug ?? entry?.anchor ?? entry?.href ?? '';
  return String(raw).replace(/^#/, '');
}

function normalizeOutline(outline) {
  assert.ok(Array.isArray(outline), 'outline should be an array');

  return outline.map((entry) => ({
    text: getOutlineLabel(entry),
    number: getOutlineNumber(entry),
    id: getOutlineId(entry),
    children: getOutlineChildren(entry).map((child) => ({
      text: getOutlineLabel(child),
      number: getOutlineNumber(child),
      id: getOutlineId(child),
    })),
  }));
}

function normalizeInsertedMarkdown(result) {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    return String(result.text ?? result.value ?? result.nextValue ?? result.markdown ?? '');
  }
  return '';
}

function normalizeInsertedSelection(result) {
  if (!result || typeof result !== 'object') {
    return { start: -1, end: -1 };
  }

  const start = result.selectionStart ?? result.start ?? result.selection?.start ?? -1;
  const end = result.selectionEnd ?? result.end ?? result.selection?.end ?? -1;
  return { start, end };
}

test('BlogIndexPage keeps the approved hero, latest-story, archive, and empty-row editorial contract', async () => {
  const source = await readSource('src/views/BlogIndexPage.astro');

  assert.match(source, /data-blog-hero/, 'BlogIndexPage should expose a stable editorial hero marker');
  assert.match(source, /i\.blog\.eyebrow/, 'BlogIndexPage should render the localized editorial eyebrow');
  assert.match(source, /i\.blog\.subtitle/, 'BlogIndexPage should render the localized editorial subtitle');
  assert.match(source, /<TypedTitle\b[\s\S]*text=\{i\.blog\.title\}/, 'BlogIndexPage should keep the localized TypedTitle hero');
  assert.match(source, /data-blog-latest-story/, 'BlogIndexPage should expose a stable latest-story marker');
  assert.match(source, /data-blog-archive/, 'BlogIndexPage should expose a stable archive marker');
  assert.match(source, /i\.blog\.latestStory/, 'BlogIndexPage should label the newest feature with the latestStory copy key');
  assert.match(source, /i\.blog\.archive/, 'BlogIndexPage should label the archive with the archive copy key');
  assert.match(source, /lg:grid-cols-\[1\.05fr_0\.95fr\]/, 'BlogIndexPage should keep the approved 1.05 / 0.95 latest-story split');
  assert.match(source, /aspect-\[16\/10\]/, 'BlogIndexPage latest feature should keep the approved 16:10 landscape frame');
  assert.match(source, /i\.blog\.comingSoonTitle/, 'BlogIndexPage should render the localized archive empty-row title');
  assert.match(source, /i\.blog\.comingSoonMeta/, 'BlogIndexPage should render the localized archive empty-row meta');
  assert.match(source, /\{\s*latest\s*&&\s*\(/, 'BlogIndexPage should make the latest feature optional inside the persistent editorial shell');
  assert.match(source, /String\(latest\s*\?\s*2\s*:\s*1\)\.padStart\(2,\s*['"]0['"]\)/, 'BlogIndexPage should reuse the approved archive placeholder row even when there is no latest story');
  assert.doesNotMatch(source, /\{\s*(?:post|latest)\s*\?\s*\(/, 'BlogIndexPage should not hide the archive shell when the latest story is null');
  assert.doesNotMatch(source, /i\.blog\.emptyState/, 'BlogIndexPage should replace the old emptyState paragraph with the editorial archive row');

  const latestBlock = extractWindowAround(source, 'data-blog-latest-story', 'BlogIndexPage latest-story block');
  assert.ok(
    countMatches(latestBlock, /href=\{/g) >= 3,
    'latest story should keep separate clickable image, title, and read-link targets to the article route',
  );
});

test('blog article routes use rendered heading data and the shared BlogArticleLayout shell', async () => {
  const layoutSource = await readSource('src/components/BlogArticleLayout.astro');
  const routeSources = await Promise.all(
    Object.entries(articlePagesByLocale).map(async ([locale, relativePath]) => [locale, relativePath, await readSource(relativePath)]),
  );

  assert.match(layoutSource, /data-blog-article/, 'BlogArticleLayout should expose a stable article marker');
  assert.match(layoutSource, /i\.blog\.contentIndex/, 'BlogArticleLayout should render the localized contentIndex heading');
  assert.match(layoutSource, /i\.blog\.readTime/, 'BlogArticleLayout should render the localized readTime label');
  assert.match(layoutSource, /i\.blog\.nextStory/, 'BlogArticleLayout should render the localized nextStory label');
  assert.match(layoutSource, /i\.blog\.end/, 'BlogArticleLayout should render the localized end marker');
  assert.match(layoutSource, /<BlogTableOfContents\b/, 'BlogArticleLayout should render the shared BlogTableOfContents component');
  assert.match(layoutSource, /nextPost\s*\?/, 'BlogArticleLayout should branch between next-story and back-to-blog navigation');
  assert.match(layoutSource, /getLocalizedPath\('\/blog',\s*lang\)/, 'BlogArticleLayout should fall back to the localized blog archive when no next story exists');

  for (const [locale, relativePath, source] of routeSources) {
    assert.match(source, /const\s+\{\s*Content\s*,\s*headings\s*\}\s*=\s*await\s+render\(post\)/, `${relativePath} should keep Astro render(post) heading data for ${locale}`);
    assert.match(source, /<BlogArticleLayout\b/, `${relativePath} should render the shared BlogArticleLayout component for ${locale}`);
    assert.match(source, /headings=\{headings\}/, `${relativePath} should pass rendered headings into the shared article layout for ${locale}`);
    assert.doesNotMatch(source, /<article class="bg-paper">/, `${relativePath} should no longer inline the old bespoke article shell for ${locale}`);
  }
});

test('BlogTableOfContents keeps sticky desktop navigation, mobile chips, active-state tracking, and nested H2/H3 numbering', async () => {
  const tocSource = await readSource('src/components/BlogTableOfContents.tsx');
  const { decodeBlogHash } = await importModule('src/lib/blogTableOfContents.ts');

  assert.match(tocSource, /heading\.depth\s*===\s*2|heading\.level\s*===\s*2/, 'BlogTableOfContents should treat H2 headings as top-level entries');
  assert.match(tocSource, /heading\.depth\s*===\s*3|heading\.level\s*===\s*3/, 'BlogTableOfContents should treat H3 headings as nested entries');
  assert.match(tocSource, /padStart\(2,\s*['"]0['"]\)/, 'BlogTableOfContents should zero-pad H2 numbering (01, 02, ...)');
  assert.match(tocSource, /\$\{[^}]+\}\.\$\{[^}]+\}/, 'BlogTableOfContents should render nested numbering for H3 entries (02.1, 02.2, ...)');
  assert.match(tocSource, /href=\{`#\$\{[^}]+\}`\}|href=\{['"]#\$\{[^}]+\}['"]\}/, 'BlogTableOfContents links should target the rendered heading ids');
  assert.match(tocSource, /IntersectionObserver|addEventListener\(\s*['"]scroll['"]/, 'BlogTableOfContents should track the active heading while scrolling');
  assert.match(tocSource, /aria-current|data-active/, 'BlogTableOfContents should expose an active-state contract');
  assert.match(tocSource, /sticky/, 'BlogTableOfContents should stay sticky on desktop');
  assert.match(tocSource, /overflow-x-auto/, 'BlogTableOfContents should expose mobile horizontal chips');
  assert.match(tocSource, /decodeBlogHash/, 'BlogTableOfContents should route location hashes through the shared decodeBlogHash helper before activating a heading');

  assert.equal(typeof decodeBlogHash, 'function', 'src/lib/blogTableOfContents.ts should export decodeBlogHash(hash, validIds)');
  assert.equal(
    decodeBlogHash('#qu%C3%A9-tal', ['qué-tal', 'otra-seccion']),
    'qué-tal',
    'decodeBlogHash should decode encoded accented heading ids before matching them',
  );
  assert.doesNotThrow(
    () => decodeBlogHash('#qu%E0%A4%A', ['qu%E0%A4%A']),
    'decodeBlogHash should swallow malformed URI fragments instead of throwing',
  );
  assert.equal(
    decodeBlogHash('#qu%E0%A4%A', ['qu%E0%A4%A']),
    'qu%E0%A4%A',
    'decodeBlogHash should fall back to the raw fragment when decoding fails but the raw heading id is valid',
  );
  assert.equal(
    decodeBlogHash('#unknown-heading', ['qué-tal', 'otra-seccion']),
    null,
    'decodeBlogHash should ignore hashes that do not correspond to a rendered heading id',
  );
});

test('blog outline helpers stay pure for H2/H3 parsing and markdown heading insertion', async () => {
  const { parseMarkdownOutline, insertMarkdownHeading } = await importModule('src/lib/blogOutline.ts');

  assert.equal(typeof parseMarkdownOutline, 'function', 'src/lib/blogOutline.ts should export parseMarkdownOutline(markdown)');
  assert.equal(typeof insertMarkdownHeading, 'function', 'src/lib/blogOutline.ts should export insertMarkdownHeading(text, selectionStart, selectionEnd, level)');

  const outline = normalizeOutline(parseMarkdownOutline(`# Title\n\n## Primer bloque\nTexto.\n\n### Detalle A\nMás texto.\n\n#### Ignorado\n\n## Segundo bloque\n\n### Detalle B\n`));
  assert.deepEqual(
    outline,
    [
      {
        text: 'Primer bloque',
        number: '01',
        id: 'primer-bloque',
        children: [
          {
            text: 'Detalle A',
            number: '01.1',
            id: 'detalle-a',
          },
        ],
      },
      {
        text: 'Segundo bloque',
        number: '02',
        id: 'segundo-bloque',
        children: [
          {
            text: 'Detalle B',
            number: '02.1',
            id: 'detalle-b',
          },
        ],
      },
    ],
    'parseMarkdownOutline should keep only H2/H3 headings with nested numbering and stable ids',
  );

  const insertedH2 = normalizeInsertedMarkdown(insertMarkdownHeading('Intro\n\nBody', 0, 5, 2));
  const insertedH3 = normalizeInsertedMarkdown(insertMarkdownHeading('Intro\n\nBody', 7, 11, 3));
  const blankHeading = insertMarkdownHeading('', 0, 0, 2);
  const retaggedHeading = insertMarkdownHeading('## Existing title\n\nBody', 3, 17, 3);

  assert.match(insertedH2, /^##\s+Intro\b/m, 'insertMarkdownHeading should promote the selected text to an H2 heading');
  assert.match(insertedH3, /\n###\s+Body\b/m, 'insertMarkdownHeading should promote the selected text to an H3 heading');
  assert.deepEqual(
    blankHeading,
    {
      markdown: '## Section title',
      selectionStart: 3,
      selectionEnd: 16,
    },
    'insertMarkdownHeading should preserve the blank-textarea placeholder contract and select the placeholder text',
  );
  assert.equal(
    normalizeInsertedMarkdown(retaggedHeading),
    '### Existing title\n\nBody',
    'insertMarkdownHeading should keep existing heading lines as single standalone heading lines when changing depth',
  );
  assert.deepEqual(
    normalizeInsertedSelection(retaggedHeading),
    { start: 4, end: 18 },
    'insertMarkdownHeading should return the inserted heading text selection range for existing heading lines',
  );
});

test('admin blog list and new-post shell keep the strict editorial chrome with no rounded or pastel cards', async () => {
  const [indexSource, newSource] = await Promise.all([
    readSource('src/pages/admin/blog/index.astro'),
    readSource('src/pages/admin/blog/new.astro'),
  ]);

  assert.match(indexSource, /Admin\s*·\s*Blog/, 'admin blog index should keep the approved editorial header');
  assert.match(indexSource, /Archivo de posts/, 'admin blog index should call the list Archivo de posts');
  assert.match(indexSource, /\+\s*Nuevo post/, 'admin blog index should keep the rectangular + Nuevo post action');
  assert.match(indexSource, /index\s*\+\s*1|padStart\(2,\s*['"]0['"]\)/, 'admin blog rows should keep explicit numbering');
  assert.doesNotMatch(indexSource, /rounded(?:-[^\s"']+)?/, 'admin blog index should not use rounded list chrome');
  assert.doesNotMatch(indexSource, /shadow(?:-[^\s"']+)?/, 'admin blog index should not use shadowed cards');
  assert.doesNotMatch(indexSource, /bg-white|bg-paper/, 'admin blog index rows should not fall back to pastel card backgrounds');

  assert.match(newSource, /Admin\s*—\s*New post|Admin\s*[·—-]\s*Nuevo post/, 'admin new-post page should keep the editorial admin heading');
  assert.match(newSource, /<BlogPostForm\b/, 'admin new-post page should continue to mount BlogPostForm');
});

test('BlogPostForm adds featured-image upload, H2/H3/bold/link toolbar controls, and a live outline panel', async () => {
  const source = await readSource('src/components/admin/BlogPostForm.tsx');

  assert.match(source, /type=["']file["']/, 'BlogPostForm should expose a featured-image file input');
  assert.match(source, /accept=["'][^"']*image\/(?:jpeg|png|webp|gif)/, 'BlogPostForm file input should limit uploads to JPEG, PNG, WebP, and GIF');
  assert.match(source, />\s*H2 Section\s*</, 'BlogPostForm should expose an H2 Section toolbar action');
  assert.match(source, />\s*H3 Subsection\s*</, 'BlogPostForm should expose an H3 Subsection toolbar action');
  assert.match(source, />\s*Bold\s*</, 'BlogPostForm should expose a Bold toolbar action');
  assert.match(source, />\s*Link\s*</, 'BlogPostForm should expose a Link toolbar action');
  assert.match(source, /parseMarkdownOutline/, 'BlogPostForm should parse a live markdown outline while typing');
  assert.match(source, /insertMarkdownHeading/, 'BlogPostForm should use the shared heading insertion helper');
  assert.match(source, /lg:grid-cols-\[1\.35fr_0\.65fr\]/, 'BlogPostForm should keep the approved textarea / outline desktop split');
  assert.match(source, /outline/i, 'BlogPostForm should render a visible live outline panel');
  assert.doesNotMatch(source, /rounded(?:-[^\s"']+)?/, 'BlogPostForm should switch to square editorial controls');
});

test('createBlogPost rejects invalid featured images before network writes', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = new AdminStore();
  store.init({ es: {}, en: {}, fr: {} }, {}, 'es', 'publish-token');

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    fetchCalls.push(`${init.method ?? 'GET'} ${String(input)}`);
    return new Response(JSON.stringify({ content: { sha: 'unexpected' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await assert.rejects(
      store.createBlogPost({
        slug: 'editorial-feature',
        title: 'Editorial feature',
        description: 'Blog validation contract',
        date: '2026-08-22',
        tags: ['blog'],
        lang: 'es',
        body: '# Editorial feature',
        featuredImage: new File(['svg'], 'feature.svg', { type: 'image/svg+xml' }),
      }),
      /JPEG|PNG|WebP|GIF/i,
      'createBlogPost should reject unsupported featured image types before any network request',
    );

    await assert.rejects(
      store.createBlogPost({
        slug: 'editorial-feature-oversized',
        title: 'Editorial feature oversized',
        description: 'Blog validation contract',
        date: '2026-08-22',
        tags: ['blog'],
        lang: 'es',
        body: '# Editorial feature',
        featuredImage: new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'feature.webp', { type: 'image/webp' }),
      }),
      /2\s*MB|2097152/i,
      'createBlogPost should reject featured images larger than 2 MB before any network request',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(fetchCalls, [], 'image validation should fail before any Git Gateway fetch call');
});

test('createBlogPost uploads the featured asset first, writes public image frontmatter, and keeps markdown second', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = new AdminStore();
  store.init({ es: {}, en: {}, fr: {} }, {}, 'es', 'publish-token');

  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const method = init.method ?? 'GET';
    const url = String(input);
    calls.push({ method, url, body: init.body ?? null });

    if (method === 'GET' && url.includes('src/content/blog/editorial-feature.md')) {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET' && url.includes('public/images/blog/editorial-feature.webp')) {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT' && url.includes('public/images/blog/editorial-feature.webp')) {
      return new Response(JSON.stringify({ content: { sha: 'image-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT' && url.includes('src/content/blog/editorial-feature.md')) {
      return new Response(JSON.stringify({ content: { sha: 'markdown-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${method} ${url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const createdPath = await store.createBlogPost({
      slug: 'editorial-feature',
      title: 'Editorial feature',
      description: 'Blog upload ordering contract',
      date: '2026-08-22',
      tags: ['blog'],
      lang: 'es',
      body: '# Editorial feature',
      featuredImage: new File(['image-binary'], 'editorial-feature.webp', { type: 'image/webp' }),
    });

    assert.equal(createdPath, 'src/content/blog/editorial-feature.md', 'createBlogPost should still resolve to the markdown path');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.url}`),
    [
      'GET /.netlify/git/github/contents/src/content/blog/editorial-feature.md',
      'GET /.netlify/git/github/contents/public/images/blog/editorial-feature.webp',
      'PUT /.netlify/git/github/contents/public/images/blog/editorial-feature.webp',
      'PUT /.netlify/git/github/contents/src/content/blog/editorial-feature.md',
    ],
    'createBlogPost should check the duplicate slug first, upload the featured asset, and only then create the markdown file',
  );

  const markdownPut = calls.find((call) => call.method === 'PUT' && call.url.includes('src/content/blog/editorial-feature.md'));
  assert.ok(markdownPut?.body, 'createBlogPost should write markdown content');

  const payload = JSON.parse(String(markdownPut.body));
  const markdown = Buffer.from(payload.content, 'base64').toString('utf8');

  assert.match(markdown, /^image:\s*["']\/images\/blog\/editorial-feature\.webp["']$/m, 'created markdown frontmatter should include the public featured image path');
});

test('createBlogPost reuses an orphaned featured image on retry by upserting with the fetched sha before creating markdown', async () => {
  const { AdminStore } = await importModule('src/components/admin/adminStore.ts');
  const store = new AdminStore();
  store.init({ es: {}, en: {}, fr: {} }, {}, 'es', 'publish-token');

  const calls = [];
  let imageShaAvailable = false;
  let markdownAttempt = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const method = init.method ?? 'GET';
    const url = String(input);
    const body = init.body ?? null;
    calls.push({ method, url, body });

    if (method === 'GET' && url.includes('src/content/blog/retry-feature.md')) {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET' && url.includes('public/images/blog/retry-feature.webp')) {
      if (!imageShaAvailable) {
        return new Response(JSON.stringify({ message: 'Not Found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ sha: 'orphan-image-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT' && url.includes('public/images/blog/retry-feature.webp')) {
      imageShaAvailable = true;
      return new Response(JSON.stringify({ content: { sha: 'saved-image-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT' && url.includes('src/content/blog/retry-feature.md')) {
      markdownAttempt += 1;

      if (markdownAttempt === 1) {
        return new Response(JSON.stringify({ message: 'Simulated markdown failure' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ content: { sha: 'markdown-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: `Unexpected ${method} ${url}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await assert.rejects(
      store.createBlogPost({
        slug: 'retry-feature',
        title: 'Retry feature',
        description: 'First attempt leaves the image behind',
        date: '2026-08-24',
        tags: ['blog'],
        lang: 'es',
        body: '# Retry feature',
        featuredImage: new File(['retry-image'], 'retry-feature.webp', { type: 'image/webp' }),
      }),
      /Simulated markdown failure/,
      'the first publish attempt should expose the markdown failure after the image upload succeeds',
    );

    const createdPath = await store.createBlogPost({
      slug: 'retry-feature',
      title: 'Retry feature',
      description: 'Second attempt should reuse the existing image',
      date: '2026-08-24',
      tags: ['blog'],
      lang: 'es',
      body: '# Retry feature',
      featuredImage: new File(['retry-image'], 'retry-feature.webp', { type: 'image/webp' }),
    });

    assert.equal(createdPath, 'src/content/blog/retry-feature.md');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.url}`),
    [
      'GET /.netlify/git/github/contents/src/content/blog/retry-feature.md',
      'GET /.netlify/git/github/contents/public/images/blog/retry-feature.webp',
      'PUT /.netlify/git/github/contents/public/images/blog/retry-feature.webp',
      'PUT /.netlify/git/github/contents/src/content/blog/retry-feature.md',
      'GET /.netlify/git/github/contents/src/content/blog/retry-feature.md',
      'GET /.netlify/git/github/contents/public/images/blog/retry-feature.webp',
      'PUT /.netlify/git/github/contents/public/images/blog/retry-feature.webp',
      'PUT /.netlify/git/github/contents/src/content/blog/retry-feature.md',
    ],
    'retrying should still check the markdown slug first, then upsert the orphaned image before retrying the markdown create',
  );

  const imagePuts = calls.filter((call) => call.method === 'PUT' && call.url.includes('public/images/blog/retry-feature.webp'));
  assert.equal(imagePuts.length, 2, 'the featured image should be written once per attempt');

  const firstImagePayload = JSON.parse(String(imagePuts[0].body));
  const secondImagePayload = JSON.parse(String(imagePuts[1].body));
  assert.equal(firstImagePayload.sha, undefined, 'the first image create should not include a sha when the file does not exist yet');
  assert.equal(secondImagePayload.sha, 'orphan-image-sha', 'the retry image upsert should include the fetched sha so the orphan asset can be safely reused');
});

test('Blog Task 1 protects the approved Home, UGC, and Translation source contracts', async () => {
  const [homeSource, ugcSource, translationSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/views/UgcPage.astro'),
    readSource('src/views/TranslationSeoPage.astro'),
  ]);

  assert.match(homeSource, /data-home-orbit/, 'Home should keep the approved orbit section marker untouched');
  assert.match(ugcSource, /data-ugc-hero/, 'UGC should keep the approved editorial hero marker untouched');
  assert.match(ugcSource, /i\.ugcPage\.contactSheet\.headline/, 'UGC should keep the approved contact sheet copy contract untouched');
  assert.match(translationSource, /data-translation-page/, 'Translation should keep the approved page shell marker untouched');
  assert.doesNotMatch(translationSource, /page\.heroMark/, 'Translation should stop rendering the hidden hero mark while keeping the rest of the shell untouched');
  assert.match(translationSource, /page\.methodologyDisplayTitle/, 'Translation should keep the approved methodology display title untouched');
});
