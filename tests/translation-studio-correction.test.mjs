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

test('site arsenal skills keep the exact 4/4 translation-vs-seo split and grouped helper output', async () => {
  const site = await readJson('src/data/site.json');

  assert.equal(site.arsenal.skills.length, 8, 'arsenal.skills should stay at exactly eight authored records');

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
    ].sort(),
    'seo skill group should keep the approved four SEO/web-content skills',
  );

  const columns = getTranslationArsenalColumns('es', site);
  assert.equal(columns.languages.length, 6, 'arsenal helper should keep six language rows');
  assert.equal(columns.tools.length, 7, 'arsenal helper should keep seven tool tiles');
  assert.deepEqual(
    Object.keys(columns.skillGroups ?? {}).sort(),
    ['seo', 'translation'],
    'arsenal helper should expose grouped skill columns instead of one flat list',
  );
  assert.equal(columns.skillGroups.translation.length, 4, 'translation helper column should keep four skills');
  assert.equal(columns.skillGroups.seo.length, 4, 'seo helper column should keep four skills');
});

test('public translation hero source/build contract parks the portfolio CTA and keeps the localized contact CTA anchor with stable markers and rectangular shape', async (t) => {
  const source = await readSource('src/views/TranslationSeoPage.astro');
  const heroWindow = extractWindowAround(source, 'page.hero.title', 'public translation hero');
  const contactCta = extractElementByDataAttribute(source, 'a', 'data-translation-cta', 'contact', 'public translation contact CTA');

  assert.doesNotMatch(source, /page\.heroMark/, 'public translation hero should stop rendering the vertical hero mark');
  assert.doesNotMatch(source, /data-translation-cta="portfolio"/, 'public translation hero should stop rendering the parked portfolio CTA anchor');
  assert.match(contactCta, /href=\{getLocalizedPath\('\/contact', lang\)\}/, 'public translation hero should keep the localized contact CTA anchor');
  assert.doesNotMatch(heroWindow, /bg-\[radial-gradient/i, 'public translation hero should not restore the radial gradient');
  assert.doesNotMatch(source, /page\.hero\.backgroundLabel/, 'public translation hero should remove the old right-side background label card');
  assert.doesNotMatch(heroWindow, /backdrop-blur/, 'public translation hero should stay flat without blur chrome');
  assert.doesNotMatch(contactCta, /rounded-full/, 'public translation contact CTA should be rectangular instead of pill-shaped');
  assert.match(contactCta, /hover:-translate-y-0\.5/, 'public translation contact CTA should lift on hover');
  assert.match(contactCta, /focus-visible:-translate-y-0\.5/, 'public translation contact CTA should lift on focus');
  assert.match(contactCta, /hover:shadow-\[0_4px_0_var\(--color-ink\)\]/, 'public translation contact CTA should add the exact bottom shadow on hover');
  assert.match(contactCta, /focus-visible:shadow-\[0_4px_0_var\(--color-ink\)\]/, 'public translation contact CTA should add the exact bottom shadow on focus');
  assert.doesNotMatch(contactCta, /hover:border-amaranth|hover:text-amaranth|focus-visible:border-amaranth|focus-visible:text-amaranth/, 'public translation contact CTA should keep strict colors');

  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built translation hero CTA anchors.');
    return;
  }

  for (const locale of locales) {
    const relativePath = locale === 'es' ? 'dist/translation-seo/index.html' : `dist/${locale}/translation-seo/index.html`;
    const contactHref = locale === 'es' ? '/contact' : `/${locale}/contact`;
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
    assert.doesNotMatch(
      builtContactCta,
      /rounded-full/,
      `${relativePath} should keep the contact CTA rectangular in built HTML`,
    );
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

test('public arsenal uses exact equal thirds, square tool cells, and two skill groups while admin mounts the integrated arsenal editor', async () => {
  const [source, adminSource, adminEditorSource] = await Promise.all([
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
    readSource('src/components/admin/AdminTranslationArsenalEditor.tsx'),
  ]);
  const arsenalSection = extractSectionByDataAttribute(source, 'data-arsenal-section', 'public arsenal section');

  assert.match(arsenalSection, /page\.arsenalEyebrow/, 'public arsenal should render the new localized eyebrow');
  assert.match(arsenalSection, /lg:grid-cols-3/, 'public arsenal should keep the approved equal-third desktop grid');
  assert.doesNotMatch(arsenalSection, /lg:grid-cols-\[/, 'public arsenal should not revert to weighted fraction columns');
  assert.doesNotMatch(arsenalSection, /sm:grid-cols-2/, 'public arsenal languages/tools should stop using the old two-column card grids');
  assert.match(arsenalSection, /grid-cols-3 gap-2/, 'public arsenal tools should use the approved three-column equal-cell grid with 8px gaps');
  assert.match(arsenalSection, /page\.skillGroups\.translation/, 'public arsenal should render the translation skill-group title');
  assert.match(arsenalSection, /page\.skillGroups\.seo/, 'public arsenal should render the seo skill-group title');
  assert.match(arsenalSection, /arsenalColumns\.skillGroups\.translation/, 'public arsenal should render grouped translation skills from the helper');
  assert.match(arsenalSection, /arsenalColumns\.skillGroups\.seo/, 'public arsenal should render grouped seo skills from the helper');
  assert.doesNotMatch(arsenalSection, /shadow-\[/, 'public arsenal should not revert to separate shadow cards');
  assert.match(arsenalSection, /flex items-center justify-between gap-4 border-b border-ink\/10 py-3/, 'public arsenal languages should render compact flex rows');
  assert.match(arsenalSection, /text-sm font-medium text-amaranth/, 'public arsenal language level should sit right in amaranth');
  assert.match(arsenalSection, /group flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-3 bg-ink px-3 py-4 text-center text-paper transition hover:bg-amaranth hover:text-ink/, 'public arsenal tools should use dark square tiles with amaranth hover');
  assert.doesNotMatch(arsenalSection, /bg-paper px-3 py-4/, 'public arsenal tools should not reintroduce light paper tiles');
  assert.match(adminSource, /import\s+AdminTranslationArsenalEditor\s+from\s+['"]..\/..\/components\/admin\/AdminTranslationArsenalEditor['"]/, 'admin translation page should import the integrated arsenal editor');
  assert.match(adminSource, /<AdminTranslationArsenalEditor\s+client:load\s*\/>/, 'admin translation page should mount the integrated arsenal editor');
  assert.doesNotMatch(adminSource, /arsenalColumns\.languages\.map/, 'admin translation page should stop using static Astro loops for arsenal languages');
  assert.doesNotMatch(adminSource, /arsenalColumns\.tools\.map/, 'admin translation page should stop using static Astro loops for arsenal tools');
  assert.doesNotMatch(adminSource, /arsenalColumns\.skillGroups\.translation/, 'admin translation page should stop using static Astro loops for translation skills');
  assert.match(adminEditorSource, /lg:grid-cols-3/, 'admin editor should mirror the equal-third desktop grid');
  assert.match(adminEditorSource, /group relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-3 bg-ink px-3 py-4 text-center text-paper transition hover:bg-amaranth hover:text-ink/, 'admin editor should mirror the public square tool tiles');
});

test('experience browser profile chrome parks the profile label so it stops rendering in source and built translation pages', async (t) => {
  const [experienceTabsSource, publicSource, adminSource] = await Promise.all([
    readSource('src/components/translation/ExperienceTabs.tsx'),
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
  ]);

  assert.doesNotMatch(experienceTabsSource, /profileLabel/, 'ExperienceTabs should drop the profile label prop and rendering path entirely');
  assert.doesNotMatch(publicSource, /profileLabel=\{page\.browserTabs\.profileLabel\}/, 'public translation page should stop passing the parked profile label');
  assert.doesNotMatch(adminSource, /translationPage\.browserTabs\.profileLabel/, 'admin translation page should stop exposing the parked profile label editor');

  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built translation pages stop rendering the profile label.');
    return;
  }

  for (const locale of locales) {
    const relativePath = locale === 'es' ? 'dist/translation-seo/index.html' : `dist/${locale}/translation-seo/index.html`;
    const html = await readBuiltHtml(relativePath);

    assert.doesNotMatch(
      html,
      new RegExp(escapeForRegex(expectedProfileLabels[locale])),
      `${relativePath} should stop rendering the parked profile label`,
    );
  }
});

test('tool logos rendered on ink arsenal tiles keep sufficient default contrast', async () => {
  const notionLogo = await readSource('public/images/tools/notion.svg');

  assert.match(notionLogo, /#F4F5F1/i, 'Notion logo should switch to the paper tone for dark arsenal tiles');
  assert.doesNotMatch(notionLogo, /#2D2D2D/i, 'Notion logo should not keep the old near-black stroke on ink tiles');
});

test('admin skill creation contracts require group-aware data and grouped editor controls', async () => {
  assert.throws(
    () => createEditableCollectionItem('skills', {
      label: { es: 'SEO técnico', en: 'Technical SEO', fr: 'SEO technique' },
    }, []),
    /group/i,
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

  assert.match(adminSource, /i18nKey={`translationPage\.services\.items\.\$\{index\}\.headline`}/, 'admin services should expose editable service headlines');
  assert.doesNotMatch(adminSource, /i18nKey="translationPage\.heroMark"/, 'admin hero should stop exposing the hidden vertical hero mark');
  assert.doesNotMatch(adminSource, /i18nKey="translationPage\.hero\.ctaPrimary"/, 'admin hero should stop exposing the parked primary CTA key');
  assert.match(adminSource, /i18nKey="translationPage\.hero\.ctaSecondary"/, 'admin hero should expose the editable secondary CTA key');
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

test('experience browser chrome plus methodology and why sections expose the new correction markers', async () => {
  const [publicSource, adminSource, experienceTabsSource, experienceEditorSource] = await Promise.all([
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
    readSource('src/components/translation/ExperienceTabs.tsx'),
    readSource('src/components/admin/AdminTranslationExperienceEditor.tsx'),
  ]);

  const methodologySection = extractSectionByDataAttribute(publicSource, 'data-methodology-section', 'public methodology section');
  const whySection = extractSectionByDataAttribute(publicSource, 'data-why-section', 'public why section');

  assert.match(publicSource, /page\.experienceEyebrow/, 'public translation page should render the experience eyebrow');
  assert.match(publicSource, /page\.experienceSectionTitle/, 'public translation page should render the typed experience section title');
  assert.match(adminSource, /i18nKey="translationPage\.experienceEyebrow"/, 'admin translation page should expose the editable experience eyebrow');
  assert.match(adminSource, /i18nKey="translationPage\.experienceSectionTitle"/, 'admin translation page should expose the editable experience title');
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
  assert.doesNotMatch(adminSource, /data-admin-experience-trigger/, 'admin translation page should delegate browser tab triggers to the integrated experience editor');
  assert.match(experienceEditorSource, /data-admin-experience-trigger="education"/, 'the integrated experience editor should keep the education trigger');
  assert.match(experienceEditorSource, /data-admin-experience-trigger="experience"/, 'the integrated experience editor should keep the experience trigger');
  assert.match(experienceEditorSource, /rounded-t-\[7px\]/, 'the integrated experience editor should mirror the modest top-corner radius');
  assert.match(experienceEditorSource, /bg-paper\/14/, 'the integrated experience editor should mirror the paper\/14 inactive fill');
  assert.match(experienceEditorSource, /border-paper bg-paper text-ink/, 'the integrated experience editor should mirror the paper active fill');
  assert.doesNotMatch(experienceEditorSource, /data-admin-experience-trigger="education"[\s\S]{0,220}rounded-t-2xl/s, 'the integrated experience editor should not use the old pill radius');

  assert.match(methodologySection, /page\.methodologyEyebrow/, 'methodology should render the new eyebrow');
  assert.match(methodologySection, /page\.methodologyDisplayTitle/, 'methodology should render the new display title');
  assert.match(methodologySection, /data-methodology-connector/, 'methodology should keep a stable connector marker');
  assert.doesNotMatch(methodologySection, /bg-white\/5/, 'methodology steps should remove the old filled inner cards');

  assert.match(whySection, /page\.whyEyebrow/, 'why section should render the new eyebrow');
  assert.match(whySection, /\[\s*0\$\{index \+ 1\}\s*\]/, 'why cards should switch to inline bracketed numbers');
  assert.doesNotMatch(whySection, /gap-6/, 'why cards should become a flush grid without the old gaps');
  assert.doesNotMatch(whySection, /shadow-\[/, 'why cards should remove the old white card shadows');
});

test('admin methodology and why sections keep editable parity markers, headings, and indexed loops', async () => {
  const adminSource = await readSource('src/pages/admin/translation-seo.astro');
  const adminMethodologySection = extractSectionByDataAttribute(adminSource, 'data-admin-methodology', 'admin methodology section');
  const adminWhySection = extractSectionByDataAttribute(adminSource, 'data-admin-why', 'admin why section');

  assert.match(adminMethodologySection, /i18nKey="translationPage\.methodologyEyebrow"/, 'admin methodology should expose the editable eyebrow key');
  assert.match(adminMethodologySection, /i18nKey="translationPage\.methodologyDisplayTitle"/, 'admin methodology should expose the editable display title key');
  assert.match(adminMethodologySection, /page\.methodology\.steps\.map/, 'admin methodology should keep looping the methodology steps collection');
  assert.match(
    adminMethodologySection,
    /i18nKey={`translationPage\.methodology\.steps\.\$\{index\}\.title`}/,
    'admin methodology should expose editable methodology step titles for every indexed step',
  );
  assert.match(
    adminMethodologySection,
    /i18nKey={`translationPage\.methodology\.steps\.\$\{index\}\.description`}/,
    'admin methodology should expose editable methodology step descriptions for every indexed step',
  );

  assert.match(adminWhySection, /i18nKey="translationPage\.whyEyebrow"/, 'admin why section should expose the editable eyebrow key');
  assert.match(adminWhySection, /i18nKey="translationPage\.whyChooseMe\.title"/, 'admin why section should expose the editable title key');
  assert.match(adminWhySection, /page\.whyChooseMe\.cards\.map/, 'admin why section should keep looping the why cards collection');
  assert.match(
    adminWhySection,
    /i18nKey={`translationPage\.whyChooseMe\.cards\.\$\{index\}\.title`}/,
    'admin why section should expose editable why card titles for every indexed card',
  );
  assert.match(
    adminWhySection,
    /i18nKey={`translationPage\.whyChooseMe\.cards\.\$\{index\}\.text`}/,
    'admin why section should expose editable why card text for every indexed card',
  );
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
