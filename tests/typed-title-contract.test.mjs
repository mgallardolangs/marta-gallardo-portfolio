import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { addAttribute, escapeHTML } from 'astro/runtime/server/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

test('TypedTitle forces plain-text Typed.js mode and keeps ampersand titles intact in SSR markup', async () => {
  const source = await readSource('src/components/TypedTitle.astro');

  assert.match(source, /data-typed-text=\{text\}/);
  assert.match(source, /<span class="sr-only">\{text\}<\/span>/);
  assert.match(source, /<span class="typed-title__reserve">\{text\}<\/span>/);
  assert.match(source, /<span class="typed-title__visual" data-typed-title-visual>\{text\}<\/span>/);
  assert.match(source, /<span class="typed-title__cursor" aria-hidden="true">_<\/span>/);
  assert.match(
    source,
    /contentType:\s*['"]null['"]/,
    'TypedTitle must opt Typed.js into plain-text mode so &, <, and admin-authored text are never typed as HTML',
  );
  assert.match(source, /showCursor:\s*false/);
  assert.doesNotMatch(source, /cursorChar:/);

  const ampersandTitle = 'Translation & SEO';
  const escapedTitle = escapeHTML(ampersandTitle);
  const ssrMarkup = [
    `<h1${String(addAttribute(ampersandTitle, 'data-typed-text'))}>`,
    `<span class="sr-only">${escapedTitle}</span>`,
    '<span class="typed-title" aria-hidden="true">',
    `<span class="typed-title__reserve">${escapedTitle}</span>`,
    `<span class="typed-title__visual" data-typed-title-visual>${escapedTitle}</span>`,
    '<span class="typed-title__cursor" aria-hidden="true">_</span>',
    '</span>',
    '</h1>',
  ].join('');

  assert.match(ssrMarkup, /Translation &amp; SEO/);
  assert.doesNotMatch(ssrMarkup, /Translation & SEO/);
});
