import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';
import { getTranslationArsenalColumns } from '../src/lib/translationPage.js';
import * as orbitMedia from '../src/lib/orbitMedia.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
}

function getPath(value, pathToValue) {
  return pathToValue.split('.').reduce((current, key) => current?.[key], value);
}

test('requested page labels are independently editable while navigation labels remain shared', async () => {
  const bindings = [
    ['src/views/HomePage.astro', 'src/pages/admin/index.astro', 'home.about.eyebrow', 'home.about.eyebrow'],
    ['src/views/AboutPage.astro', 'src/pages/admin/about.astro', 'page.hero.eyebrow', 'aboutPage.hero.eyebrow'],
    ['src/views/AboutPage.astro', 'src/pages/admin/about.astro', 'page.principles.eyebrow', 'aboutPage.principles.eyebrow'],
    ['src/views/SeoServicePage.astro', 'src/pages/admin/seo.astro', 'page.services.eyebrow', 'seoPage.services.eyebrow'],
    ['src/views/SeoServicePage.astro', 'src/pages/admin/seo.astro', 'page.international.eyebrow', 'seoPage.international.eyebrow'],
    ['src/views/SeoServicePage.astro', 'src/pages/admin/seo.astro', 'page.why.eyebrow', 'seoPage.why.eyebrow'],
    ['src/views/SeoServicePage.astro', 'src/pages/admin/seo.astro', 'page.budget.eyebrow', 'seoPage.budget.eyebrow'],
    ['src/views/TranslationServicePage.astro', 'src/pages/admin/translation-seo.astro', 'page.localization.eyebrow', 'translationServicePage.localization.eyebrow'],
    ['src/views/TranslationServicePage.astro', 'src/pages/admin/translation-seo.astro', 'page.multilingualSeo.eyebrow', 'translationServicePage.multilingualSeo.eyebrow'],
    ['src/views/TranslationServicePage.astro', 'src/pages/admin/translation-seo.astro', 'page.digitalContent.eyebrow', 'translationServicePage.digitalContent.eyebrow'],
    ['src/views/UgcPage.astro', 'src/pages/admin/ugc.astro', 'ugcPage.hero.eyebrow', 'ugcPage.hero.eyebrow'],
    ['src/views/UgcPage.astro', 'src/pages/admin/ugc.astro', 'ugcPage.benefits.eyebrow', 'ugcPage.benefits.eyebrow'],
    ['src/views/UgcPage.astro', 'src/pages/admin/ugc.astro', 'ugcPage.process.eyebrow', 'ugcPage.process.eyebrow'],
  ];
  const sourcePaths = [...new Set(bindings.flatMap(([publicPath, adminPath]) => [publicPath, adminPath]))];
  const sources = Object.fromEntries(await Promise.all(
    sourcePaths.map(async (sourcePath) => [sourcePath, await readSource(sourcePath)]),
  ));

  for (const [publicPath, adminPath, publicKey, adminKey] of bindings) {
    assert.ok(sources[publicPath].includes(publicKey), `${publicPath} should render its own ${publicKey} label`);
    assert.ok(sources[adminPath].includes(`i18nKey="${adminKey}"`), `${adminPath} should edit ${adminKey} independently`);
  }

  const [header, footer] = await Promise.all([
    readSource('src/components/Header.astro'),
    readSource('src/components/Footer.astro'),
  ]);
  assert.doesNotMatch(sources['src/views/HomePage.astro'], /i\.nav\.about/);
  assert.doesNotMatch(sources['src/views/AboutPage.astro'], /i\.nav\.about/);
  assert.doesNotMatch(sources['src/views/SeoServicePage.astro'], /i\.nav\.seo/);
  assert.doesNotMatch(sources['src/views/TranslationServicePage.astro'], /i\.nav\.(seo|translation)/);
  assert.doesNotMatch(sources['src/views/UgcPage.astro'], /i\.ugcPage\.contactSheet\.eyebrow/);
  assert.match(header, /i\.nav\.about/);
  assert.match(header, /i\.nav\.seo/);
  assert.match(header, /i\.nav\.translation/);
  assert.match(footer, /nav\.about/);
  assert.match(footer, /nav\.seo/);
  assert.match(footer, /nav\.translation/);

  for (const locale of locales) {
    const dictionary = await readJson(`src/i18n/${locale}.json`);
    for (const [, , , key] of bindings) {
      const label = getPath(dictionary, key);
      assert.equal(typeof label, 'string', `${locale} should define ${key}`);
      assert.notEqual(label.trim(), '', `${locale} ${key} should not be empty`);
    }
  }
});

test('AdminStore keeps navigation labels separate from page section labels', async () => {
  const [site, ...dictionaries] = await Promise.all([
    readJson('src/data/site.json'),
    ...locales.map((locale) => readJson(`src/i18n/${locale}.json`)),
  ]);
  const store = new AdminStore();
  store.init(Object.fromEntries(locales.map((locale, index) => [locale, dictionaries[index]])), site, 'es', '');
  const sections = [
    { nav: 'nav.about', keys: ['home.about.eyebrow', 'aboutPage.hero.eyebrow', 'aboutPage.principles.eyebrow'] },
    { nav: 'nav.seo', keys: ['seoPage.services.eyebrow', 'seoPage.international.eyebrow', 'seoPage.why.eyebrow', 'seoPage.budget.eyebrow'] },
    { nav: 'nav.translation', keys: ['translationServicePage.localization.eyebrow', 'translationServicePage.multilingualSeo.eyebrow', 'translationServicePage.digitalContent.eyebrow'] },
  ];

  for (const section of sections) {
    const sectionLabels = section.keys.map((key) => store.getSnapshot().getText(key));
    store.setText(section.nav, `Nav ${section.nav}`);
    assert.deepEqual(
      section.keys.map((key) => store.getSnapshot().getText(key)),
      sectionLabels,
      `${section.nav} edits should not mutate page section labels`,
    );
  }

  const navLabel = store.getSnapshot().getText('nav.about');
  store.setText('aboutPage.hero.eyebrow', 'Etiqueta independiente');
  assert.equal(store.getSnapshot().getText('nav.about'), navLabel);
  assert.equal(store.getSnapshot().getText('aboutPage.hero.eyebrow'), 'Etiqueta independiente');
});

test('Home service rows render the authored localized descriptions in public and admin', async () => {
  const [home, adminHome, spanish] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/pages/admin/index.astro'),
    readJson('src/i18n/es.json'),
  ]);

  assert.deepEqual(spanish.home.services.descriptions, {
    seo: 'Estrategias On-Page, optimización técnica y arquitectura web diseñadas para escalar en los resultados de búsqueda de Google.',
    translation: 'Adaptación lingüística profesional con enfoque SEO para internacionalizar tu e-commerce o proyecto digital sin perder naturalidad.',
    ugc: 'Producción audiovisual orgánica (Reels, TikToks y Ads) para conectar de forma auténtica con tu audiencia y mejorar tu tasa de conversión.',
  });
  assert.match(home, /service\.description/);
  assert.match(adminHome, /descriptionKey:\s*'home\.services\.descriptions\./);
  assert.match(adminHome, /service\.descriptionKey/);

  for (const locale of locales) {
    const descriptions = (await readJson(`src/i18n/${locale}.json`)).home.services.descriptions;
    assert.deepEqual(Object.keys(descriptions).sort(), ['seo', 'translation', 'ugc']);
    Object.entries(descriptions).forEach(([service, description]) => {
      assert.notEqual(description.trim(), '', `${locale} ${service} service description should be present`);
    });
  }
});

test('translation and SEO admin arsenals show only the tools and skills in their public service pages', async () => {
  const site = await readJson('src/data/site.json');
  const translation = getTranslationArsenalColumns('es', site, 'translation');
  const seo = getTranslationArsenalColumns('es', site, 'seo');
  const [translationAdmin, seoAdmin, editor] = await Promise.all([
    readSource('src/pages/admin/translation-seo.astro'),
    readSource('src/pages/admin/seo.astro'),
    readSource('src/components/admin/AdminTranslationArsenalEditor.tsx'),
  ]);

  assert.deepEqual(
    translation.tools.map(({ id }) => id).sort(),
    ['google-workspace', 'microsoft-office', 'notion', 'tool-claude', 'tool-omegat'].sort(),
  );
  assert.deepEqual(
    seo.tools.map(({ id }) => id).sort(),
    ['google-business-profile', 'google-search-console'].sort(),
  );
  assert.ok(translation.skills.every((skill) => skill.group === 'translation'));
  assert.ok(seo.skills.every((skill) => skill.group === 'seo'));
  assert.match(translationAdmin, /<AdminTranslationArsenalEditor[^>]*scope="translation"/);
  assert.match(seoAdmin, /<AdminTranslationArsenalEditor[^>]*scope="seo"/);
  assert.match(editor, /getArsenalToolGroup\(item\)\s*===\s*scope/);
  assert.match(editor, /groupedSkills\[scope\]/);
  assert.match(editor, /scope\s*===\s*'translation'[\s\S]*data-admin-arsenal-panel="languages"/);
  assert.match(editor, /group:\s*scope/);
});

test('mobile orbit uses portrait geometry with enough room for every tile', () => {
  const geometry = orbitMedia.MOBILE_ORBIT_GEOMETRY;

  assert.deepEqual(geometry, {
    width: 320,
    height: 480,
    radiusX: 108,
    radiusY: 170,
    tiltDeg: 0,
  });

  for (let index = 0; index < 15; index += 1) {
    const { point } = orbitMedia.getOrbitItemLayout(index / 15, index, 15, geometry);
    assert.ok(Math.abs(point.x) + 37 <= geometry.width / 2, `tile ${index} should fit within the mobile orbit width`);
    assert.ok(Math.abs(point.y) + 47 <= geometry.height / 2, `tile ${index} should fit within the mobile orbit height`);
  }
});

test('mobile orbit switches to portrait layout and keeps its home grid item shrinkable', async () => {
  const [orbit, adminPreview, home, adminHome] = await Promise.all([
    readSource('src/components/OvalMediaOrbit.tsx'),
    readSource('src/components/admin/AdminOrbitPreview.tsx'),
    readSource('src/views/HomePage.astro'),
    readSource('src/pages/admin/index.astro'),
  ]);

  assert.match(orbit, /matchMedia\('\(max-width:\s*767px\)'\)/);
  assert.match(orbit, /aspect-\[2\/3\][\s\S]*md:aspect-\[720\/440\]/);
  assert.match(adminPreview, /aspect-\[2\/3\][\s\S]*md:aspect-\[720\/440\]/);
  assert.match(home, /order-4 min-w-0 w-full/);
  assert.match(adminHome, /min-w-0 w-full lg:col-start-2/);
});

test('desktop Home hero gives “Consultora SEO Freelance” enough width', async () => {
  const css = await readSource('src/styles/global.css');
  const desktopRules = css.slice(css.indexOf('@media (min-width: 1024px)'));

  assert.match(
    desktopRules,
    /\.home-hero__copy\s*\{[^}]*max-width:\s*none;[^}]*\}/s,
  );
  assert.match(
    desktopRules,
    /\.home-hero__title\s*\{[^}]*max-width:\s*26ch;[^}]*font-size:\s*clamp\(2\.75rem,\s*4\.35vw,\s*4rem\);/s,
  );
});

test('admin toolbar menu scrolls within the viewport instead of clipping at the top', async () => {
  const source = await readSource('src/components/admin/AdminToolbar.tsx');

  assert.match(source, /max-h-\[calc\(100dvh-7rem\)\]/);
  assert.match(source, /overflow-y-auto/);
  assert.match(source, /overscroll-contain/);
});
