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

function extractRegion(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find ${label} start marker`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `expected to find ${label} end marker`);
  return source.slice(start, end);
}

function extractSectionByDataAttribute(source, attribute, label) {
  const pattern = new RegExp(`<section[^>]*${attribute}[^>]*>[\\s\\S]*?<\\/section>`);
  const match = source.match(pattern);
  assert.ok(match, `expected to find ${label}`);
  return match[0];
}

test('translation methodology motion leaves methodology steps unclipped while preserving other clipPath entrances', async () => {
  const motionSource = await readSource('src/lib/translationPageMotion.ts');
  const methodologyBranch = extractRegion(
    motionSource,
    'const methodologySection = root.querySelector',
    'const whySection = root.querySelector',
    'methodology motion branch',
  );

  assert.doesNotMatch(
    motionSource,
    /\[data-arsenal-item\],\[data-methodology-step\],\[data-why-card\]/,
    'reduced-motion reset should stop applying clipPath cleanup to methodology steps',
  );
  assert.match(
    methodologyBranch,
    /gsap\.set\(methodologySteps,\s*\{\s*autoAlpha:\s*0,\s*y:\s*26\s*\}\);/,
    'methodology steps should only animate autoAlpha and y on enter',
  );
  assert.match(
    methodologyBranch,
    /\.to\(methodologySteps,\s*\{\s*autoAlpha:\s*1,\s*y:\s*0,/,
    'methodology steps should animate back to visible without clipPath',
  );
  assert.doesNotMatch(
    methodologyBranch,
    /clipPath/,
    'methodology motion should not clip the whole step wrapper during set or reveal',
  );
  assert.match(
    motionSource,
    /clipPath:\s*'inset\(0 0 100% 0\)'/,
    'other translation page entrances should keep their clipPath-driven reveals',
  );
});

test('public and admin methodology cards keep equal-height unclipped desktop cards with matching hover affordances', async () => {
  const [publicSource, adminSource] = await Promise.all([
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
  ]);

  const publicMethodology = extractSectionByDataAttribute(publicSource, 'data-methodology-section', 'public methodology section');
  const adminMethodology = extractSectionByDataAttribute(adminSource, 'data-admin-methodology', 'admin methodology section');

  assert.match(publicMethodology, /<div class="grid items-stretch gap-6 md:grid-cols-4">/);
  assert.match(publicMethodology, /<article class="group relative flex h-full flex-col overflow-visible pl-16 md:pl-0" data-methodology-step tabindex="0">/);
  assert.match(
    publicMethodology,
    /class="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border border-paper\/24 font-body text-sm font-semibold uppercase tracking-\[0\.16em\] text-amaranth transition group-hover:-translate-y-1 group-hover:border-amaranth group-hover:bg-amaranth group-hover:text-ink group-focus-visible:-translate-y-1 group-focus-visible:border-amaranth group-focus-visible:bg-amaranth group-focus-visible:text-ink md:relative md:mx-auto"/,
  );
  assert.match(
    publicMethodology,
    /class="border border-paper\/18 px-5 py-6 transition group-hover:-translate-y-1 group-hover:border-amaranth\/60 group-focus-visible:-translate-y-1 group-focus-visible:border-amaranth\/60 md:mt-6 md:flex-1 md:h-full md:min-h-\[170px\]"/,
  );

  assert.match(adminMethodology, /<div class="grid items-stretch gap-6 md:grid-cols-4">/);
  assert.match(adminMethodology, /<article class="group relative flex h-full flex-col overflow-visible pl-16 md:pl-0">/);
  assert.match(
    adminMethodology,
    /class="border border-paper\/18 px-5 py-6 transition group-hover:-translate-y-1 group-hover:border-amaranth\/60 group-focus-visible:-translate-y-1 group-focus-visible:border-amaranth\/60 md:mt-6 md:flex-1 md:h-full md:min-h-\[170px\]"/,
  );
});

test('translation arsenal source keeps equal thirds plus exact square tool tiles in public, admin preview, and add-tile controls', async () => {
  const [publicSource, adminPreviewSource, editableCollectionSource] = await Promise.all([
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/components/admin/AdminTranslationArsenalPreview.tsx'),
    readSource('src/components/admin/EditableCollection.tsx'),
  ]);

  const publicArsenal = extractSectionByDataAttribute(publicSource, 'data-arsenal-section', 'public arsenal section');

  assert.match(publicArsenal, /<div class="grid gap-0 lg:grid-cols-3">/);
  assert.doesNotMatch(publicArsenal, /lg:grid-cols-\[0\.82fr_0\.88fr_1\.3fr\]/);
  assert.match(publicArsenal, /<div class="mt-5 grid grid-cols-3 gap-2" data-arsenal-items>/);
  assert.match(
    publicArsenal,
    /class="group flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-3 bg-ink px-3 py-4 text-center text-paper transition hover:bg-amaranth hover:text-ink"/,
  );
  assert.match(
    publicArsenal,
    /class="h-6 max-h-\[24px\] w-6 max-w-\[24px\] object-contain"/,
    'public tool logos should stay visually constrained inside equal tiles',
  );

  assert.match(adminPreviewSource, /<div className="grid gap-0 lg:grid-cols-3">/);
  assert.doesNotMatch(adminPreviewSource, /lg:grid-cols-\[0\.82fr_0\.88fr_1\.3fr\]/);
  assert.match(adminPreviewSource, /<div className="mt-5 grid grid-cols-3 gap-2">/);
  assert.match(
    adminPreviewSource,
    /className="group flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-3 bg-ink px-3 py-4 text-center text-paper transition hover:bg-amaranth hover:text-ink"/,
  );
  assert.match(
    adminPreviewSource,
    /className="h-6 max-h-\[24px\] w-6 max-w-\[24px\] object-contain"/,
    'admin preview tool logos should stay visually constrained inside equal tiles',
  );

  assert.match(
    editableCollectionSource,
    /data-collection-add="tools"[\s\S]*className="aspect-square w-full min-w-0 border border-dashed border-black\/20 bg-paper p-5 text-left transition hover:border-amaranth hover:text-amaranth"/,
    'the dashed add-tool tile should use the same square footprint as the live tool tiles',
  );
});
