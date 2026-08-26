import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

async function readRequiredSource(relativePath) {
  try {
    return await readSource(relativePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      assert.fail(`${relativePath} should exist for the integrated translation experience editor contract`);
    }

    throw error;
  }
}

function createLocalizedText(es, en, fr, de = es, it = es, ca = es) {
  return { es, en, fr, de, it, ca };
}

function createExperienceI18n() {
  return {
    es: {
      translationPage: {
        education: {
          intro: 'Base académica ES',
          studies: ['Formación base ES'],
        },
        experience: {
          intro: 'Experiencia base ES',
          cards: [{
            highlight: 'Cliente base ES',
            title: 'Rol base ES',
            text: 'Resumen base ES',
          }],
        },
      },
    },
    en: {
      translationPage: {
        education: {
          intro: 'Base education EN',
          studies: ['Existing study EN'],
        },
        experience: {
          intro: 'Base experience EN',
          cards: [{
            highlight: 'Existing client EN',
            title: 'Existing role EN',
            text: 'Existing summary EN',
          }],
        },
      },
    },
    fr: {
      translationPage: {
        education: {
          intro: 'Base académique FR',
          studies: ['Étude existante FR'],
        },
        experience: {
          intro: 'Expérience de base FR',
          cards: [{
            highlight: 'Client existant FR',
            title: 'Rôle existant FR',
            text: 'Résumé existant FR',
          }],
        },
      },
    },
    de: {
      translationPage: {
        education: {
          intro: 'Bestehende Ausbildung DE',
          studies: ['Bestehendes Studium DE'],
        },
        experience: {
          intro: 'Bestehende Erfahrung DE',
          cards: [{
            highlight: 'Bestehender Kunde DE',
            title: 'Bestehende Rolle DE',
            text: 'Bestehende Zusammenfassung DE',
          }],
        },
      },
    },
    it: {
      translationPage: {
        education: {
          intro: 'Formazione base IT',
          studies: ['Studio esistente IT'],
        },
        experience: {
          intro: 'Esperienza base IT',
          cards: [{
            highlight: 'Cliente esistente IT',
            title: 'Ruolo esistente IT',
            text: 'Riepilogo esistente IT',
          }],
        },
      },
    },
    ca: {
      translationPage: {
        education: {
          intro: 'Formació base CA',
          studies: ['Estudi existent CA'],
        },
        experience: {
          intro: 'Experiència base CA',
          cards: [{
            highlight: 'Client existent CA',
            title: 'Rol existent CA',
            text: 'Resum existent CA',
          }],
        },
      },
    },
  };
}

function createSiteData() {
  return {
    heroMainPhoto: '',
    galleryCutouts: {},
    videoPlaceholderOrEmbedUrl: '',
    ugcHeaderImage: '',
    instagramScreenshot: '',
    socialLinks: { linkedin: '', instagram: '' },
    publicLanguagePicker: ['es', 'en', 'fr'],
    nicheBackgrounds: {},
    ugcVideos: {},
    ugcPhotos: {},
    nicheIcons: {},
    aboutPhotos: [],
    brandVideo: '',
    toolLogos: {},
    videoStickers: {},
    orbitMedia: [],
    ugcPortfolio: [],
    arsenal: {
      languages: [],
      tools: [],
      skills: [],
    },
    person: {
      name: 'Marta',
      location: 'Elche',
      socialProfiles: { linkedin: '', instagram: '' },
    },
  };
}

function captureExperienceState(store) {
  const previousLang = store.getSnapshot().currentLang;
  const state = Object.fromEntries(
    locales.map((locale) => {
      store.setLang(locale);
      return [locale, {
        studies: [
          store.getText('translationPage.education.studies.0'),
          store.getText('translationPage.education.studies.1'),
        ],
        cards: [
          {
            highlight: store.getText('translationPage.experience.cards.0.highlight'),
            title: store.getText('translationPage.experience.cards.0.title'),
            text: store.getText('translationPage.experience.cards.0.text'),
          },
          {
            highlight: store.getText('translationPage.experience.cards.1.highlight'),
            title: store.getText('translationPage.experience.cards.1.title'),
            text: store.getText('translationPage.experience.cards.1.text'),
          },
        ],
      }];
    }),
  );
  store.setLang(previousLang);
  return state;
}

test('public translation page hero keeps only the contact CTA while parking the portfolio CTA data', async () => {
  const source = await readSource('src/views/TranslationSeoPage.astro');

  assert.doesNotMatch(source, /data-translation-cta="portfolio"/, 'public translation hero should stop rendering the portfolio CTA element');
  assert.doesNotMatch(source, /getLocalizedPath\('\/ugc',\s*lang\)/, 'public translation hero should stop linking to the UGC page from the hero CTA');
  assert.doesNotMatch(source, /page\.hero\.ctaPrimary/, 'public translation hero should stop reading the parked primary CTA copy');
  assert.match(source, /data-translation-cta="contact"/, 'public translation hero should keep the contact CTA');
  assert.match(source, /page\.hero\.ctaSecondary/, 'public translation hero should keep the contact CTA copy');
});

test('admin translation hero keeps only the secondary CTA editor', async () => {
  const source = await readSource('src/pages/admin/translation-seo.astro');

  assert.doesNotMatch(source, /translationPage\.hero\.ctaPrimary/, 'admin translation page should stop rendering the primary CTA editor');
  assert.match(source, /translationPage\.hero\.ctaSecondary/, 'admin translation page should keep the secondary CTA editor');
});

test('experience tabs and both pages drop profileLabel while keeping the education and experience tabs contract', async () => {
  const [publicSource, adminSource, tabsSource] = await Promise.all([
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
    readSource('src/components/translation/ExperienceTabs.tsx'),
  ]);

  assert.doesNotMatch(publicSource, /profileLabel=\{page\.browserTabs\.profileLabel\}/, 'public translation page should stop passing profileLabel to ExperienceTabs');
  assert.doesNotMatch(adminSource, /translationPage\.browserTabs\.profileLabel/, 'admin translation page should stop rendering the parked profile label');
  assert.doesNotMatch(tabsSource, /\bprofileLabel\b/, 'ExperienceTabs should drop the profileLabel prop and rendering path entirely');
  assert.match(tabsSource, /tabs\.education\.label/, 'ExperienceTabs should keep the education tab contract');
  assert.match(tabsSource, /tabs\.experience\.label/, 'ExperienceTabs should keep the experience tab contract');
});

test('all six locale dictionaries retain the parked primary CTA and profile label copy for future restoration', async () => {
  const dictionaries = await Promise.all(
    locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)]),
  );

  for (const [locale, dictionary] of dictionaries) {
    assert.equal(typeof dictionary.translationPage.hero.ctaPrimary, 'string', `${locale} should keep translationPage.hero.ctaPrimary in data`);
    assert.notEqual(dictionary.translationPage.hero.ctaPrimary.trim(), '', `${locale} translationPage.hero.ctaPrimary should stay populated`);
    assert.equal(typeof dictionary.translationPage.browserTabs.profileLabel, 'string', `${locale} should keep translationPage.browserTabs.profileLabel in data`);
    assert.notEqual(dictionary.translationPage.browserTabs.profileLabel.trim(), '', `${locale} translationPage.browserTabs.profileLabel should stay populated`);
  }
});

test('admin translation page delegates the experience browser to one integrated editor island', async () => {
  const source = await readSource('src/pages/admin/translation-seo.astro');

  assert.match(
    source,
    /import\s+AdminTranslationExperienceEditor\s+from\s+['"]\.\.\/\.\.\/components\/admin\/AdminTranslationExperienceEditor['"]/,
    'admin translation page should import the integrated experience editor',
  );

  const mounts = source.match(/<AdminTranslationExperienceEditor\b/g) ?? [];
  assert.equal(mounts.length, 1, 'admin translation page should mount the integrated experience editor exactly once');
  assert.match(source, /<AdminTranslationExperienceEditor\b[^>]*client:load/, 'admin translation page should hydrate the integrated experience editor');

  assert.doesNotMatch(source, /data-admin-experience-browser/, 'admin translation page should stop owning the static experience browser shell');
  assert.doesNotMatch(source, /data-admin-experience-trigger/, 'admin translation page should stop owning the static experience tab trigger markup');
  assert.doesNotMatch(source, /data-admin-experience-panel/, 'admin translation page should stop owning the static experience panels');
  assert.doesNotMatch(source, /page\.education\.studies\.map/, 'admin translation page should stop mapping education studies inline');
  assert.doesNotMatch(source, /page\.experience\.cards\.map/, 'admin translation page should stop mapping experience cards inline');
});

test('public experience cards upgrade to a responsive two-up then three-up grid instead of a late desktop-only split', async () => {
  const source = await readSource('src/components/translation/ExperienceTabs.tsx');

  assert.match(
    source,
    /(?:sm|md):grid-cols-2[^"]*(?:xl|2xl):grid-cols-3/,
    'public experience cards should use responsive two-up and three-up breakpoints',
  );
});

test('AdminStore adds education studies and experience cards across all locale trees with Spanish fallback for parked locales', () => {
  const store = new AdminStore();
  store.init(createExperienceI18n(), createSiteData(), 'en', '');

  let emitCount = 0;
  const unsubscribe = store.subscribe(() => {
    emitCount += 1;
  });

  assert.equal(typeof store.addEducationStudy, 'function', 'AdminStore should expose addEducationStudy({ es, en, fr })');
  assert.equal(typeof store.addExperienceCard, 'function', 'AdminStore should expose addExperienceCard({ highlight, title, text })');

  store.addEducationStudy({
    es: 'Nueva formación ES',
    en: 'New study EN',
    fr: 'Nouvelle étude FR',
  });
  assert.equal(emitCount, 1, 'adding an education study should emit exactly once');

  store.addExperienceCard({
    highlight: createLocalizedText('Nuevo cliente ES', 'New client EN', 'Nouveau client FR'),
    title: createLocalizedText('Nuevo rol ES', 'New role EN', 'Nouveau rôle FR'),
    text: createLocalizedText('Nuevo resumen ES', 'New summary EN', 'Nouveau résumé FR'),
  });
  assert.equal(emitCount, 2, 'adding an experience card should emit exactly once');
  unsubscribe();

  const snapshot = store.getSnapshot();
  assert.equal(snapshot.isDirty, true, 'adding translation experience content should mark the draft dirty');
  assert.ok(snapshot.pendingCount > 0, 'adding translation experience content should increase the dirty diff count');

  assert.deepEqual(captureExperienceState(store), {
    es: {
      studies: ['Formación base ES', 'Nueva formación ES'],
      cards: [
        { highlight: 'Cliente base ES', title: 'Rol base ES', text: 'Resumen base ES' },
        { highlight: 'Nuevo cliente ES', title: 'Nuevo rol ES', text: 'Nuevo resumen ES' },
      ],
    },
    en: {
      studies: ['Existing study EN', 'New study EN'],
      cards: [
        { highlight: 'Existing client EN', title: 'Existing role EN', text: 'Existing summary EN' },
        { highlight: 'New client EN', title: 'New role EN', text: 'New summary EN' },
      ],
    },
    fr: {
      studies: ['Étude existante FR', 'Nouvelle étude FR'],
      cards: [
        { highlight: 'Client existant FR', title: 'Rôle existant FR', text: 'Résumé existant FR' },
        { highlight: 'Nouveau client FR', title: 'Nouveau rôle FR', text: 'Nouveau résumé FR' },
      ],
    },
    de: {
      studies: ['Bestehendes Studium DE', 'Nueva formación ES'],
      cards: [
        { highlight: 'Bestehender Kunde DE', title: 'Bestehende Rolle DE', text: 'Bestehende Zusammenfassung DE' },
        { highlight: 'Nuevo cliente ES', title: 'Nuevo rol ES', text: 'Nuevo resumen ES' },
      ],
    },
    it: {
      studies: ['Studio esistente IT', 'Nueva formación ES'],
      cards: [
        { highlight: 'Cliente esistente IT', title: 'Ruolo esistente IT', text: 'Riepilogo esistente IT' },
        { highlight: 'Nuevo cliente ES', title: 'Nuevo rol ES', text: 'Nuevo resumen ES' },
      ],
    },
    ca: {
      studies: ['Estudi existent CA', 'Nueva formación ES'],
      cards: [
        { highlight: 'Client existent CA', title: 'Rol existent CA', text: 'Resum existent CA' },
        { highlight: 'Nuevo cliente ES', title: 'Nuevo rol ES', text: 'Nuevo resumen ES' },
      ],
    },
  });
});

test('AdminStore rejects incomplete translation experience additions atomically with clear validation errors and no emit', () => {
  const store = new AdminStore();
  store.init(createExperienceI18n(), createSiteData(), 'es', '');

  const before = captureExperienceState(store);
  let emitCount = 0;
  const unsubscribe = store.subscribe(() => {
    emitCount += 1;
  });

  assert.equal(typeof store.addEducationStudy, 'function', 'AdminStore should expose addEducationStudy({ es, en, fr })');
  assert.equal(typeof store.addExperienceCard, 'function', 'AdminStore should expose addExperienceCard({ highlight, title, text })');

  assert.throws(
    () => store.addEducationStudy({ es: 'Nueva formación ES', en: '', fr: 'Nouvelle étude FR' }),
    /education|study|ES\/EN\/FR/i,
    'education additions should reject incomplete ES/EN/FR values with a clear error',
  );
  assert.equal(emitCount, 0, 'rejecting an incomplete education study should not emit');

  assert.throws(
    () => store.addExperienceCard({
      highlight: createLocalizedText('Nuevo cliente ES', '', 'Nouveau client FR'),
      title: createLocalizedText('Nuevo rol ES', 'New role EN', 'Nouveau rôle FR'),
      text: createLocalizedText('Nuevo resumen ES', 'New summary EN', 'Nouveau résumé FR'),
    }),
    /experience|card|ES\/EN\/FR/i,
    'experience additions should reject incomplete ES/EN/FR values with a clear error',
  );
  assert.equal(emitCount, 0, 'rejecting an incomplete experience card should not emit');
  unsubscribe();

  assert.deepEqual(captureExperienceState(store), before, 'rejected additions should leave every locale array unchanged');
  assert.equal(store.getSnapshot().isDirty, false, 'rejected additions should keep a seeded store clean');
  assert.equal(store.getSnapshot().pendingCount, 0, 'rejected additions should keep the dirty diff count at zero');
});

test('AdminTranslationExperienceEditor source uses the shared admin store, localized field editors, inline errors, and a responsive card grid', async () => {
  const source = await readRequiredSource('src/components/admin/AdminTranslationExperienceEditor.tsx');

  assert.match(source, /import\s+\{\s*useAdminStore\s*\}\s+from\s+['"]\.\/useAdminStore['"]/, 'experience editor should subscribe through useAdminStore');
  assert.match(source, /import\s+EditableText\s+from\s+['"]\.\/EditableText['"]/, 'experience editor should reuse EditableText for inline copy editing');
  assert.match(source, /useAdminStore\(\)/, 'experience editor should call useAdminStore');
  assert.match(source, /addEducationStudy/, 'experience editor should create studies through the store API');
  assert.match(source, /addExperienceCard/, 'experience editor should create cards through the store API');
  assert.match(source, /translationPage\.education\.intro/, 'experience editor should keep the education intro editable');
  assert.match(source, /translationPage\.experience\.intro/, 'experience editor should keep the experience intro editable');
  const hasVisibleLocaleLabels = /(?:['"`]ES['"`]|>\s*ES\s*<)[\s\S]*(?:['"`]EN['"`]|>\s*EN\s*<)[\s\S]*(?:['"`]FR['"`]|>\s*FR\s*<)/.test(source);
  const hasLowercaseLocalesWithUppercaseMechanism =
    /(?:['"`]es['"`]|>\s*es\s*<)[\s\S]*(?:['"`]en['"`]|>\s*en\s*<)[\s\S]*(?:['"`]fr['"`]|>\s*fr\s*<)/.test(source) &&
    /toUpperCase\(\)|\buppercase\b/.test(source);
  assert.ok(
    hasVisibleLocaleLabels || hasLowercaseLocalesWithUppercaseMechanism,
    'experience editor should render ES/EN/FR labels, or keep es/en/fr locales with a visible uppercase mechanism in the source',
  );
  assert.match(source, /role="alert"/, 'experience editor should render inline validation errors accessibly');
  assert.match(source, /(?:sm|md):grid-cols-2[^"]*(?:xl|2xl):grid-cols-3/, 'experience editor should preview experience cards in the responsive approved grid');
});
