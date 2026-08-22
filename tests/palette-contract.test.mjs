import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const sourceExtensions = new Set(['.astro', '.tsx', '.css', '.ts', '.js']);
const forbiddenLegacyPalettePattern = /\b(?:amaranth-(?:soft|mist|ink)|blush-[a-z0-9/-]+|rose-gold)\b|#fff(?:fff)?\b/i;
const approvedOpaqueHexColors = new Set(['#f4f5f1', '#060403', '#e83256']);
const hexLiteralPattern = /#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})\b/gi;

function decodeCssEscapes(source) {
  return source.replace(/\\([0-9a-fA-F]{1,6}\s?|.)/g, (_, escapedValue) => {
    const hexMatch = escapedValue.match(/^([0-9a-fA-F]{1,6})\s?$/);

    if (hexMatch) {
      return String.fromCodePoint(Number.parseInt(hexMatch[1], 16));
    }

    return escapedValue;
  });
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(absolutePath);
    }

    return sourceExtensions.has(path.extname(entry.name))
      ? [absolutePath]
      : [];
  }));

  return files.flat().sort();
}

function extractHexLiterals(source) {
  return [...source.matchAll(hexLiteralPattern)].map((match) => match[0]);
}

test('all src files drop legacy palette token names even when CSS escapes are decoded', async () => {
  const sourceFiles = await collectSourceFiles(srcDir);

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
