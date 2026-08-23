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

function assertNonEmptyString(value, label) {
  assert.equal(typeof value, 'string', `${label} should be a string`);
  assert.notEqual(value.trim(), '', `${label} should not be empty`);
}

function extractSectionByDataAttribute(source, attribute, label) {
  const match = source.match(new RegExp(`<section\\b(?=[^>]*\\b${attribute}\\b)[\\s\\S]*?<\\/section>`));
  assert.ok(match, `${label} should expose ${attribute}`);
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

    assertNonEmptyString(page.heroMark, `${locale} translationPage.heroMark`);
    assertNonEmptyString(page.servicesEyebrow, `${locale} translationPage.servicesEyebrow`);
    assertNonEmptyString(page.arsenalEyebrow, `${locale} translationPage.arsenalEyebrow`);
    assertNonEmptyString(page.experienceSectionTitle, `${locale} translationPage.experienceSectionTitle`);
    assertNonEmptyString(page.experienceEyebrow, `${locale} translationPage.experienceEyebrow`);
    assertNonEmptyString(page.methodologyEyebrow, `${locale} translationPage.methodologyEyebrow`);
    assertNonEmptyString(page.methodologyDisplayTitle, `${locale} translationPage.methodologyDisplayTitle`);
    assertNonEmptyString(page.whyEyebrow, `${locale} translationPage.whyEyebrow`);
    assert.deepEqual(
      Object.keys(page.skillGroups ?? {}).sort(),
      ['seo', 'translation'],
      `${locale} translationPage.skillGroups should expose exactly translation and seo titles`,
    );
    assertNonEmptyString(page.skillGroups.translation, `${locale} translationPage.skillGroups.translation`);
    assertNonEmptyString(page.skillGroups.seo, `${locale} translationPage.skillGroups.seo`);

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

test('public translation hero stays flat and replaces the side card with a vertical mark plus rectangular CTAs', async () => {
  const source = await readSource('src/views/TranslationSeoPage.astro');
  const heroWindow = extractWindowAround(source, 'page.hero.title', 'public translation hero');

  assert.match(source, /page\.heroMark/, 'public translation hero should render the new localized vertical hero mark');
  assert.doesNotMatch(heroWindow, /bg-\[radial-gradient/i, 'public translation hero should not restore the radial gradient');
  assert.doesNotMatch(source, /page\.hero\.backgroundLabel/, 'public translation hero should remove the old right-side background label card');
  assert.doesNotMatch(heroWindow, /backdrop-blur|shadow-\[/, 'public translation hero should stay flat without the right-side card chrome');
  assert.doesNotMatch(heroWindow, /rounded-full/, 'public translation hero CTAs should be rectangular instead of pill-shaped');
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

test('public arsenal uses the exact flush frame ratio, six language rows, three-column tool cells, and two skill groups', async () => {
  const source = await readSource('src/views/TranslationSeoPage.astro');
  const arsenalSection = extractSectionByDataAttribute(source, 'data-arsenal-section', 'public arsenal section');

  assert.match(arsenalSection, /page\.arsenalEyebrow/, 'public arsenal should render the new localized eyebrow');
  assert.match(arsenalSection, /lg:grid-cols-\[0\.82fr_0\.88fr_1\.3fr\]/, 'public arsenal should keep the approved column ratio');
  assert.doesNotMatch(arsenalSection, /sm:grid-cols-2/, 'public arsenal languages/tools should stop using the old two-column card grids');
  assert.match(arsenalSection, /grid-cols-3/, 'public arsenal tools should use the approved three-column equal-cell grid');
  assert.match(arsenalSection, /page\.skillGroups\.translation/, 'public arsenal should render the translation skill-group title');
  assert.match(arsenalSection, /page\.skillGroups\.seo/, 'public arsenal should render the seo skill-group title');
  assert.match(arsenalSection, /arsenalColumns\.skillGroups\.translation/, 'public arsenal should render grouped translation skills from the helper');
  assert.match(arsenalSection, /arsenalColumns\.skillGroups\.seo/, 'public arsenal should render grouped seo skills from the helper');
  assert.doesNotMatch(arsenalSection, /shadow-\[/, 'public arsenal should not revert to separate shadow cards');
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
    readSource('src/components/admin/EditableCollection.tsx'),
  ]);

  assert.match(adminSource, /i18nKey={`translationPage\.services\.items\.\$\{index\}\.headline`}/, 'admin services should expose editable service headlines');
  assert.match(adminSource, /i18nKey="translationPage\.heroMark"/, 'admin hero should expose the editable vertical hero mark');
  assert.match(
    editorSource,
    /<select[\s\S]*translation[\s\S]*seo/s,
    'skill editing UI should expose a translation-vs-seo group selector',
  );
  assert.match(editorSource, /border-dashed/, 'tool adding UI should reserve a same-size dashed tile inside the tool grid');
});

test('experience browser chrome plus methodology and why sections expose the new correction markers', async () => {
  const [publicSource, adminSource, experienceTabsSource] = await Promise.all([
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
    readSource('src/components/translation/ExperienceTabs.tsx'),
  ]);

  const methodologySection = extractSectionByDataAttribute(publicSource, 'data-methodology-section', 'public methodology section');
  const whySection = extractSectionByDataAttribute(publicSource, 'data-why-section', 'public why section');

  assert.match(publicSource, /page\.experienceEyebrow/, 'public translation page should render the experience eyebrow');
  assert.match(publicSource, /page\.experienceSectionTitle/, 'public translation page should render the typed experience section title');
  assert.match(adminSource, /i18nKey="translationPage\.experienceEyebrow"/, 'admin translation page should expose the editable experience eyebrow');
  assert.match(adminSource, /i18nKey="translationPage\.experienceSectionTitle"/, 'admin translation page should expose the editable experience title');
  assert.doesNotMatch(experienceTabsSource, /rounded-full/, 'browser tabs should remove the rounded pill controls');
  assert.doesNotMatch(experienceTabsSource, /shadow-\[/, 'browser tabs should remove the floating shadow card');
  assert.match(
    experienceTabsSource,
    /role="tablist"[\s\S]{0,260}h-2 w-2 rounded-full bg-amaranth/s,
    'browser tab chrome should add the small amaranth browser dot ahead of the tabs',
  );

  assert.match(methodologySection, /page\.methodologyEyebrow/, 'methodology should render the new eyebrow');
  assert.match(methodologySection, /page\.methodologyDisplayTitle/, 'methodology should render the new display title');
  assert.match(methodologySection, /data-methodology-connector/, 'methodology should keep a stable connector marker');
  assert.doesNotMatch(methodologySection, /bg-white\/5/, 'methodology steps should remove the old filled inner cards');

  assert.match(whySection, /page\.whyEyebrow/, 'why section should render the new eyebrow');
  assert.match(whySection, /\[\s*0\$\{index \+ 1\}\s*\]/, 'why cards should switch to inline bracketed numbers');
  assert.doesNotMatch(whySection, /gap-6/, 'why cards should become a flush grid without the old gaps');
  assert.doesNotMatch(whySection, /shadow-\[/, 'why cards should remove the old white card shadows');
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
