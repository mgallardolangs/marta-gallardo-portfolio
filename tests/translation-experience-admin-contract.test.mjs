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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function captureLocaleFieldRenderer(source) {
  const helperDefinitions = [...source.matchAll(/^(?:export\s+)?(?:function\s+([A-Za-z_$][\w$]*)\s*\(|const\s+([A-Za-z_$][\w$]*)\s*=)/gm)];
  const localeFieldDefinition = helperDefinitions.find((definition, index) =>
    source
      .slice(definition.index ?? 0, helperDefinitions[index + 1]?.index ?? source.length)
      .includes('EDITABLE_COLLECTION_LOCALES.map'),
  );

  assert.ok(
    localeFieldDefinition?.[1] || localeFieldDefinition?.[2],
    'experience editor should define a locale-field helper or render block driven by EDITABLE_COLLECTION_LOCALES',
  );

  const helperStart = localeFieldDefinition.index ?? 0;
  const helperIndex = helperDefinitions.indexOf(localeFieldDefinition);
  const helperBlock = source.slice(helperStart, helperDefinitions[helperIndex + 1]?.index ?? source.length);

  return {
    block: helperBlock,
    name: localeFieldDefinition[1] ?? localeFieldDefinition[2],
  };
}

function captureExperienceEditorRenderPath(source) {
  const directDefaultExport = source.match(
    /export\s+default\s+function\s+AdminTranslationExperienceEditor\s*\([^)]*\)\s*\{[\s\S]*$/,
  );

  if (directDefaultExport) {
    return directDefaultExport[0];
  }

  const namedDefaultExport = source.match(
    /(?<renderPath>(?:function|const)\s+AdminTranslationExperienceEditor\b[\s\S]*?export\s+default\s+AdminTranslationExperienceEditor\s*;?)/,
  );

  assert.ok(
    namedDefaultExport?.groups?.renderPath,
    'experience editor should default export the AdminTranslationExperienceEditor render path',
  );

  return namedDefaultExport.groups.renderPath;
}

function assertRenderPathUsesLocaleFieldHelper(renderPath, helperName) {
  const escapedHelperName = escapeRegExp(helperName);
  const invocationMatches = renderPath.match(new RegExp(`(?:<${escapedHelperName}\\b|\\b${escapedHelperName}\\s*\\()`, 'g')) ?? [];

  assert.ok(
    invocationMatches.length >= 2,
    `experience editor render path should invoke ${helperName} for both education and experience add flows`,
  );

  const educationUsagePattern = new RegExp(
    `(?:<${escapedHelperName}\\b[\\s\\S]{0,1200}?\\b(?:value|values|field|fields|state)\\s*=\\{[\\s\\S]{0,400}?(?:education|stud(?:y|ies))[\\s\\S]{0,400}?\\}|\\b${escapedHelperName}\\s*\\([\\s\\S]{0,1200}?\\b(?:value|values|field|fields|state)\\s*:\\s*[\\s\\S]{0,400}?(?:education|stud(?:y|ies))[\\s\\S]{0,400}?(?:,|\\n|\\)))`,
    'i',
  );
  const experienceUsagePattern = new RegExp(
    `(?:<${escapedHelperName}\\b[\\s\\S]{0,1200}?\\b(?:value|values|field|fields|state)\\s*=\\{[\\s\\S]{0,400}?(?:experience|card|highlight|title|text)[\\s\\S]{0,400}?\\}|\\b${escapedHelperName}\\s*\\([\\s\\S]{0,1200}?\\b(?:value|values|field|fields|state)\\s*:\\s*[\\s\\S]{0,400}?(?:experience|card|highlight|title|text)[\\s\\S]{0,400}?(?:,|\\n|\\)))`,
    'i',
  );

  assert.match(
    renderPath,
    educationUsagePattern,
    `experience editor should render ${helperName} with education/study state for the add-study form`,
  );
  assert.match(
    renderPath,
    experienceUsagePattern,
    `experience editor should render ${helperName} with experience/card state for the add-card form`,
  );
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
  return Object.fromEntries(
    locales.map((locale) => {
      const localeTree = store.i18n?.[locale];
      const studies = structuredClone(localeTree?.translationPage?.education?.studies ?? []);
      const cards = structuredClone(localeTree?.translationPage?.experience?.cards ?? []);

      return [locale, {
        studiesLength: studies.length,
        studies,
        cardsLength: cards.length,
        cards,
      }];
    }),
  );
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

  assert.deepEqual(captureExperienceState(store), {
    es: {
      studiesLength: 2,
      studies: ['Formación base ES', 'Nueva formación ES'],
      cardsLength: 2,
      cards: [
        { highlight: 'Cliente base ES', title: 'Rol base ES', text: 'Resumen base ES' },
        { highlight: 'Nuevo cliente ES', title: 'Nuevo rol ES', text: 'Nuevo resumen ES' },
      ],
    },
    en: {
      studiesLength: 2,
      studies: ['Existing study EN', 'New study EN'],
      cardsLength: 2,
      cards: [
        { highlight: 'Existing client EN', title: 'Existing role EN', text: 'Existing summary EN' },
        { highlight: 'New client EN', title: 'New role EN', text: 'New summary EN' },
      ],
    },
    fr: {
      studiesLength: 2,
      studies: ['Étude existante FR', 'Nouvelle étude FR'],
      cardsLength: 2,
      cards: [
        { highlight: 'Client existant FR', title: 'Rôle existant FR', text: 'Résumé existant FR' },
        { highlight: 'Nouveau client FR', title: 'Nouveau rôle FR', text: 'Nouveau résumé FR' },
      ],
    },
    de: {
      studiesLength: 2,
      studies: ['Bestehendes Studium DE', 'Nueva formación ES'],
      cardsLength: 2,
      cards: [
        { highlight: 'Bestehender Kunde DE', title: 'Bestehende Rolle DE', text: 'Bestehende Zusammenfassung DE' },
        { highlight: 'Nuevo cliente ES', title: 'Nuevo rol ES', text: 'Nuevo resumen ES' },
      ],
    },
    it: {
      studiesLength: 2,
      studies: ['Studio esistente IT', 'Nueva formación ES'],
      cardsLength: 2,
      cards: [
        { highlight: 'Cliente esistente IT', title: 'Ruolo esistente IT', text: 'Riepilogo esistente IT' },
        { highlight: 'Nuevo cliente ES', title: 'Nuevo rol ES', text: 'Nuevo resumen ES' },
      ],
    },
    ca: {
      studiesLength: 2,
      studies: ['Estudi existent CA', 'Nueva formación ES'],
      cardsLength: 2,
      cards: [
        { highlight: 'Client existent CA', title: 'Rol existent CA', text: 'Resum existent CA' },
        { highlight: 'Nuevo cliente ES', title: 'Nuevo rol ES', text: 'Nuevo resumen ES' },
      ],
    },
  });

  store.setLang('de');
  const emitCountBeforeGermanSeed = emitCount;
  store.setText('translationPage.experience.cards.1.title', 'Lokalisierte Rolle DE');
  assert.equal(emitCount, emitCountBeforeGermanSeed + 1, 'seeding a distinct DE experience title should emit exactly once');

  store.setLang('es');

  const emitCountBeforeStudyEdit = emitCount;
  store.setText('translationPage.education.studies.1', 'Formación ajustada ES');
  assert.equal(emitCount, emitCountBeforeStudyEdit + 1, 'editing the new education study in ES should emit exactly once');

  const emitCountBeforeHighlightEdit = emitCount;
  store.setText('translationPage.experience.cards.1.highlight', 'Cliente ajustado ES');
  assert.equal(emitCount, emitCountBeforeHighlightEdit + 1, 'editing the new experience highlight in ES should emit exactly once');

  const emitCountBeforeTitleEdit = emitCount;
  store.setText('translationPage.experience.cards.1.title', 'Rol ajustado ES');
  assert.equal(emitCount, emitCountBeforeTitleEdit + 1, 'editing the new experience title in ES should emit exactly once');

  const emitCountBeforeTextEdit = emitCount;
  store.setText('translationPage.experience.cards.1.text', 'Resumen ajustado ES');
  assert.equal(emitCount, emitCountBeforeTextEdit + 1, 'editing the new experience text in ES should emit exactly once');
  unsubscribe();

  const snapshot = store.getSnapshot();
  assert.equal(snapshot.isDirty, true, 'adding translation experience content should mark the draft dirty');
  assert.ok(snapshot.pendingCount > 0, 'adding translation experience content should increase the dirty diff count');

  assert.deepEqual(captureExperienceState(store), {
    es: {
      studiesLength: 2,
      studies: ['Formación base ES', 'Formación ajustada ES'],
      cardsLength: 2,
      cards: [
        { highlight: 'Cliente base ES', title: 'Rol base ES', text: 'Resumen base ES' },
        { highlight: 'Cliente ajustado ES', title: 'Rol ajustado ES', text: 'Resumen ajustado ES' },
      ],
    },
    en: {
      studiesLength: 2,
      studies: ['Existing study EN', 'New study EN'],
      cardsLength: 2,
      cards: [
        { highlight: 'Existing client EN', title: 'Existing role EN', text: 'Existing summary EN' },
        { highlight: 'New client EN', title: 'New role EN', text: 'New summary EN' },
      ],
    },
    fr: {
      studiesLength: 2,
      studies: ['Étude existante FR', 'Nouvelle étude FR'],
      cardsLength: 2,
      cards: [
        { highlight: 'Client existant FR', title: 'Rôle existant FR', text: 'Résumé existant FR' },
        { highlight: 'Nouveau client FR', title: 'Nouveau rôle FR', text: 'Nouveau résumé FR' },
      ],
    },
    de: {
      studiesLength: 2,
      studies: ['Bestehendes Studium DE', 'Formación ajustada ES'],
      cardsLength: 2,
      cards: [
        { highlight: 'Bestehender Kunde DE', title: 'Bestehende Rolle DE', text: 'Bestehende Zusammenfassung DE' },
        { highlight: 'Cliente ajustado ES', title: 'Lokalisierte Rolle DE', text: 'Resumen ajustado ES' },
      ],
    },
    it: {
      studiesLength: 2,
      studies: ['Studio esistente IT', 'Formación ajustada ES'],
      cardsLength: 2,
      cards: [
        { highlight: 'Cliente esistente IT', title: 'Ruolo esistente IT', text: 'Riepilogo esistente IT' },
        { highlight: 'Cliente ajustado ES', title: 'Rol ajustado ES', text: 'Resumen ajustado ES' },
      ],
    },
    ca: {
      studiesLength: 2,
      studies: ['Estudi existent CA', 'Formación ajustada ES'],
      cardsLength: 2,
      cards: [
        { highlight: 'Client existent CA', title: 'Rol existent CA', text: 'Resum existent CA' },
        { highlight: 'Cliente ajustado ES', title: 'Rol ajustado ES', text: 'Resumen ajustado ES' },
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

  assert.match(
    source,
    /import\s*\{[\s\S]*\bEDITABLE_COLLECTION_LOCALES\b[\s\S]*\}\s*from\s*['"]\.\.\/\.\.\/lib\/adminCollections\.ts['"]/,
    'experience editor should import EDITABLE_COLLECTION_LOCALES from adminCollections.ts',
  );
  assert.match(source, /import\s+\{\s*useAdminStore\s*\}\s+from\s+['"]\.\/useAdminStore['"]/, 'experience editor should subscribe through useAdminStore');
  assert.match(source, /import\s+EditableText\s+from\s+['"]\.\/EditableText['"]/, 'experience editor should reuse EditableText for inline copy editing');
  assert.match(source, /useAdminStore\(\)/, 'experience editor should call useAdminStore');
  assert.match(source, /addEducationStudy/, 'experience editor should create studies through the store API');
  assert.match(source, /addExperienceCard/, 'experience editor should create cards through the store API');
  assert.match(source, /translationPage\.education\.intro/, 'experience editor should keep the education intro editable');
  assert.match(source, /translationPage\.experience\.intro/, 'experience editor should keep the experience intro editable');
  const { block: localeFieldRenderBlock, name: localeFieldHelperName } = captureLocaleFieldRenderer(source);
  assert.match(
    localeFieldRenderBlock,
    /locale\.toUpperCase\(\)/,
    'experience editor locale-field block should render locale labels with locale.toUpperCase()',
  );
  assert.match(
    localeFieldRenderBlock,
    /<(?:input|textarea)\b[\s\S]*?\bvalue=\{\s*[A-Za-z_$][\w$]*\[locale\]\s*\}/,
    'experience editor locale-field block should render a controlled input or textarea keyed by locale',
  );
  assertRenderPathUsesLocaleFieldHelper(captureExperienceEditorRenderPath(source), localeFieldHelperName);
  assert.match(source, /role="alert"/, 'experience editor should render inline validation errors accessibly');
  assert.match(source, /(?:sm|md):grid-cols-2[^"]*(?:xl|2xl):grid-cols-3/, 'experience editor should preview experience cards in the responsive approved grid');
});

test('admin translation page passes a typed initialContent prop built from page.* into the integrated experience editor', async () => {
  const [adminSource, editorSource] = await Promise.all([
    readSource('src/pages/admin/translation-seo.astro'),
    readRequiredSource('src/components/admin/AdminTranslationExperienceEditor.tsx'),
  ]);

  assert.match(
    adminSource,
    /<AdminTranslationExperienceEditor\b[^>]*\binitialContent=\{\{[\s\S]{0,600}?\}\}[^>]*\/>/,
    'admin translation page should pass a literal initialContent prop object to the experience editor island',
  );

  const mountMatch = adminSource.match(/<AdminTranslationExperienceEditor\b[\s\S]{0,900}?\/>/);
  assert.ok(mountMatch, 'admin translation page should mount the experience editor with props');
  const mountSource = mountMatch[0];

  assert.match(mountSource, /page\.browserTabsAriaLabel/, 'initialContent should seed the tablist aria label from page.browserTabsAriaLabel');
  assert.match(mountSource, /page\.browserTabs\.education/, 'initialContent should seed the education tab label from page.browserTabs.education');
  assert.match(mountSource, /page\.browserTabs\.experience/, 'initialContent should seed the experience tab label from page.browserTabs.experience');
  assert.match(mountSource, /page\.experienceStatement/, 'initialContent should seed the experience statement from page.experienceStatement');
  assert.match(mountSource, /page\.education\.intro/, 'initialContent should seed the education intro from page.education.intro');
  assert.match(mountSource, /page\.education\.studies/, 'initialContent should seed the education studies from page.education.studies');
  assert.match(mountSource, /page\.experience\.intro/, 'initialContent should seed the experience intro from page.experience.intro');
  assert.match(mountSource, /page\.experience\.cards/, 'initialContent should seed the experience cards from page.experience.cards');

  assert.match(
    editorSource,
    /type\s+AdminTranslationExperienceInitialContent\s*=\s*\{[\s\S]{0,600}?\}/,
    'experience editor should declare a typed shape for the initialContent prop',
  );
  assert.match(
    editorSource,
    /initialContent\s*:\s*AdminTranslationExperienceInitialContent/,
    'experience editor should type the initialContent prop with the declared shape',
  );
});

test('experience editor renders initialContent while the store is not initialized, then switches to live store getters/text', async () => {
  const source = await readRequiredSource('src/components/admin/AdminTranslationExperienceEditor.tsx');

  assert.match(
    source,
    /store\.initialized\s*\?\s*store\.getText\(\s*['"]translationPage\.browserTabsAriaLabel['"]\s*\)\s*:\s*initialContent\.browserTabsAriaLabel/,
    'tablist aria label should fall back to initialContent.browserTabsAriaLabel until the store initializes',
  );
  assert.match(
    source,
    /store\.initialized\s*\?\s*store\.getText\(\s*['"]translationPage\.browserTabs\.education['"]\s*\)\s*:\s*initialContent\.browserTabs\.education/,
    'education tab text should fall back to initialContent.browserTabs.education until the store initializes',
  );
  assert.match(
    source,
    /store\.initialized\s*\?\s*store\.getText\(\s*['"]translationPage\.browserTabs\.experience['"]\s*\)\s*:\s*initialContent\.browserTabs\.experience/,
    'experience tab text should fall back to initialContent.browserTabs.experience until the store initializes',
  );

  assert.match(
    source,
    /const\s+studies\s*=\s*store\.initialized\s*\?\s*store\.getEducationStudies\(\)\s*:\s*initialContent\.education\.studies/,
    'education studies list should read from initialContent.education.studies until the store initializes',
  );
  assert.match(
    source,
    /const\s+cards\s*=\s*store\.initialized\s*\?\s*store\.getExperienceCards\(\)\s*:\s*initialContent\.experience\.cards/,
    'experience cards list should read from initialContent.experience.cards until the store initializes',
  );

  assert.match(
    source,
    /store\.initialized[\s\S]{0,400}?initialContent\.experienceStatement/,
    'experience statement should render initialContent.experienceStatement before the store initializes',
  );
  assert.match(
    source,
    /store\.initialized[\s\S]{0,400}?initialContent\.education\.intro/,
    'education intro should render initialContent.education.intro before the store initializes',
  );
  assert.match(
    source,
    /store\.initialized[\s\S]{0,400}?initialContent\.experience\.intro/,
    'experience intro should render initialContent.experience.intro before the store initializes',
  );
});

test('experience editor submit handlers guard an uninitialized store without resetting typed form values, and disable add buttons until ready', async () => {
  const source = await readRequiredSource('src/components/admin/AdminTranslationExperienceEditor.tsx');

  const submitStudyMatch = source.match(/const\s+submitStudy\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n  \};/);
  assert.ok(submitStudyMatch, 'experience editor should define a submitStudy handler');
  const submitStudyBody = submitStudyMatch[0];

  assert.match(
    submitStudyBody,
    /if\s*\(\s*!store\.initialized\s*\)\s*\{[^}]*return;?[^}]*\}/,
    'submitStudy should guard and return early when the store is not initialized',
  );
  assert.doesNotMatch(
    submitStudyBody.slice(0, submitStudyBody.search(/if\s*\(\s*!store\.initialized\s*\)/)),
    /resetStudyForm\(\)/,
    'submitStudy should check store.initialized before any reset of the study form',
  );
  const guardIndex = submitStudyBody.search(/if\s*\(\s*!store\.initialized\s*\)\s*\{[^}]*\}/);
  const guardBlockMatch = submitStudyBody.slice(guardIndex).match(/if\s*\(\s*!store\.initialized\s*\)\s*\{([^}]*)\}/);
  assert.ok(guardBlockMatch, 'submitStudy uninitialized guard block should be present');
  assert.doesNotMatch(guardBlockMatch[1], /resetStudyForm\(\)/, 'submitStudy uninitialized guard should not reset the typed study fields');

  const submitCardMatch = source.match(/const\s+submitCard\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n  \};/);
  assert.ok(submitCardMatch, 'experience editor should define a submitCard handler');
  const submitCardBody = submitCardMatch[0];

  assert.match(
    submitCardBody,
    /if\s*\(\s*!store\.initialized\s*\)\s*\{[^}]*return;?[^}]*\}/,
    'submitCard should guard and return early when the store is not initialized',
  );
  const cardGuardIndex = submitCardBody.search(/if\s*\(\s*!store\.initialized\s*\)\s*\{[^}]*\}/);
  const cardGuardBlockMatch = submitCardBody.slice(cardGuardIndex).match(/if\s*\(\s*!store\.initialized\s*\)\s*\{([^}]*)\}/);
  assert.ok(cardGuardBlockMatch, 'submitCard uninitialized guard block should be present');
  assert.doesNotMatch(cardGuardBlockMatch[1], /resetCardForm\(\)/, 'submitCard uninitialized guard should not reset the typed card fields');

  assert.match(
    source,
    /onClick=\{submitStudy\}[\s\S]{0,120}?disabled=\{!store\.initialized\}/,
    'add-study submit button should be disabled until the store initializes',
  );
  assert.match(
    source,
    /onClick=\{submitCard\}[\s\S]{0,160}?disabled=\{!store\.initialized\}/,
    'add-card submit button should be disabled until the store initializes',
  );
});

test('built admin translation HTML seeds the experience browser tablist and lists before hydration', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built admin experience browser HTML.');
    return;
  }

  const [adminHtml, esDictionary] = await Promise.all([
    readSource('dist/admin/translation-seo/index.html'),
    readJson('src/i18n/es.json'),
  ]);

  const browserStart = adminHtml.indexOf('data-admin-experience-browser');
  assert.ok(browserStart !== -1, 'built admin HTML should contain the experience browser section');
  const browserSection = adminHtml.slice(browserStart, browserStart + 20000);

  const tablistMatch = browserSection.match(/<div role="tablist" aria-label="([^"]*)"/);
  assert.ok(tablistMatch, 'built admin HTML should render the experience browser tablist');
  assert.notEqual(tablistMatch[1].trim(), '', 'experience browser tablist aria-label should not be blank in SSR');
  assert.equal(tablistMatch[1], esDictionary.translationPage.browserTabsAriaLabel, 'tablist aria-label should render the localized Spanish copy');

  const educationTabMatch = browserSection.match(/data-admin-experience-trigger="education"[^>]*>([^<]*)</);
  assert.ok(educationTabMatch, 'built admin HTML should render the education tab trigger');
  assert.notEqual(educationTabMatch[1].trim(), '', 'education tab text should not be blank in SSR');
  assert.equal(educationTabMatch[1], esDictionary.translationPage.browserTabs.education, 'education tab text should render the localized Spanish copy');

  const experienceTabMatch = browserSection.match(/data-admin-experience-trigger="experience"[^>]*>([^<]*)</);
  assert.ok(experienceTabMatch, 'built admin HTML should render the experience tab trigger');
  assert.notEqual(experienceTabMatch[1].trim(), '', 'experience tab text should not be blank in SSR');
  assert.equal(experienceTabMatch[1], esDictionary.translationPage.browserTabs.experience, 'experience tab text should render the localized Spanish copy');

  const educationPanelStart = browserSection.indexOf('data-admin-experience-panel="education"');
  const experiencePanelStart = browserSection.indexOf('data-admin-experience-panel="experience"');
  assert.ok(educationPanelStart !== -1 && experiencePanelStart !== -1, 'built admin HTML should render both experience browser panels');
  const educationPanel = browserSection.slice(educationPanelStart, experiencePanelStart);
  const experiencePanel = browserSection.slice(experiencePanelStart);

  const studyBulletMatches = educationPanel.match(/mt-3 h-2 w-2 rounded-full bg-amaranth/g) ?? [];
  assert.equal(
    studyBulletMatches.length,
    esDictionary.translationPage.education.studies.length,
    'seeded education studies should render one bullet per study in SSR, not a blank list',
  );
  assert.ok(studyBulletMatches.length > 0, 'education studies list should not be blank in SSR');

  const cardArticleMatches = experiencePanel.match(/<article class="bg-ink px-5 py-6">/g) ?? [];
  assert.equal(
    cardArticleMatches.length,
    esDictionary.translationPage.experience.cards.length,
    'seeded experience cards should render one article per card in SSR, not a blank list',
  );
  assert.ok(cardArticleMatches.length > 0, 'experience cards list should not be blank in SSR');
});
