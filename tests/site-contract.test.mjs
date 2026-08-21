import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTranslationToolTiles } from '../src/lib/translationPage.js';

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

function deepGet(source, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], source);
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

test('arsenal DE/IT/CA labels stay localized instead of English placeholders', async () => {
  const site = await readJson('src/data/site.json');

  assert.deepEqual(
    site.arsenal.languages.map((language) => language.label.de),
    ['Spanisch', 'Französisch', 'Katalanisch', 'Englisch', 'Deutsch', 'Italienisch'],
  );
  assert.deepEqual(
    site.arsenal.languages.map((language) => language.level.de),
    ['Muttersprache', 'Fortgeschritten · C1', 'Fortgeschritten', 'Mittelstufe · B1', 'Grundkenntnisse · A2', 'Grundkenntnisse · A2'],
  );

  assert.deepEqual(
    site.arsenal.languages.map((language) => language.label.it),
    ['Spagnolo', 'Francese', 'Catalano', 'Inglese', 'Tedesco', 'Italiano'],
  );
  assert.deepEqual(
    site.arsenal.languages.map((language) => language.level.it),
    ['Madrelingua', 'Avanzato · C1', 'Avanzato', 'Intermedio · B1', 'Base · A2', 'Base · A2'],
  );

  assert.deepEqual(
    site.arsenal.languages.map((language) => language.label.ca),
    ['Espanyol', 'Francès', 'Català', 'Anglès', 'Alemany', 'Italià'],
  );
  assert.deepEqual(
    site.arsenal.languages.map((language) => language.level.ca),
    ['Nadiu', 'Avançat · C1', 'Avançat', 'Intermedi · B1', 'Bàsic · A2', 'Bàsic · A2'],
  );

  const toolsById = Object.fromEntries(site.arsenal.tools.map((tool) => [tool.id, tool]));
  assert.equal(toolsById['ai-tools'].label.de, 'KI-Tools (ChatGPT, Claude)');
  assert.equal(toolsById['ai-tools'].label.it, 'Strumenti IA (ChatGPT, Claude)');
  assert.equal(toolsById['ai-tools'].label.ca, 'Eines d’IA (ChatGPT, Claude)');
  assert.equal(toolsById['google-business-profile'].label.de, 'Google Unternehmensprofil');
  assert.equal(toolsById['google-business-profile'].label.it, 'Profilo dell’attività su Google');
  assert.equal(toolsById['google-business-profile'].label.ca, 'Perfil d’empresa de Google');

  const skillsById = Object.fromEntries(site.arsenal.skills.map((skill) => [skill.id, skill]));
  assert.equal(skillsById['translation-content-adaptation'].label.de, 'Übersetzung und Inhaltsanpassung FR⇄ES und EN/DE/IT/CA→ES');
  assert.equal(skillsById['translation-content-adaptation'].label.it, 'Traduzione e adattamento dei contenuti FR⇄ES e EN/DE/IT/CA→ES');
  assert.equal(skillsById['translation-content-adaptation'].label.ca, 'Traducció i adaptació de continguts FR⇄ES i EN/DE/IT/CA→ES');
  assert.equal(skillsById['website-localization'].label.de, 'Website-Lokalisierung');
  assert.equal(skillsById['website-localization'].label.it, 'Localizzazione di siti web');
  assert.equal(skillsById['website-localization'].label.ca, 'Localització web');
  assert.equal(skillsById['terminology-glossaries'].label.de, 'Terminologierecherche und Glossarmanagement');
  assert.equal(skillsById['terminology-glossaries'].label.it, 'Ricerca terminologica e gestione dei glossari');
  assert.equal(skillsById['terminology-glossaries'].label.ca, 'Recerca terminològica i gestió de glossaris');
  assert.equal(skillsById['keyword-planning'].label.de, 'Keyword-Planung');
  assert.equal(skillsById['keyword-planning'].label.it, 'Pianificazione delle parole chiave');
  assert.equal(skillsById['keyword-planning'].label.ca, 'Planificació de paraules clau');
});

test('code-managed DE/IT/CA translation pages use approved localized hero titles', async () => {
  const [de, it, ca] = await Promise.all([
    readJson('src/i18n/de.json'),
    readJson('src/i18n/it.json'),
    readJson('src/i18n/ca.json'),
  ]);

  assert.equal(de.translationPage.hero.title, 'Übersetzungs-, SEO- und Lokalisierungsdienstleistungen');
  assert.equal(it.translationPage.hero.title, 'Servizi di traduzione, SEO e localizzazione');
  assert.equal(ca.translationPage.hero.title, 'Serveis de traducció, SEO i localització');
});

test('code-managed DE/IT/CA translation page chrome no longer reuses obvious English placeholder copy', async () => {
  const [en, de, it, ca] = await Promise.all([
    readJson('src/i18n/en.json'),
    readJson('src/i18n/de.json'),
    readJson('src/i18n/it.json'),
    readJson('src/i18n/ca.json'),
  ]);

  const placeholderPaths = [
    'translationPage.hero.eyebrow',
    'translationPage.hero.text',
    'translationPage.hero.availability',
    'translationPage.services.title',
    'translationPage.experience.eyebrow',
    'translationPage.experience.title',
    'translationPage.experience.text',
    'translationPage.skills.eyebrow',
    'translationPage.skills.title',
    'translationPage.skills.text',
    'translationPage.education.eyebrow',
    'translationPage.education.title',
    'translationPage.education.intro',
    'translationPage.education.languagesEyebrow',
    'translationPage.education.languagesTitle',
    'translationPage.servicesOffered.eyebrow',
    'translationPage.servicesOffered.title',
    'translationPage.servicesOffered.intro',
    'translationPage.process.eyebrow',
    'translationPage.process.title',
    'translationPage.process.intro',
    'translationPage.whyMe.eyebrow',
    'translationPage.whyMe.title',
    'translationPage.whyMe.text',
  ];

  for (const locale of [de, it, ca]) {
    for (const keyPath of placeholderPaths) {
      assert.notEqual(
        deepGet(locale, keyPath),
        deepGet(en, keyPath),
        `${keyPath} should be localized for ${locale.nav.home}`,
      );
    }
  }
});

test('translation page tool tiles resolve logos from stable tool IDs for every locale', async () => {
  const site = await readJson('src/data/site.json');

  for (const locale of locales) {
    const tiles = getTranslationToolTiles(locale, site);

    assert.equal(tiles.length, site.arsenal.tools.length, `${locale} should expose one tile per arsenal tool`);

    for (const tile of tiles) {
      assert.equal(typeof tile.id, 'string');
      assert.notEqual(tile.id, '', `${locale} tile id should not be empty`);
      assert.equal(typeof tile.label, 'string');
      assert.notEqual(tile.label.trim(), '', `${locale} tile label should not be empty`);
      assert.equal(typeof tile.logoSrc, 'string');
      assert.notEqual(tile.logoSrc.trim(), '', `${locale} tile logo should not be empty`);
    }
  }
});
