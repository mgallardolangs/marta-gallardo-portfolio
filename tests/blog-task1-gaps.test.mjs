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
    assert.fail(`${relativePath} should exist for the approved Blog Task 1 contract: ${error.message}`);
  }
}

async function importModule(relativePath) {
  try {
    return await import(pathToFileURL(path.join(rootDir, relativePath)).href);
  } catch (error) {
    assert.fail(`${relativePath} should export the approved Blog Task 1 helpers: ${error.message}`);
  }
}

function extractWindowAround(source, needle, label, radius = 2400) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${label} should include ${needle}`);
  return source.slice(Math.max(0, index - radius), Math.min(source.length, index + radius));
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

test('BlogArticleLayout keeps stable shared markers for the approved header, feature image, and TOC/prose body shell', async () => {
  const layoutSource = await readSource('src/components/BlogArticleLayout.astro');

  assert.match(layoutSource, /data-blog-article-header/, 'BlogArticleLayout should expose a stable header marker');
  const headerBlock = extractWindowAround(layoutSource, 'data-blog-article-header', 'BlogArticleLayout header block');
  assert.match(headerBlock, /getLocalizedPath\('\/blog',\s*lang\)|i\.blog\.backToList/, 'the header marker should include the back-to-blog link');
  assert.match(headerBlock, /<time\b/, 'the header marker should include the article date');
  assert.match(headerBlock, /tags\.map|post\.data\.tags\.map/, 'the header marker should include the article tags');
  assert.match(headerBlock, /<h1\b/, 'the header marker should include the article title');
  assert.match(headerBlock, /post\.data\.description/, 'the header marker should include the article summary');

  assert.match(layoutSource, /post\.data\.image\s*\?/, 'BlogArticleLayout should branch between featured-image and fallback states');
  assert.ok(
    countMatches(layoutSource, /data-blog-feature-image/g) >= 2,
    'BlogArticleLayout should expose a stable featured-image marker in both image and fallback states',
  );
  const imageBlock = extractWindowAround(layoutSource, 'data-blog-feature-image', 'BlogArticleLayout featured-image block');
  assert.match(imageBlock, /<img\b/, 'the featured-image marker should render an image branch');
  assert.match(imageBlock, /aspect-\[16\/9\]/, 'the featured-image marker should keep the exact 16:9 landscape class');
  assert.match(imageBlock, /max-w-\[850px\]/, 'the featured-image marker should keep the approved maximum image width class');

  assert.match(layoutSource, /data-blog-article-body/, 'BlogArticleLayout should expose a stable body marker');
  const bodyBlock = extractWindowAround(layoutSource, 'data-blog-article-body', 'BlogArticleLayout body block');
  assert.match(bodyBlock, /<BlogTableOfContents\b/, 'the body marker should wrap the shared table of contents');
  assert.match(bodyBlock, /<slot\s*\/>/, 'the body marker should render the article Content through the shared slot');
  assert.match(bodyBlock, /prose/, 'the body marker should keep the prose content column');
  assert.match(bodyBlock, /lg:grid-cols-\[190px_minmax\(0,650px\)\]/, 'the body marker should keep the exact TOC/body desktop width classes');
  assert.match(bodyBlock, /max-w-\[650px\]/, 'the body marker should keep the approved readable body width class');
});

test('all localized blog article routes slot rendered Content through BlogArticleLayout instead of inlining the prose shell', async () => {
  const routeSources = await Promise.all(
    Object.entries(articlePagesByLocale).map(async ([locale, relativePath]) => [locale, relativePath, await readSource(relativePath)]),
  );

  for (const [locale, relativePath, source] of routeSources) {
    assert.match(
      source,
      /const\s+\{\s*Content\s*,\s*headings\s*\}\s*=\s*await\s+render\(post\)/,
      `${relativePath} should keep render(post) Content + headings for ${locale}`,
    );
    assert.match(
      source,
      /<BlogArticleLayout\b[\s\S]*headings=\{headings\}[\s\S]*>\s*<Content\s*\/>\s*<\/BlogArticleLayout>/,
      `${relativePath} should pass the rendered Content through the shared BlogArticleLayout slot for ${locale}`,
    );
    assert.doesNotMatch(
      source,
      /<div class="prose prose-lg/,
      `${relativePath} should not keep the old inline prose wrapper once BlogArticleLayout owns the body shell for ${locale}`,
    );
  }
});

test('applyBlogToolbarAction returns the next markdown and selection contract for H2, H3, bold, and link toolbar actions', async () => {
  const { applyBlogToolbarAction } = await importModule('src/lib/blogPostFormState.ts');

  assert.equal(typeof applyBlogToolbarAction, 'function', 'src/lib/blogPostFormState.ts should export applyBlogToolbarAction(markdown, selection, action)');

  const h2 = applyBlogToolbarAction('Intro\n\nSection title\n\nBody', { start: 7, end: 20 }, 'h2');
  assert.deepEqual(
    h2,
    {
      markdown: 'Intro\n\n## Section title\n\nBody',
      selection: { start: 10, end: 23 },
    },
    'H2 toolbar action should prefix the current selection and return the next selection range',
  );

  const h3 = applyBlogToolbarAction('Intro\n\nSection title\n\nBody', { start: 7, end: 20 }, 'h3');
  assert.deepEqual(
    h3,
    {
      markdown: 'Intro\n\n### Section title\n\nBody',
      selection: { start: 11, end: 24 },
    },
    'H3 toolbar action should prefix the current selection and return the next selection range',
  );

  const bold = applyBlogToolbarAction('Need focus now', { start: 5, end: 10 }, 'bold');
  assert.deepEqual(
    bold,
    {
      markdown: 'Need **focus** now',
      selection: { start: 7, end: 12 },
    },
    'Bold toolbar action should wrap the current selection and keep the text selected inside the Markdown markers',
  );

  const link = applyBlogToolbarAction('Read more', { start: 0, end: 9 }, 'link');
  assert.match(link.markdown, /^\[Read more\]\(https:\/\/[^)]*\)$/, 'Link toolbar action should wrap the selection in valid Markdown link syntax');
  const urlStart = link.markdown.indexOf('https://');
  const urlEnd = link.markdown.lastIndexOf(')');
  assert.deepEqual(
    link.selection,
    { start: urlStart, end: urlEnd },
    'Link toolbar action should move the next selection onto the URL placeholder for immediate editing',
  );
});

test('blog image preview helpers create preview state, clean up object URLs, and BlogPostForm exposes the stable preview + handler contract', async () => {
  const formSource = await readSource('src/components/admin/BlogPostForm.tsx');

  assert.match(formSource, /applyBlogToolbarAction/, 'BlogPostForm should use the shared toolbar helper instead of inline string mutations');
  assert.match(formSource, /selectionStart|setSelectionRange/, 'BlogPostForm should wire toolbar results back into the textarea selection');
  assert.match(formSource, /createBlogImagePreviewState/, 'BlogPostForm should use a shared image-preview state helper');
  assert.match(formSource, /clearBlogImagePreviewState/, 'BlogPostForm should use a shared image-preview cleanup helper');
  assert.match(formSource, /data-blog-image-preview/, 'BlogPostForm should render a stable featured-image preview marker');

  const { createBlogImagePreviewState, clearBlogImagePreviewState } = await importModule('src/lib/blogPostFormState.ts');

  assert.equal(typeof createBlogImagePreviewState, 'function', 'src/lib/blogPostFormState.ts should export createBlogImagePreviewState(file, createObjectURL)');
  assert.equal(typeof clearBlogImagePreviewState, 'function', 'src/lib/blogPostFormState.ts should export clearBlogImagePreviewState(state, revokeObjectURL)');

  const previewFile = new File(['image-binary'], 'editorial-cover.webp', { type: 'image/webp' });
  const createdFiles = [];
  const revokedUrls = [];
  const previewState = createBlogImagePreviewState(previewFile, (file) => {
    createdFiles.push(file.name);
    return 'blob:editorial-cover-preview';
  });

  assert.equal(previewState.file, previewFile, 'image-preview helper should keep the selected file in state');
  assert.equal(previewState.previewUrl, 'blob:editorial-cover-preview', 'image-preview helper should keep the created preview URL in state');
  assert.deepEqual(createdFiles, ['editorial-cover.webp'], 'image-preview helper should create the preview URL from the selected file');

  const clearedState = clearBlogImagePreviewState(previewState, (url) => {
    revokedUrls.push(url);
  });

  assert.deepEqual(
    clearedState,
    { file: null, previewUrl: '' },
    'image-preview cleanup helper should reset the preview state after the file is cleared',
  );
  assert.deepEqual(revokedUrls, ['blob:editorial-cover-preview'], 'image-preview cleanup helper should revoke the object URL exactly once');
});

test('BlogPostForm forwards the selected featuredImage file to createBlogPost and only clears that state after success', async () => {
  const formSource = await readSource('src/components/admin/BlogPostForm.tsx');
  const createCallBlock = extractWindowAround(
    formSource,
    'const path = await store.createBlogPost({',
    'BlogPostForm createBlogPost payload block',
    1400,
  );

  assert.match(
    createCallBlock,
    /featuredImage:\s*(featuredImage(?:State)?(?:\.file)?|imagePreview(?:State)?\.file)/,
    'BlogPostForm should pass the selected featured-image state/file as featuredImage in the createBlogPost payload',
  );

  assert.match(
    createCallBlock,
    /setSuccessPath\(path\);[\s\S]*?(setFeaturedImage(?:State)?|setImagePreview(?:State)?)\([\s\S]*?clearBlogImagePreviewState/,
    'BlogPostForm should clear the selected featured-image state only after createBlogPost succeeds',
  );

  const catchIndex = formSource.indexOf('} catch');
  assert.notEqual(catchIndex, -1, 'BlogPostForm submit flow should keep an explicit catch block for failed blog creation');
  const finallyIndex = formSource.indexOf('} finally');
  assert.notEqual(finallyIndex, -1, 'BlogPostForm submit flow should keep an explicit finally block for submission cleanup');
  const catchBlock = formSource.slice(catchIndex, finallyIndex);
  const finallyBlock = formSource.slice(finallyIndex);

  assert.doesNotMatch(
    catchBlock,
    /clearBlogImagePreviewState|setFeaturedImage(?:State)?\(|setImagePreview(?:State)?\(/,
    'BlogPostForm should preserve the selected featured-image state when createBlogPost fails',
  );
  assert.doesNotMatch(
    finallyBlock,
    /clearBlogImagePreviewState|setFeaturedImage(?:State)?\(|setImagePreview(?:State)?\(/,
    'BlogPostForm should not clear featured-image state from the finally block before success is known',
  );
});
