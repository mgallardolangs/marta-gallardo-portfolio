import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTranslationArsenalColumns } from '../src/lib/translationPage.js';
import { createEditableCollectionItem } from '../src/lib/adminCollections.ts';
import { SERVICE_SWITCHER_INTERVAL_MS } from '../src/lib/serviceSwitcher.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
}

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readBuiltHtml(relativePath) {
  return readFile(path.join(rootDir, relativePath.replace(/^dist[\\/]/, 'dist/')), 'utf8');
}

const expectedExactChrome = {
  es: {
    heroMark: 'ELCHE · WORKING WORLDWIDE',
    servicesEyebrow: '01 · CÓMO PUEDO AYUDARTE',
    arsenalEyebrow: '02 · PERFIL Y HERRAMIENTAS',
    aboutTrajectoryEyebrow: 'TRAYECTORIA',
    experienceEyebrow: '03 · TRAYECTORIA',
    experienceSectionTitle: 'Experiencia y Formación',
    methodologyEyebrow: '04 · METODOLOGÍA E INFOGRAFÍA',
    methodologyDisplayTitle: 'Un proceso claro, de principio a fin',
    whyEyebrow: '05 · VALOR DIFERENCIAL',
  },
  en: {
    heroMark: 'ELCHE · WORKING WORLDWIDE',
    servicesEyebrow: '01 · HOW I CAN HELP',
    arsenalEyebrow: '02 · PROFILE & TOOLS',
    aboutTrajectoryEyebrow: 'EXPERIENCE',
    experienceEyebrow: '03 · EXPERIENCE',
    experienceSectionTitle: 'Experience & Education',
    methodologyEyebrow: '04 · METHODOLOGY & INFOGRAPHICS',
    methodologyDisplayTitle: 'A clear process, from start to finish',
    whyEyebrow: '05 · WHAT SETS ME APART',
  },
  fr: {
    heroMark: 'ELCHE · DISPONIBLE DANS LE MONDE ENTIER',
    servicesEyebrow: '01 · COMMENT JE PEUX VOUS AIDER',
    arsenalEyebrow: '02 · PROFIL & OUTILS',
    aboutTrajectoryEyebrow: 'PARCOURS',
    experienceEyebrow: '03 · PARCOURS',
    experienceSectionTitle: 'Expérience et formation',
    methodologyEyebrow: '04 · MÉTHODOLOGIE & INFOGRAPHIE',
    methodologyDisplayTitle: 'Un processus clair, du début à la fin',
    whyEyebrow: '05 · CE QUI ME DISTINGUE',
  },
  de: {
    heroMark: 'ELCHE · WELTWEIT TÄTIG',
    servicesEyebrow: '01 · WIE ICH SIE UNTERSTÜTZEN KANN',
    arsenalEyebrow: '02 · PROFIL & TOOLS',
    aboutTrajectoryEyebrow: 'WERDEGANG',
    experienceEyebrow: '03 · WERDEGANG',
    experienceSectionTitle: 'Erfahrung und Ausbildung',
    methodologyEyebrow: '04 · METHODIK & INFOGRAFIK',
    methodologyDisplayTitle: 'Ein klarer Prozess, von Anfang bis Ende',
    whyEyebrow: '05 · WAS MICH AUSZEICHNET',
  },
  it: {
    heroMark: 'ELCHE · OPERATIVA IN TUTTO IL MONDO',
    servicesEyebrow: '01 · COME POSSO AIUTARTI',
    arsenalEyebrow: '02 · PROFILO & STRUMENTI',
    aboutTrajectoryEyebrow: 'PERCORSO',
    experienceEyebrow: '03 · PERCORSO',
    experienceSectionTitle: 'Esperienza e formazione',
    methodologyEyebrow: '04 · METODOLOGIA & INFOGRAFICA',
    methodologyDisplayTitle: 'Un processo chiaro, dall’inizio alla fine',
    whyEyebrow: '05 · IL MIO VALORE AGGIUNTO',
  },
  ca: {
    heroMark: 'ELCHE · TREBALLANT ARREU DEL MÓN',
    servicesEyebrow: '01 · COM ET PUC AJUDAR',
    arsenalEyebrow: '02 · PERFIL I EINES',
    aboutTrajectoryEyebrow: 'TRAJECTÒRIA',
    experienceEyebrow: '03 · TRAJECTÒRIA',
    experienceSectionTitle: 'Experiència i formació',
    methodologyEyebrow: '04 · METODOLOGIA I INFOGRAFIA',
    methodologyDisplayTitle: 'Un procés clar, de principi a fi',
    whyEyebrow: '05 · VALOR DIFERENCIAL',
  },
};

const expectedSkillGroups = {
  es: {
    translation: 'Traducción y localización',
    seo: 'SEO y contenido web',
  },
  en: {
    translation: 'Translation & localization',
    seo: 'SEO & web content',
  },
  fr: {
    translation: 'Traduction & localisation',
    seo: 'SEO et contenu web',
  },
  de: {
    translation: 'Übersetzung & Lokalisierung',
    seo: 'SEO und Web-Inhalte',
  },
  it: {
    translation: 'Traduzione e localizzazione',
    seo: 'SEO e contenuti web',
  },
  ca: {
    translation: 'Traducció i localització',
    seo: 'SEO i contingut web',
  },
};

const expectedProfileLabels = {
  es: 'Perfil de traducción',
  en: 'Translation profile',
  fr: 'Profil de traduction',
  de: 'Übersetzungsprofil',
  it: 'Profilo di traduzione',
  ca: 'Perfil de traducció',
};

function assertNonEmptyString(value, label) {
  assert.equal(typeof value, 'string', `${label} should be a string`);
  assert.notEqual(value.trim(), '', `${label} should not be empty`);
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSectionByDataAttribute(source, attribute, label) {
  const match = source.match(new RegExp(`<section\\b(?=[^>]*\\b${attribute}\\b)[\\s\\S]*?<\\/section>`));
  assert.ok(match, `${label} should expose ${attribute}`);
  return match[0];
}

function extractElementByDataAttribute(source, tagName, attribute, value, label) {
  const match = source.match(new RegExp(`<${tagName}\\b(?=[^>]*\\b${attribute}=["']${value}["'])[^>]*>[\\s\\S]*?<\\/${tagName}>`));
  assert.ok(match, `${label} should expose ${attribute}="${value}"`);
  return match[0];
}

function extractWindowAround(source, needle, label, radius = 1400) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${label} should include ${needle}`);
  return source.slice(Math.max(0, index - radius), Math.min(source.length, index + radius));
}

test('all six locale files add the correction-only translation display keys and service headlines', async () => {
  const dictionaries = await Promise.all(
    locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)]),
  );

  for (const [locale, dictionary] of dictionaries) {
    const page = dictionary.translationPage;
    const exactChrome = expectedExactChrome[locale];
    const exactSkillGroups = expectedSkillGroups[locale];

    assert.equal(page.heroMark, exactChrome.heroMark, `${locale} translationPage.heroMark should keep the approved chrome copy`);
    assert.equal(page.servicesEyebrow, exactChrome.servicesEyebrow, `${locale} translationPage.servicesEyebrow should keep the approved chrome copy`);
    assert.equal(page.arsenalEyebrow, exactChrome.arsenalEyebrow, `${locale} translationPage.arsenalEyebrow should keep the approved chrome copy`);
    assert.equal(dictionary.aboutPage.trajectoryEyebrow, exactChrome.aboutTrajectoryEyebrow, `${locale} aboutPage.trajectoryEyebrow should omit section numbering`);
    assert.equal(page.experienceSectionTitle, exactChrome.experienceSectionTitle, `${locale} translationPage.experienceSectionTitle should keep the approved chrome copy`);
    assert.equal(page.experienceEyebrow, exactChrome.experienceEyebrow, `${locale} translationPage.experienceEyebrow should keep the approved chrome copy`);
    assert.equal(page.methodologyEyebrow, exactChrome.methodologyEyebrow, `${locale} translationPage.methodologyEyebrow should keep the approved chrome copy`);
    assert.equal(page.methodologyDisplayTitle, exactChrome.methodologyDisplayTitle, `${locale} translationPage.methodologyDisplayTitle should keep the approved chrome copy`);
    assert.equal(page.whyEyebrow, exactChrome.whyEyebrow, `${locale} translationPage.whyEyebrow should keep the approved chrome copy`);
    assert.equal(page.methodology.steps.length, 4, `${locale} translationPage.methodology.steps should keep exactly four steps`);
    page.methodology.steps.forEach((step, index) => {
      assertNonEmptyString(step.title, `${locale} translationPage.methodology.steps.${index}.title`);
      assertNonEmptyString(step.description, `${locale} translationPage.methodology.steps.${index}.description`);
    });
    assert.equal(page.whyChooseMe.cards.length, 3, `${locale} translationPage.whyChooseMe.cards should keep exactly three cards`);
    page.whyChooseMe.cards.forEach((card, index) => {
      assertNonEmptyString(card.title, `${locale} translationPage.whyChooseMe.cards.${index}.title`);
      assertNonEmptyString(card.text, `${locale} translationPage.whyChooseMe.cards.${index}.text`);
    });
    assert.deepEqual(
      Object.keys(page.skillGroups ?? {}).sort(),
      ['seo', 'translation'],
      `${locale} translationPage.skillGroups should expose exactly translation and seo titles`,
    );
    assert.equal(
      page.browserTabs.profileLabel,
      expectedProfileLabels[locale],
      `${locale} translationPage.browserTabs.profileLabel should keep the approved chrome copy`,
    );
    assert.equal(
      page.skillGroups.translation,
      exactSkillGroups.translation,
      `${locale} translationPage.skillGroups.translation should keep the approved group title`,
    );
    assert.equal(
      page.skillGroups.seo,
      exactSkillGroups.seo,
      `${locale} translationPage.skillGroups.seo should keep the approved group title`,
    );

    assert.equal(page.services.items.length, 3, `${locale} should keep exactly three service items`);
    page.services.items.forEach((item, index) => {
      assertNonEmptyString(item.headline, `${locale} translationPage.services.items.${index}.headline`);
    });
  }
});

test('site arsenal skills keep the authored 4/6 translation-vs-seo split and grouped helper output', async () => {
  const site = await readJson('src/data/site.json');

  assert.equal(site.arsenal.skills.length, 10, 'arsenal.skills should keep the ten authored translation and SEO records');

  const translationIds = site.arsenal.skills
    .filter((skill) => skill.group === 'translation')
    .map((skill) => skill.id)
    .sort();
  const seoIds = site.arsenal.skills
    .filter((skill) => skill.group === 'seo')
    .map((skill) => skill.id)
    .sort();

  assert.deepEqual(
    translationIds,
    [
      'proofreading-editing-style',
      'terminology-glossaries',
      'translation-content-adaptation',
      'website-localization',
    ].sort(),
    'translation skill group should keep the approved four translation/localization skills',
  );
  assert.deepEqual(
    seoIds,
    [
      'content-optimization',
      'copywriting',
      'keyword-planning',
      'local-seo',
      'skill-arquitectura-web',
      'skill-interlinking',
    ].sort(),
    'seo skill group should keep the six authored SEO/web-content skills',
  );

  const columns = getTranslationArsenalColumns('es', site);
  assert.equal(columns.languages.length, 6, 'arsenal helper should keep six language rows');
  assert.equal(columns.tools.length, site.arsenal.tools.length, 'arsenal helper should keep all existing tool tiles');
  assert.deepEqual(
    Object.keys(columns.skillGroups ?? {}).sort(),
    ['seo', 'translation'],
    'arsenal helper should expose grouped skill columns instead of one flat list',
  );
  assert.equal(columns.skillGroups.translation.length, 4, 'translation helper column should keep four skills');
  assert.equal(columns.skillGroups.seo.length, 6, 'seo helper column should keep six skills');
});

test('public Translation hero keeps the contact link compact while its underline spans the content row', async (t) => {
  const [source, styles] = await Promise.all([
    readSource('src/views/TranslationServicePage.astro'),
    readSource('src/styles/global.css'),
  ]);
  const heroWindow = extractWindowAround(source, 'page.hero.title', 'public translation hero');
  const contactCta = extractElementByDataAttribute(source, 'a', 'data-translation-cta', 'contact', 'public translation contact CTA');

  assert.doesNotMatch(source, /page\.heroMark/, 'public translation hero should stop rendering the vertical hero mark');
  assert.doesNotMatch(source, /data-translation-cta="portfolio"/, 'public translation hero should stop rendering the parked portfolio CTA anchor');
  assert.match(contactCta, /href=\{getLocalizedRoute\('contact', lang\)\}/, 'public translation hero should keep the localized contact CTA anchor');
  assert.match(contactCta, /class="site-text-cta"/);
  assert.match(source, /<div class="site-text-cta-row">[\s\S]*data-translation-cta="contact"/);
  assert.match(styles, /\.site-text-cta\s*\{[^}]*width:\s*fit-content;[^}]*flex:\s*0 0 auto;/s);
  assert.match(styles, /\.site-text-cta-row\s*\{[^}]*border-bottom:\s*1px solid var\(--color-amaranth\);/s);
  assert.doesNotMatch(heroWindow, /bg-\[radial-gradient/i, 'public translation hero should not restore the radial gradient');
  assert.doesNotMatch(source, /page\.hero\.backgroundLabel/, 'public translation hero should remove the old right-side background label card');
  assert.doesNotMatch(heroWindow, /backdrop-blur/, 'public translation hero should stay flat without blur chrome');
  assert.doesNotMatch(contactCta, /w-full|justify-center|hover:-translate-y|shadow-/);

  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built translation hero CTA anchors.');
    return;
  }

  for (const locale of locales) {
    const relativePath = {
      es: 'dist/servicios/traduccion.html',
      en: 'dist/en/services/translation.html',
      fr: 'dist/fr/services/traduction.html',
      de: 'dist/de/dienstleistungen/uebersetzung.html',
      it: 'dist/it/servizi/traduzione.html',
      ca: 'dist/ca/serveis/traduccio.html',
    }[locale];
    const contactHref = locale === 'es' ? '/contacto' : `/${locale}/contact`;
    const html = await readBuiltHtml(relativePath);
    const builtContactCta = extractElementByDataAttribute(
      html,
      'a',
      'data-translation-cta',
      'contact',
      `${locale} built translation contact CTA`,
    );

    assert.doesNotMatch(
      html,
      /data-translation-cta="portfolio"/,
      `${relativePath} should stop rendering the parked portfolio CTA in built HTML`,
    );
    assert.match(
      builtContactCta,
      new RegExp(`href="${escapeForRegex(contactHref)}"`),
      `${relativePath} should keep the localized contact CTA href`,
    );
    assert.match(builtContactCta, /class="site-text-cta"/, `${relativePath} should keep the compact CTA hit area in built HTML`);
    assert.doesNotMatch(
      html,
      new RegExp(escapeForRegex(expectedExactChrome[locale].heroMark)),
      `${relativePath} should not render the hidden hero mark text in built HTML`,
    );
  }
});

test('ServiceSwitcher keeps the 6-second behavior but swaps to open layout and right-side headline copy', async () => {
  const source = await readSource('src/components/translation/ServiceSwitcher.tsx');

  assert.equal(SERVICE_SWITCHER_INTERVAL_MS, 6000, 'ServiceSwitcher should preserve the approved six-second auto-advance');
  assert.match(source, /headline:\s*string/, 'ServiceSwitcher items should require a dedicated headline field');
  assert.match(source, /item\.headline/, 'ServiceSwitcher should render the selected service headline on the right side');
  assert.doesNotMatch(
    source,
    /className="border border-white\/10 bg-ink text-paper shadow-\[/,
    'ServiceSwitcher should remove the outer bordered/shadow card wrapper',
  );
  assert.doesNotMatch(
    source,
    /className="flex min-h-\[18rem\] items-center border border-white\/10 bg-white\/5 p-6 md:p-8"/,
    'ServiceSwitcher should remove the inner right-side card chrome',
  );
});

test('public Translation arsenal shows only translation skills while admin retains the integrated arsenal editor', async () => {
  const [source, seoSource, adminSource, adminEditorSource] = await Promise.all([
    readSource('src/views/TranslationServicePage.astro'),
    readSource('src/views/SeoServicePage.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
    readSource('src/components/admin/AdminTranslationArsenalEditor.tsx'),
  ]);
  const arsenalSection = extractSectionByDataAttribute(source, 'data-translation-arsenal', 'public Translation arsenal section');

  assert.match(source, /getTranslationArsenalColumns\(lang,\s*siteData,\s*'translation'\)/, 'public Translation arsenal should filter site skills to translation');
  assert.match(arsenalSection, /arsenal\.languages\.map/, 'public Translation arsenal should render language rows');
  assert.match(arsenalSection, /language\.level/, 'public Translation arsenal should display existing language levels');
  assert.match(arsenalSection, /arsenal\.skills\.map/, 'public Translation arsenal should render individual skill tags');
  assert.doesNotMatch(arsenalSection, /skillGroups\.seo|SEO Local|Keyword planner/, 'public Translation arsenal should not include SEO skills');
  assert.match(seoSource, /getTranslationArsenalColumns\(lang,\s*siteData,\s*'seo'\)/, 'the separate SEO page should filter its skills to SEO');
  assert.match(seoSource, /arsenal\.skills\.map/, 'the separate SEO page should display its SEO skills');
  assert.match(seoSource, /Ahrefs[\s\S]*SEMrush[\s\S]*Screaming Frog/, 'the separate SEO page should reserve the missing SEO tool logos');
  assert.match(adminSource, /import\s+AdminTranslationArsenalEditor\s+from\s+['"]..\/..\/components\/admin\/AdminTranslationArsenalEditor['"]/, 'admin translation page should import the integrated arsenal editor');
  assert.match(adminSource, /<AdminTranslationArsenalEditor\s+client:load\s*\/>/, 'admin translation page should mount the integrated arsenal editor');
  assert.doesNotMatch(adminSource, /arsenalColumns\.languages\.map/, 'admin translation page should stop using static Astro loops for arsenal languages');
  assert.doesNotMatch(adminSource, /arsenalColumns\.tools\.map/, 'admin translation page should stop using static Astro loops for arsenal tools');
  assert.doesNotMatch(adminSource, /arsenalColumns\.skillGroups\.translation/, 'admin translation page should stop using static Astro loops for translation skills');
  assert.match(adminEditorSource, /lg:grid-cols-3/, 'admin editor should mirror the equal-third desktop grid');
  assert.match(adminEditorSource, /group relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-3 bg-ink px-3 py-4 text-center text-paper transition hover:bg-amaranth hover:text-ink/, 'admin editor should mirror the public square tool tiles');
});

test('About reuses the trajectory tabs without rendering the parked profile label', async (t) => {
  const [experienceTabsSource, publicSource, adminSource] = await Promise.all([
    readSource('src/components/translation/ExperienceTabs.tsx'),
    readSource('src/views/AboutPage.astro'),
    readSource('src/pages/admin/about.astro'),
  ]);

  assert.doesNotMatch(experienceTabsSource, /profileLabel/, 'ExperienceTabs should drop the profile label prop and rendering path entirely');
  assert.match(publicSource, /<ExperienceTabs/, 'About should reuse the existing trajectory tabs');
  assert.doesNotMatch(publicSource, /profileLabel/, 'About should not pass the parked profile label');
  assert.doesNotMatch(adminSource, /translationPage\.browserTabs\.profileLabel/, 'admin translation page should stop exposing the parked profile label editor');

  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built translation pages stop rendering the profile label.');
    return;
  }

  for (const locale of locales) {
    const relativePath = {
      es: 'dist/sobre-mi.html',
      en: 'dist/en/about.html',
      fr: 'dist/fr/a-propos.html',
      de: 'dist/de/ueber-mich.html',
      it: 'dist/it/chi-sono.html',
      ca: 'dist/ca/sobre-mi.html',
    }[locale];
    const html = await readBuiltHtml(relativePath);

    assert.doesNotMatch(
      html,
      new RegExp(escapeForRegex(expectedProfileLabels[locale])),
      `${relativePath} should stop rendering the parked profile label`,
    );
  }
});

test('Notion logo keeps its white tile and dark mark for contrast on ink arsenal tiles', async () => {
  const notionLogo = await readSource('public/images/tools/notion.svg');

  assert.match(notionLogo, /fill="white"/i, 'Notion mark should retain its white background tile on dark surfaces');
  assert.match(notionLogo, /fill="#000000"/i, 'Notion mark should retain the dark glyph on its white tile');
});

test('admin skill creation contracts require group-aware data and grouped editor controls', async () => {
  assert.throws(
    () => createEditableCollectionItem('skills', {
      label: { es: 'SEO técnico', en: 'Technical SEO', fr: 'SEO technique' },
    }, []),
    /grupo/i,
    'skill creation should require choosing translation vs seo before the item is created',
  );

  const groupedSkill = createEditableCollectionItem('skills', {
    group: 'seo',
    label: { es: 'SEO técnico', en: 'Technical SEO', fr: 'SEO technique' },
  }, []);

  assert.equal(groupedSkill.group, 'seo', 'skill creation should preserve the chosen group in site data');

  const [adminSource, editorSource] = await Promise.all([
    readSource('src/pages/admin/translation-seo.astro'),
    readSource('src/components/admin/AdminTranslationArsenalEditor.tsx'),
  ]);

  assert.match(adminSource, /i18nKey={`translationServicePage\.localization\.items\.\$\{index\}\.title`}/, 'admin services should expose editable localization service titles');
  assert.match(adminSource, /i18nKey={`translationServicePage\.localization\.items\.\$\{index\}\.description`}/, 'admin services should expose editable localization descriptions');
  assert.match(adminSource, /i18nKey={`translationServicePage\.digitalContent\.items\.\$\{index\}\.title`}/, 'admin services should expose editable digital-content titles');
  assert.doesNotMatch(adminSource, /translationPage\.heroMark|translationPage\.hero\.ctaPrimary|translationPage\.services\.items/);
  assert.match(
    editorSource,
    /<select[\s\S]*translation[\s\S]*seo/s,
    'skill editing UI should expose a translation-vs-seo group selector',
  );
});

function extractArsenalPanel(source, panelKind, label) {
  const start = source.indexOf(`data-admin-arsenal-panel="${panelKind}"`);
  assert.notEqual(start, -1, `expected to find ${label} panel marker`);
  const end = source.indexOf('</article>', start);
  assert.notEqual(end, -1, `expected to find ${label} panel closing tag`);
  return source.slice(start, end);
}

test('language editor keeps its add marker inside the languages panel after the authored rows', async () => {
  const editorSource = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');
  const languagesPanel = extractArsenalPanel(editorSource, 'languages', 'languages');

  assert.match(
    languagesPanel,
    /languages\.map\(\(language, index\) => \([\s\S]*data-collection-add="languages"/s,
    'language editor should render data-collection-add="languages" after the mapped language rows within the languages panel',
  );
});

test('tool editor reserves a dashed add tile inside the same tool grid as existing logos', async () => {
  const editorSource = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');
  const toolsPanel = extractArsenalPanel(editorSource, 'tools', 'tools');

  assert.match(
    toolsPanel,
    /tools\.map\(\(tool, index\) => \([\s\S]*data-collection-add="tools"[\s\S]*aspect-square w-full min-w-0[\s\S]*border-dashed/s,
    'tool editor should render a dashed same-size add tile inside the tool collection grid',
  );
});

test('skill editor splits translation and seo into separate contained groups with their own add markers', async () => {
  const editorSource = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');
  const skillsPanel = extractArsenalPanel(editorSource, 'skills', 'skills');

  assert.match(
    skillsPanel,
    /data-skill-group="translation"[\s\S]*data-collection-add="skills-translation"/s,
    'translation skill group should contain its own skills-translation add marker',
  );
  assert.match(
    skillsPanel,
    /data-skill-group="seo"[\s\S]*data-collection-add="skills-seo"/s,
    'seo skill group should contain its own skills-seo add marker',
  );
});

test('About page and admin editor expose the current education and experience sections', async () => {
  const [publicSource, adminSource, experienceTabsSource, experienceEditorSource] = await Promise.all([
    readSource('src/views/AboutPage.astro'),
    readSource('src/pages/admin/about.astro'),
    readSource('src/components/translation/ExperienceTabs.tsx'),
    readSource('src/components/admin/AdminTranslationExperienceEditor.tsx'),
  ]);

  assert.match(publicSource, /data-about-trajectory/, 'About should show the education and experience section');
  assert.match(publicSource, /page\.trajectoryEyebrow/, 'About should render its unnumbered trajectory eyebrow');
  assert.match(publicSource, /i\.translationPage\.experienceSectionTitle/, 'About should render the trajectory title');
  assert.match(adminSource, /aboutPage\.trajectoryEyebrow/, 'About admin should expose the editable trajectory eyebrow');
  assert.match(adminSource, /translationPage\.experienceSectionTitle/, 'About admin should expose the editable trajectory title');
  assert.match(adminSource, /<AdminTranslationExperienceEditor/);
  assert.match(experienceTabsSource, /rounded-t-\[7px\]/, 'public browser tabs should use modest browser-tab corners');
  assert.match(experienceTabsSource, /bg-paper\/14/, 'public browser tabs should keep the paper/14 inactive fill');
  assert.match(experienceTabsSource, /border-paper bg-paper text-ink/, 'public browser tabs should keep the paper active fill');
  assert.doesNotMatch(
    experienceTabsSource,
    /role="tab"[\s\S]{0,260}(rounded-full|rounded-t-2xl)/s,
    'browser tabs should remove pill or oversized rounded tab controls while allowing the chrome indicator dot',
  );
  assert.doesNotMatch(experienceTabsSource, /shadow-\[/, 'browser tabs should remove the floating shadow card');
  assert.match(
    experienceTabsSource,
    /role="tablist"[\s\S]{0,260}h-2 w-2 rounded-full bg-amaranth/s,
    'browser tab chrome should add the small amaranth browser dot ahead of the tabs',
  );
  assert.doesNotMatch(adminSource, /data-admin-experience-trigger/, 'About admin should delegate browser tab triggers to the integrated experience editor');
  assert.match(experienceEditorSource, /data-admin-experience-trigger="education"/, 'the integrated experience editor should keep the education trigger');
  assert.match(experienceEditorSource, /data-admin-experience-trigger="experience"/, 'the integrated experience editor should keep the experience trigger');
  assert.match(experienceEditorSource, /rounded-t-\[7px\]/, 'the integrated experience editor should mirror the modest top-corner radius');
  assert.match(experienceEditorSource, /bg-paper\/14/, 'the integrated experience editor should mirror the paper\/14 inactive fill');
  assert.match(experienceEditorSource, /border-paper bg-paper text-ink/, 'the integrated experience editor should mirror the paper active fill');
  assert.doesNotMatch(experienceEditorSource, /data-admin-experience-trigger="education"[\s\S]{0,220}rounded-t-2xl/s, 'the integrated experience editor should not use the old pill radius');

});

test('admin Translation page contains the current editable localization and digital-content sections', async () => {
  const adminSource = await readSource('src/pages/admin/translation-seo.astro');
  assert.match(adminSource, /translationServicePage\.localization\.title/);
  assert.match(adminSource, /translationServicePage\.localization\.items\.\$\{index\}\.title/);
  assert.match(adminSource, /translationServicePage\.localization\.items\.\$\{index\}\.description/);
  assert.match(adminSource, /translationServicePage\.multilingualSeo\.description/);
  assert.match(adminSource, /translationServicePage\.digitalContent\.items\.\$\{index\}\.title/);
  assert.match(adminSource, /<AdminTranslationArsenalEditor/);
  assert.doesNotMatch(adminSource, /data-admin-methodology|data-admin-why|translationPage\.methodology/);
});

test('existing Home and UGC stable markers stay untouched by the translation correction work', async () => {
  const [homeSource, ugcSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/views/UgcPage.astro'),
  ]);

  assert.match(homeSource, /data-home-orbit/, 'Home should keep the approved orbit section marker');
  assert.match(homeSource, /i\.home\.orbit\.title/, 'Home should keep the approved orbit copy wiring');
  assert.match(homeSource, /i\.home\.orbit\.index/, 'Home should keep the approved orbit index marker');
  assert.match(ugcSource, /data-ugc-hero/, 'UGC should keep the approved hero marker');
  assert.match(ugcSource, /<UgcContactSheet\b/, 'UGC should keep the shared contact-sheet composition');
  assert.match(ugcSource, /i\.ugcPage\.contactSheet\.headline/, 'UGC should keep the approved contact-sheet headline wiring');
});
