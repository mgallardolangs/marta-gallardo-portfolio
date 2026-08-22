import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const sourceExtensions = new Set(['.astro', '.tsx', '.css', '.ts', '.js']);
const distExtensions = new Set(['.html', '.css', '.js']);
const forbiddenLegacyPalettePattern = /\b(?:amaranth-(?:soft|mist|ink)|blush-[a-z0-9/-]+|rose-gold)\b|#fff(?:fff)?\b/i;
const approvedOpaqueHexColors = new Set(['#f4f5f1', '#060403', '#e83256']);
const hexLiteralPattern = /#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})\b/gi;
const rgbFunctionPattern = /rgba?\(\s*([^)]*)\)/gi;
const approvedRgbTriplets = new Set(['244,245,241', '6,4,3', '232,50,86']);

function decodeCssEscapes(source) {
  return source.replace(/\\([0-9a-fA-F]{1,6}\s?|.)/g, (_, escapedValue) => {
    const hexMatch = escapedValue.match(/^([0-9a-fA-F]{1,6})\s?$/);

    if (hexMatch) {
      return String.fromCodePoint(Number.parseInt(hexMatch[1], 16));
    }

    return escapedValue;
  });
}

async function collectFiles(directory, extensions = sourceExtensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(absolutePath, extensions);
    }

    return extensions.has(path.extname(entry.name))
      ? [absolutePath]
      : [];
  }));

  return files.flat().sort();
}

function extractHexLiterals(source) {
  return [...source.matchAll(hexLiteralPattern)].map((match) => match[0]);
}

function extractDisallowedRgbFunctions(source) {
  const findings = [];

  for (const match of source.matchAll(rgbFunctionPattern)) {
    const channels = match[1].match(/\d+(?:\.\d+)?/g);

    if (!channels || channels.length < 3) {
      continue;
    }

    const triplet = channels
      .slice(0, 3)
      .map((channel) => String(Number.parseInt(channel, 10)))
      .join(',');

    if (approvedRgbTriplets.has(triplet)) {
      continue;
    }

    findings.push(`${match[0]} -> ${triplet}`);
  }

  return findings;
}

test('all src files drop legacy palette token names even when CSS escapes are decoded', async () => {
  const sourceFiles = await collectFiles(srcDir);

  await Promise.all(sourceFiles.map(async (absolutePath) => {
    const relativePath = path.relative(rootDir, absolutePath);
    const source = await readFile(absolutePath, 'utf8');
    const decodedSource = decodeCssEscapes(source);

    assert.doesNotMatch(
      decodedSource,
      forbiddenLegacyPalettePattern,
      `${relativePath} should not contain legacy blush, rose-gold, or extra amaranth tokens after decoding CSS escapes`,
    );

    const disallowedHexLiterals = [...new Set(
      extractHexLiterals(source).filter((hexLiteral) => !approvedOpaqueHexColors.has(hexLiteral.toLowerCase())),
    )];

    assert.deepEqual(
      disallowedHexLiterals,
      [],
      `${relativePath} should only keep approved opaque hex colors (#F4F5F1, #060403, #E83256)`,
    );
  }));
});

test('EditableImage keeps strict paper ink amaranth tokens without regressing svg or shared video upload support', async () => {
  const [editableImageSource, editableMediaSource] = await Promise.all([
    readFile(path.join(srcDir, 'components/admin/EditableImage.tsx'), 'utf8'),
    readFile(path.join(srcDir, 'components/admin/EditableMedia.tsx'), 'utf8'),
  ]);

  assert.doesNotMatch(
    editableImageSource,
    /bg-pink-50|text-pink-300|bg-white|text-gray-800|rounded-inherit/,
    'EditableImage should drop the legacy fallback, overlay, and action pill classes',
  );
  assert.match(
    editableImageSource,
    /border border-dashed border-ink\/10[^"]*bg-paper\/80[^"]*text-amaranth/,
    'EditableImage empty state should use paper with an amaranth icon',
  );
  assert.match(editableImageSource, /bg-ink\/55/, 'EditableImage overlay should use an ink alpha surface');
  assert.match(
    editableImageSource,
    /border border-amaranth\/20 bg-paper px-4 py-2 text-sm font-medium text-ink[\s\S]*group-hover\/img:border-amaranth\/50[\s\S]*group-hover\/img:text-amaranth[\s\S]*group-focus-within\/img:border-amaranth\/50[\s\S]*group-focus-within\/img:text-amaranth/s,
    'EditableImage action pill should keep a paper base with amaranth hover and focus accents',
  );
  assert.match(editableImageSource, /image\/svg\+xml/, 'EditableImage should still accept svg uploads');
  assert.match(editableMediaSource, /video\/mp4,video\/webm,video\/quicktime/, 'shared admin media upload support should still include video formats');
});

test('theme color declarations reject backslash escapes and extra amaranth variable names', async () => {
  const globalCssSource = await readFile(path.join(srcDir, 'styles/global.css'), 'utf8');
  const themeMatch = globalCssSource.match(/@theme\s*\{([\s\S]*?)\}/);

  assert.ok(themeMatch, 'src/styles/global.css should contain an @theme block');

  const themeBody = themeMatch[1] ?? '';
  const declaredVariableNames = [...themeBody.matchAll(/^\s*(--[^:\s]+)\s*:/gm)].map((match) => match[1]);
  const decodedVariableNames = declaredVariableNames.map((name) => decodeCssEscapes(name));

  assert.doesNotMatch(
    themeBody,
    /^\s*--[^:\n]*\\/m,
    'theme variable declarations must not use backslash escapes',
  );
  assert.ok(
    decodedVariableNames.includes('--color-amaranth'),
    'theme should keep the approved --color-amaranth variable',
  );
  assert.deepEqual(
    decodedVariableNames.filter((name) => name.startsWith('--color-amaranth-')),
    [],
    'theme should not declare --color-amaranth-* aliases beyond the approved base variable',
  );
  assert.deepEqual(
    decodedVariableNames.filter((name) => /^--color-(?:rose-gold|blush-(?:50|100|200|300|400))$/i.test(name)),
    [],
    'theme should not declare legacy rose-gold or blush variables',
  );
});

test('palette audit allows approved paper, ink, and amaranth triplets across comma, space, and underscore syntax', () => {
  const sampleSource = [
    'box-shadow: 0 0 0 rgb(244 245 241 / 0.52);',
    'color: rgb(6 4 3 / 0.15);',
    'background: rgb(232 50 86 / 0.35);',
    'border-color: rgba(232, 50, 86, 0.4);',
    'shadow-[0_18px_40px_rgb(6_4_3_/_0.24)]',
  ].join('\n');

  assert.deepEqual(
    extractDisallowedRgbFunctions(sampleSource),
    [],
    'approved paper, ink, and amaranth transparent triplets should remain allowed',
  );
});

test('palette audit rejects forbidden 45 triplets in rgba shadow syntax', () => {
  assert.deepEqual(
    extractDisallowedRgbFunctions('shadow-[0_18px_50px_rgba(45,45,45,0.08)]'),
    ['rgba(45,45,45,0.08) -> 45,45,45'],
    'legacy 45/45/45 rgba shadows must be rejected even inside Tailwind arbitrary values',
  );
});

test('palette audit rejects any non-approved rgb triplet across src', async () => {
  const sourceFiles = await collectFiles(srcDir);

  await Promise.all(sourceFiles.map(async (absolutePath) => {
    const relativePath = path.relative(rootDir, absolutePath);
    const source = await readFile(absolutePath, 'utf8');

    assert.deepEqual(
      extractDisallowedRgbFunctions(source),
      [],
      `${relativePath} should only contain rgb()/rgba() triplets for paper (244/245/241), ink (6/4/3), or approved amaranth (232/50/86)`,
    );
  }));
});

test('palette audit rejects any non-approved rgb triplet across built assets when CHECK_DIST=1', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built assets.');
    return;
  }

  const builtFiles = await collectFiles(distDir, distExtensions);

  await Promise.all(builtFiles.map(async (absolutePath) => {
    const relativePath = path.relative(rootDir, absolutePath);
    const source = await readFile(absolutePath, 'utf8');

    assert.deepEqual(
      extractDisallowedRgbFunctions(source),
      [],
      `${relativePath} should only contain built rgb()/rgba() triplets for paper (244/245/241), ink (6/4/3), or approved amaranth (232/50/86)`,
    );
  }));
});
