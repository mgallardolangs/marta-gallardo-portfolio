import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const sourceExtensions = new Set(['.astro', '.tsx', '.css', '.ts', '.js']);
const forbiddenLegacyAmaranthPattern = /\bamaranth-(?:soft|mist|ink)\b/i;

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

test('all src files drop amaranth soft/mist/ink token names even when CSS escapes are decoded', async () => {
  const sourceFiles = await collectSourceFiles(srcDir);

  await Promise.all(sourceFiles.map(async (absolutePath) => {
    const relativePath = path.relative(rootDir, absolutePath);
    const source = await readFile(absolutePath, 'utf8');
    const decodedSource = decodeCssEscapes(source);

    assert.doesNotMatch(
      decodedSource,
      forbiddenLegacyAmaranthPattern,
      `${relativePath} should not contain amaranth-soft, amaranth-mist, or amaranth-ink after decoding CSS escapes`,
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
});
