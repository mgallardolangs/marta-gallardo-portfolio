import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readLocale(locale) {
  const contents = await readFile(path.join(rootDir, 'src/i18n', `${locale}.json`), 'utf8');
  return JSON.parse(contents);
}

function getCopyContract(dictionary) {
  return {
    nav: Object.fromEntries(
      ['about', 'services', 'seo', 'translation', 'ugcService', 'ugc', 'translationSeo']
        .map((key) => [key, dictionary.nav[key]]),
    ),
    home: {
      hero: Object.fromEntries(
        ['kicker', 'title', 'description', 'ctaDiagnosis', 'ctaServices']
          .map((key) => [key, dictionary.home.hero[key]]),
      ),
      video: { playLabel: dictionary.home.video.playLabel },
      services: dictionary.home.services,
      visibility: dictionary.home.visibility,
      about: Object.fromEntries(
        ['title', 'description', 'cta'].map((key) => [key, dictionary.home.about[key]]),
      ),
      latestArticles: dictionary.home.latestArticles,
    },
    aboutPage: dictionary.aboutPage,
    seoPage: dictionary.seoPage,
    translationServicePage: dictionary.translationServicePage,
    ugcPage: {
      benefits: dictionary.ugcPage.benefits,
      process: dictionary.ugcPage.process,
    },
  };
}

function assertCopyShape(actual, expected, currentPath = 'copy') {
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${currentPath} should be an array`);
    assert.equal(actual.length, expected.length, `${currentPath} should preserve array length`);
    expected.forEach((value, index) => {
      assertCopyShape(actual[index], value, `${currentPath}[${index}]`);
    });
    return;
  }

  if (expected && typeof expected === 'object') {
    assert.ok(actual && typeof actual === 'object' && !Array.isArray(actual), `${currentPath} should be an object`);
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), `${currentPath} should preserve keys`);
    for (const key of Object.keys(expected)) {
      assertCopyShape(actual[key], expected[key], `${currentPath}.${key}`);
    }
    return;
  }

  assert.equal(typeof actual, 'string', `${currentPath} should be localized text`);
  assert.notEqual(actual.trim(), '', `${currentPath} should not be empty`);
}

test('approved localized-copy sections share one complete schema in all locales', async () => {
  const dictionaries = await Promise.all(locales.map(readLocale));
  const reference = getCopyContract(dictionaries[0]);

  for (const [index, dictionary] of dictionaries.entries()) {
    assertCopyShape(getCopyContract(dictionary), reference, locales[index]);
  }

  const [es, en, fr, de, it, ca] = dictionaries;
  for (const dictionary of [es, en, fr, de, it, ca]) {
    assert.equal(typeof dictionary.nav.ugc, 'string');
    assert.equal(typeof dictionary.nav.translationSeo, 'string');
  }

  assert.deepEqual(es.seoPage.services.items.map(({ id }) => id), ['audit', 'consulting', 'local']);
  assert.deepEqual(es.translationServicePage.localization.items.map(({ id }) => id), [
    'cultural-adaptation',
    'product-catalogues',
  ]);
  assert.deepEqual(es.translationServicePage.digitalContent.items.map(({ id }) => id), [
    'editorial-content',
    'technical-localization',
  ]);
  assert.deepEqual(Object.keys(es.seoPage.services.items[0]).sort(), ['description', 'id', 'title']);
  assert.deepEqual(Object.keys(es.translationServicePage.localization.items[0]).sort(), [
    'description',
    'id',
    'title',
  ]);
  assert.deepEqual(Object.keys(es.translationServicePage.digitalContent.items[0]).sort(), [
    'description',
    'id',
    'title',
  ]);
  assert.deepEqual(Object.keys(es.ugcPage.process.steps[0]).sort(), ['description', 'title']);
  assert.equal(es.aboutPage.principles.items.length, 4);
  assert.equal(es.ugcPage.process.steps.length, 4);
});

test('Spanish localized copy matches the approved source text', async () => {
  const es = await readLocale('es');

  assert.equal(es.home.hero.kicker, 'marttelier');
  assert.equal(es.home.hero.title, 'Consultora SEO Freelance y Estrategia de Contenidos Digitales');
  assert.equal(es.home.hero.description, 'Optimizo la visibilidad y conversión de tu negocio para que conectes con personas reales, en cualquier idioma y mercado.');
  assert.equal(es.home.hero.ctaDiagnosis, 'Solicitar diagnóstico SEO');
  assert.equal(es.home.hero.ctaServices, 'Ver servicios');
  assert.equal(es.home.visibility.text, 'Como traductora y creadora de contenido, trabajo entre idiomas, culturas y formatos para que cada mensaje conserve su intención y conecte de forma natural. Combino traducción, localización y SEO multilingüe junto con contenido UGC para ayudar a marcas a comunicar con claridad, coherencia y sensibilidad cultural.');
  assert.equal(es.aboutPage.hero.title, 'Sobre mí: Marta Gallardo y la Filosofía Marttelier');
  assert.equal(es.seoPage.hero.paragraphs.length, 2);
  assert.equal(es.translationServicePage.arsenal.skillsTitle, 'Habilidades');
  assert.equal(es.seoPage.arsenal.skillsTitle, 'Habilidades SEO');
  assert.equal(es.ugcPage.benefits.title, 'Por qué Apostar por el Contenido Generado por Usuarios');
});
