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

test('public UGC hero keeps the denser approved two-column source contract', async () => {
  const source = await readSource('src/views/UgcPage.astro');

  assert.match(source, /<section data-ugc-hero class="px-6 pt-20 pb-5 md:pt-24 md:pb-6">/);
  assert.match(source, /<p class="text-xs font-semibold uppercase tracking-\[0\.34em\] text-amaranth">\s*\{i\.ugcPage\.contactSheet\.eyebrow\}\s*<\/p>/);
  assert.match(
    source,
    /<div class="mt-5 grid gap-8 lg:grid-cols-\[minmax\(0,0\.75fr\)_minmax\(0,1\.25fr\)\] lg:items-end">[\s\S]*?<TypedTitle[\s\S]*?text=\{i\.ugcPage\.hero\.headline\}[\s\S]*?class="block text-4xl leading-none text-ink md:text-6xl"[\s\S]*?<p class="text-balance text-lg font-semibold uppercase leading-\[1\.18\] tracking-\[0\.1[234]em\] text-ink md:text-2xl lg:justify-self-end lg:text-right lg:text-3xl">\s*\{i\.ugcPage\.contactSheet\.headline\}\s*<\/p>[\s\S]*?<\/div>/s,
  );
  assert.match(source, /<div class="mt-5 overflow-hidden" aria-hidden="true">/);
  assert.doesNotMatch(source, /pt-28|md:pt-32|pb-8|md:pb-10/);
  assert.doesNotMatch(source, /text-5xl leading-none text-ink md:text-7xl/);
  assert.doesNotMatch(source, /text-2xl font-semibold uppercase leading-\[1\.18\] tracking-\[0\.18em\] text-ink md:text-4xl/);
});

test('admin UGC preview mirrors the hero density with editable static copy', async () => {
  const source = await readSource('src/pages/admin/ugc.astro');

  assert.match(source, /import EditableText from '\.\.\/\.\.\/components\/admin\/EditableText';/);
  assert.match(source, /<section class="px-6 pt-20 pb-5 md:pt-24 md:pb-6">/);
  assert.match(source, /<p class="text-xs font-semibold uppercase tracking-\[0\.34em\] text-amaranth">\s*\{i\.ugcPage\.contactSheet\.eyebrow\}\s*<\/p>/);
  assert.match(
    source,
    /<div class="mt-5 grid gap-8 lg:grid-cols-\[minmax\(0,0\.75fr\)_minmax\(0,1\.25fr\)\] lg:items-end">[\s\S]*?<EditableText client:load i18nKey="ugcPage\.hero\.headline" as="h1" className="block text-4xl leading-none text-ink md:text-6xl" \/>[\s\S]*?<EditableText client:load i18nKey="ugcPage\.contactSheet\.headline" as="p" className="text-balance text-lg font-semibold uppercase leading-\[1\.18\] tracking-\[0\.1[234]em\] text-ink md:text-2xl lg:justify-self-end lg:text-right lg:text-3xl" \/>[\s\S]*?<\/div>/s,
  );
  assert.match(source, /<div class="mt-5 overflow-hidden" aria-hidden="true">/);
  assert.doesNotMatch(source, /<TypedTitle\b/);
  assert.doesNotMatch(source, /EditableText client:load i18nKey="ugcPage\.contactSheet\.eyebrow"/);
  assert.doesNotMatch(source, /pt-28|md:pt-32|pb-8|md:pb-10/);
});

test('UGC contact sheet constrains only the grid shell while keeping viewer classes untouched', async () => {
  const source = await readSource('src/components/UgcContactSheet.tsx');

  assert.match(
    source,
    /return \(\s*<>\s*<div className="mx-auto w-full max-w-6xl space-y-5">[\s\S]*?<div className="flex flex-wrap items-center gap-2">[\s\S]*?<div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">[\s\S]*?<\/div>\s*<\/div>\s*<AnimatePresence/s,
  );
  assert.match(source, /className=\{`group inline-flex items-center gap-2 text-\[0\.65rem\] font-semibold uppercase tracking-\[0\.24em\] transition/);
  assert.match(source, /className=\{`absolute inset-x-3 bottom-3 inline-flex max-w-\[calc\(100%-1\.5rem\)\] items-center justify-start bg-ink px-2 py-2 text-\[0\.58rem\] font-semibold uppercase tracking-\[0\.24em\] text-paper transition/);
  assert.match(source, /className="fixed inset-0 z-50 bg-ink\/84 backdrop-blur-sm"/);
  assert.match(source, /className="flex min-h-full items-center justify-center p-4 md:p-8"/);
  assert.match(source, /className="relative w-full max-w-7xl pr-20 text-paper md:pr-24"/);
  assert.match(source, /className="aspect-\[9\/16\] w-full max-w-sm overflow-hidden bg-paper"/);
  assert.doesNotMatch(source, /\bspace-y-8\b/);
  assert.doesNotMatch(source, /\bgap-3 lg:grid-cols-4 lg:gap-4\b/);
  assert.doesNotMatch(source, /className=\{`group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-\[0\.32em\] transition/);
  assert.doesNotMatch(source, /px-3 py-2 text-\[0\.65rem\]/);
});

test('UGC design spec records the approved density refinement note', async () => {
  const source = await readSource('docs/superpowers/specs/2026-08-22-ugc-editorial-contact-sheet-design.md');

  assert.match(source, /## Live refinement 1/);
  assert.match(source, /Reduce the hero top padding to approximately `5rem` on mobile and `6rem` on desktop, with a shallower bottom edge and the rule pulled closer to the copy\./);
  assert.match(source, /Keep the eyebrow above the hero content, but place `@marttelier` and the contact-sheet headline on one desktop row using a denser `0\.75 \/ 1\.25` split while mobile still stacks them\./);
  assert.match(source, /Shrink the typed title to the `text-4xl` \/ `md:text-6xl` range and the uppercase value line to a `text-lg` → `md:text-2xl` → `lg:text-3xl` progression with tracking around `0\.13em` and right-column alignment\./);
  assert.match(source, /Constrain the filter-and-grid composition to `max-w-6xl`, tighten the filter\/grid gaps, and keep the fullscreen focus viewer outside that width lock so its fixed overlay still spans the full viewport\./);
});
