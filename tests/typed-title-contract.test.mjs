import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { addAttribute, escapeHTML } from 'astro/runtime/server/index.js';
import {
  TYPED_VISIBLE_ATTRIBUTE,
  createTypedTitleState,
  initAllTypedTitles,
  resetAllTypedTitles,
} from '../src/lib/typedTitleRuntime.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

test('TypedTitle forces plain-text Typed.js mode and keeps ampersand titles intact in SSR markup', async () => {
  const source = await readSource('src/components/TypedTitle.astro');

  assert.match(source, /data-typed-text=\{text\}/);
  assert.match(source, /<span class="typed-title__reserve">\{text\}<\/span>/);
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
    '<span class="typed-title">',
    `<span class="typed-title__reserve">${escapedTitle}</span>`,
    '<span class="typed-title__visual" data-typed-title-visual data-typed-visible="" aria-hidden="true"></span>',
    '<span class="typed-title__cursor" aria-hidden="true"></span>',
    '</span>',
    '</h1>',
  ].join('');

  assert.match(ssrMarkup, /Translation &amp; SEO/);
  assert.doesNotMatch(ssrMarkup, /Translation & SEO/);
});

test('TypedTitle keeps its heading text exactly once so search engines read the title, not three copies of it', async () => {
  const source = await readSource('src/components/TypedTitle.astro');

  // The only text inside the heading is the reserve copy (with its accent word).
  assert.doesNotMatch(source, /<span class="sr-only">\{text\}<\/span>/, 'no screen-reader-only duplicate of the title');
  assert.doesNotMatch(source, /class="typed-title" aria-hidden/, 'the reserve copy stays in the accessibility tree');
  assert.match(
    source,
    /<span class="typed-title__visual" data-typed-title-visual data-typed-visible="" aria-hidden="true"><\/span>/,
    'the animated layer holds no text of its own',
  );
  assert.match(source, /<span class="typed-title__cursor" aria-hidden="true"><\/span>/, 'the cursor holds no text of its own');

  // The animation and the cursor are painted with CSS generated content.
  assert.match(source, /attr:\s*TYPED_VISIBLE_ATTRIBUTE/);
  assert.match(source, /\.typed-title__visual::before\s*\{\s*content:\s*attr\(data-typed-visible\);\s*\}/);
  assert.match(source, /\.typed-title__cursor::before\s*\{\s*content:\s*'_';\s*\}/);

  // The reserve is hidden only while typing, and never with visibility (that would drop it for screen readers).
  assert.match(source, /\[data-typed-title-state='typing'\] \.typed-title__reserve,[^{]*\{\s*color:\s*transparent;\s*\}/s);
  assert.doesNotMatch(source, /\.typed-title__reserve\s*\{[^}]*visibility:\s*hidden/s);
});

test('load titles finished statically under reduced motion clear completion and start typing when full motion returns', () => {
  const state = createTypedTitleState();
  const visual = {
    attributes: { [TYPED_VISIBLE_ATTRIBUTE]: 'Original' },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  const root = {
    dataset: {
      typedText: 'Translation & SEO',
      typedTrigger: 'load',
    },
    querySelector(selector) {
      return selector === '[data-typed-title-visual]' ? visual : null;
    },
  };
  const scope = {
    querySelectorAll(selector) {
      return selector === '[data-typed-title]' ? [root] : [];
    },
  };

  initAllTypedTitles(scope, {
    state,
    mediaMatches: true,
    createTyped() {
      throw new Error('reduced-motion load should finish statically without Typed.js');
    },
    createObserver() {
      throw new Error('load trigger should not create an observer');
    },
  });

  assert.equal(root.dataset.typedTitleComplete, 'true');
  assert.equal(root.dataset.typedTitleState, undefined, 'reduced motion shows the heading text itself');

  const typedStarts = [];
  resetAllTypedTitles(scope, state);
  initAllTypedTitles(scope, {
    state,
    mediaMatches: false,
    createTyped(rootArg, element, options) {
      typedStarts.push({ rootArg, element, options });
      return {
        destroy() {},
      };
    },
    createObserver() {
      throw new Error('load trigger should not create an observer');
    },
  });

  assert.equal(root.dataset.typedTitleComplete, undefined);
  assert.equal(root.dataset.typedTitleState, 'typing');
  assert.equal(visual.attributes[TYPED_VISIBLE_ATTRIBUTE], '');
  assert.equal(typedStarts.length, 1);
  assert.equal(typedStarts[0].rootArg, root);
  assert.equal(typedStarts[0].element, visual);
  assert.equal(typedStarts[0].options.text, 'Translation & SEO');
  assert.equal(typedStarts[0].options.trigger, 'load');
});

test('finishing the typing shows the heading text again and reset clears the typed letters', () => {
  const state = createTypedTitleState();
  const visual = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  const root = {
    dataset: { typedText: 'Translation & SEO', typedTrigger: 'load' },
    querySelector(selector) {
      return selector === '[data-typed-title-visual]' ? visual : null;
    },
  };
  const scope = {
    querySelectorAll(selector) {
      return selector === '[data-typed-title]' ? [root] : [];
    },
  };

  let complete;
  initAllTypedTitles(scope, {
    state,
    mediaMatches: false,
    createTyped(_root, _element, options) {
      complete = options.onComplete;
      return { destroy() {} };
    },
    createObserver() {
      throw new Error('load trigger should not create an observer');
    },
  });

  assert.equal(root.dataset.typedTitleState, 'typing');
  visual.setAttribute(TYPED_VISIBLE_ATTRIBUTE, 'Translation & SEO');
  complete();
  assert.equal(root.dataset.typedTitleState, undefined);
  assert.equal(root.dataset.typedTitleComplete, 'true');

  resetAllTypedTitles(scope, state);
  assert.equal(visual.attributes[TYPED_VISIBLE_ATTRIBUTE], '');
  assert.equal(root.dataset.typedTitleComplete, undefined);
});
