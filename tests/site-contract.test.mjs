import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];

async function readJson(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const source = await readFile(absolutePath, 'utf8');
  return JSON.parse(source);
}

function assertLocalizedText(value, label) {
  assert.equal(typeof value, 'object', `${label} should be an object`);
  assert.ok(value, `${label} should be defined`);

  for (const locale of locales) {
    assert.equal(typeof value[locale], 'string', `${label}.${locale} should be a string`);
    assert.notEqual(value[locale].trim(), '', `${label}.${locale} should not be empty`);
  }
}

function assertStableIds(items, label) {
  const ids = items.map((item) => item.id);
  const uniqueIds = new Set(ids);

  assert.equal(uniqueIds.size, ids.length, `${label} should contain unique IDs`);

  for (const id of ids) {
    assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${label} ID "${id}" should be stable kebab-case`);
  }
}

function compareShape(actual, expected, currentPath = 'root') {
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${currentPath} should be an array`);
    assert.equal(actual.length, expected.length, `${currentPath} should preserve array length`);

    expected.forEach((item, index) => {
      compareShape(actual[index], item, `${currentPath}[${index}]`);
    });
    return;
  }

  if (expected && typeof expected === 'object') {
    assert.ok(actual && typeof actual === 'object' && !Array.isArray(actual), `${currentPath} should be an object`);
    assert.deepEqual(
      Object.keys(actual).sort(),
      Object.keys(expected).sort(),
      `${currentPath} should preserve object keys`,
    );

    for (const key of Object.keys(expected)) {
      compareShape(actual[key], expected[key], `${currentPath}.${key}`);
    }
    return;
  }

  assert.equal(typeof actual, typeof expected, `${currentPath} should preserve value type`);
}

test('locale files preserve the same structural shape', async () => {
  const loadedLocales = await Promise.all(
    locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)]),
  );

  assert.equal(loadedLocales.length, 6, 'expected six locale files');

  const referenceLocale = loadedLocales[0][1];

  for (const [locale, dictionary] of loadedLocales) {
    compareShape(dictionary, referenceLocale, locale);
  }
});

test('site data preserves the Phase 1 contract', async () => {
  const site = await readJson('src/data/site.json');

  assert.ok(Array.isArray(site.orbitMedia), 'orbitMedia should be an array');
  assert.equal(site.orbitMedia.length, 15, 'orbitMedia should start with exactly 15 items');
  assertStableIds(site.orbitMedia, 'orbitMedia');

  site.orbitMedia.forEach((item, index) => {
    assert.match(item.type, /^(image|video)$/, `orbitMedia[${index}].type should be image or video`);
    assert.equal(typeof item.src, 'string', `orbitMedia[${index}].src should be a string`);
    assert.notEqual(item.src.trim(), '', `orbitMedia[${index}].src should not be empty`);
    assertLocalizedText(item.alt, `orbitMedia[${index}].alt`);
    assertLocalizedText(item.label, `orbitMedia[${index}].label`);

    if (item.href !== null && item.href !== undefined) {
      assert.equal(typeof item.href, 'string', `orbitMedia[${index}].href should be a string when present`);
      assert.match(item.href, /^\//, `orbitMedia[${index}].href should stay internal`);
    }

    if (item.type === 'video') {
      assert.equal(typeof item.poster, 'string', `orbitMedia[${index}].poster should exist for videos`);
      assert.notEqual(item.poster.trim(), '', `orbitMedia[${index}].poster should not be empty for videos`);
    }
  });

  assert.ok(site.arsenal && typeof site.arsenal === 'object', 'arsenal should exist');
  assert.ok(Array.isArray(site.arsenal.languages), 'arsenal.languages should be an array');
  assert.equal(site.arsenal.languages.length, 6, 'arsenal.languages should include six tiles');
  assertStableIds(site.arsenal.languages, 'arsenal.languages');

  site.arsenal.languages.forEach((language, index) => {
    assertLocalizedText(language.label, `arsenal.languages[${index}].label`);
  });

  assert.ok(Array.isArray(site.arsenal.tools) && site.arsenal.tools.length > 0, 'arsenal.tools should not be empty');
  assertStableIds(site.arsenal.tools, 'arsenal.tools');
  site.arsenal.tools.forEach((tool, index) => {
    assert.equal(typeof tool.logo, 'string', `arsenal.tools[${index}].logo should be a string`);
    assert.notEqual(tool.logo.trim(), '', `arsenal.tools[${index}].logo should not be empty`);
    assertLocalizedText(tool.label, `arsenal.tools[${index}].label`);
  });

  assert.ok(Array.isArray(site.arsenal.skills) && site.arsenal.skills.length > 0, 'arsenal.skills should not be empty');
  assertStableIds(site.arsenal.skills, 'arsenal.skills');
  site.arsenal.skills.forEach((skill, index) => {
    assertLocalizedText(skill.label, `arsenal.skills[${index}].label`);
  });
});
