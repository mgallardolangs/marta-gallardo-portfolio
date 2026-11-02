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

test('public and admin Translation pages render the current service sections and remove legacy methodology blocks', async () => {
  const [publicSource, adminSource] = await Promise.all([
    readSource('src/views/TranslationServicePage.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
  ]);

  assert.match(publicSource, /page\.localization\.items\.map/);
  assert.match(publicSource, /page\.digitalContent\.items\.map/);
  assert.match(publicSource, /data-translation-arsenal/);
  assert.match(adminSource, /translationServicePage\.localization\.items/);
  assert.match(adminSource, /translationServicePage\.digitalContent\.items/);
  assert.match(adminSource, /<AdminTranslationArsenalEditor/);
  assert.doesNotMatch(publicSource, /data-methodology-section|data-why-section/);
  assert.doesNotMatch(adminSource, /data-admin-methodology|data-admin-why|translationPage\.methodology/);
});

test('translation arsenal source keeps equal thirds plus exact square tool tiles in public and the integrated admin editor', async () => {
  const [publicSource, adminEditorSource] = await Promise.all([
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/components/admin/AdminTranslationArsenalEditor.tsx'),
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

  assert.match(adminEditorSource, /scope === 'translation' \? 'lg:grid-cols-3' : 'md:grid-cols-2'/);
  assert.doesNotMatch(adminEditorSource, /lg:grid-cols-\[0\.82fr_0\.88fr_1\.3fr\]/);
  assert.match(adminEditorSource, /<div className="mt-5 grid grid-cols-3 gap-2" data-arsenal-items>/);
  assert.match(
    adminEditorSource,
    /className="group relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-3 bg-ink px-3 py-4 text-center text-paper transition hover:bg-amaranth hover:text-ink"/,
    'the integrated editor should mirror the public square tool tiles while adding its own hover affordances',
  );
  assert.match(
    adminEditorSource,
    /className="h-6 max-h-\[24px\] w-6 max-w-\[24px\] object-contain"/,
    'admin editor tool logos should stay visually constrained inside equal tiles',
  );

  assert.match(
    adminEditorSource,
    /data-collection-add="tools"[\s\S]*className="flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-2 border border-dashed border-ink\/30/,
    'the dashed add-tool tile should use the same square footprint as the live tool tiles',
  );
});
