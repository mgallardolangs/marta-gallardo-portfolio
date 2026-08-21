import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EXPERIENCE_TAB_IDS,
  getNextExperienceTabIndex,
} from '../src/lib/experienceTabs.ts';
import {
  SERVICE_SWITCHER_INTERVAL_MS,
  advanceServiceTimer,
  getNextServiceIndex,
  restartServiceTimer,
  shouldPauseServiceTimer,
} from '../src/lib/serviceSwitcher.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
}

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function collectFiles(dirPath) {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const resolved = path.join(dirPath, entry.name);
    return entry.isDirectory() ? collectFiles(resolved) : [resolved];
  }));
  return files.flat();
}

test('all locale files expose the approved Phase 4 translation page chrome and titles', async () => {
  const dictionaries = await Promise.all(
    locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)]),
  );

  const expectedHeroTitles = {
    es: 'Servicios de Traducción, SEO y Localización',
    en: 'Translation, SEO & Localization Services',
    fr: 'Services de traduction, SEO et localisation',
    de: 'Übersetzungs-, SEO- und Lokalisierungsdienstleistungen',
    it: 'Servizi di traduzione, SEO e localizzazione',
    ca: 'Serveis de traducció, SEO i localització',
  };

  const expectedWhyChooseMeTitles = {
    es: '¿Por qué elegirme para tu proyecto?',
    en: 'Why choose me for your project?',
    fr: 'Pourquoi me choisir pour votre projet ?',
    de: 'Warum sollten Sie mich für Ihr Projekt wählen?',
    it: 'Perché scegliermi per il tuo progetto?',
    ca: 'Per què escollir-me per al teu projecte?',
  };

  for (const [locale, dictionary] of dictionaries) {
    assert.equal(dictionary.translationPage.hero.title, expectedHeroTitles[locale]);
    assert.equal(typeof dictionary.translationPage.hero.ctaPrimary, 'string');
    assert.equal(typeof dictionary.translationPage.hero.ctaSecondary, 'string');
    assert.equal(typeof dictionary.translationPage.arsenal.title, 'string');
    assert.equal(typeof dictionary.translationPage.arsenal.languagesTitle, 'string');
    assert.equal(typeof dictionary.translationPage.arsenal.toolsTitle, 'string');
    assert.equal(typeof dictionary.translationPage.arsenal.skillsTitle, 'string');
    assert.deepEqual(
      Object.keys(dictionary.translationPage.browserTabs).sort(),
      ['education', 'experience'],
      `${locale} browser tabs should expose exactly education and experience labels`,
    );
    assert.equal(dictionary.translationPage.whyChooseMe.title, expectedWhyChooseMeTitles[locale]);
    assert.equal(dictionary.translationPage.methodology.steps.length, 4, `${locale} should keep four methodology steps`);
  }
});

test('service switcher timer helper rotates, pauses, and restarts from zero', () => {
  assert.equal(SERVICE_SWITCHER_INTERVAL_MS, 6000);
  assert.equal(getNextServiceIndex(0, 3), 1);
  assert.equal(getNextServiceIndex(2, 3), 0);

  assert.equal(
    shouldPauseServiceTimer({
      itemCount: 3,
      isHovered: true,
      isFocusWithin: false,
      isDocumentHidden: false,
      prefersReducedMotion: false,
    }),
    true,
  );

  assert.equal(
    shouldPauseServiceTimer({
      itemCount: 3,
      isHovered: false,
      isFocusWithin: false,
      isDocumentHidden: false,
      prefersReducedMotion: true,
    }),
    true,
  );

  assert.deepEqual(
    advanceServiceTimer({
      activeIndex: 0,
      elapsedMs: 1200,
      deltaMs: 900,
      itemCount: 3,
      isPaused: true,
    }),
    { activeIndex: 0, elapsedMs: 1200 },
  );

  assert.deepEqual(
    advanceServiceTimer({
      activeIndex: 0,
      elapsedMs: 5800,
      deltaMs: 300,
      itemCount: 3,
      isPaused: false,
    }),
    { activeIndex: 1, elapsedMs: 100 },
  );

  assert.deepEqual(restartServiceTimer(2), { activeIndex: 2, elapsedMs: 0 });
});

test('service switcher keeps desktop tabs and mobile disclosures accessible without duplicate contracts', async () => {
  const source = await readSource('src/components/translation/ServiceSwitcher.tsx');

  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /aria-controls=/);
  assert.match(source, /aria-selected=/);
  assert.match(source, /aria-expanded=/);
  assert.match(source, /aria-hidden=\{isDesktop\}/);
  assert.match(source, /aria-hidden=\{!isDesktop\}/);
});

test('experience tabs keep exactly two panels with roving tabindex keyboard support', async () => {
  assert.deepEqual(EXPERIENCE_TAB_IDS, ['education', 'experience']);
  assert.equal(getNextExperienceTabIndex(0, 'ArrowRight'), 1);
  assert.equal(getNextExperienceTabIndex(1, 'ArrowRight'), 0);
  assert.equal(getNextExperienceTabIndex(0, 'ArrowLeft'), 1);
  assert.equal(getNextExperienceTabIndex(1, 'Home'), 0);
  assert.equal(getNextExperienceTabIndex(0, 'End'), 1);

  const source = await readSource('src/components/translation/ExperienceTabs.tsx');
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /tabIndex=\{isActive \? 0 : -1\}/);
});

test('translation view removes duplicated legacy sections and keeps the approved section components', async () => {
  const source = await readSource('src/views/TranslationSeoPage.astro');

  assert.match(source, /<ServiceSwitcher/);
  assert.match(source, /<ExperienceTabs/);
  assert.doesNotMatch(source, /servicesOffered/);
  assert.doesNotMatch(source, /page\.skills\.linguistic/);
  assert.doesNotMatch(source, /page\.skills\.webOptimization/);
  assert.doesNotMatch(source, /page\.education\.languages/);
});

test('translation admin store mutations enforce ES\/EN\/FR inputs, add Spanish fallbacks, and publish site data', async () => {
  const { AdminStore } = await import('../src/components/admin/adminStore.ts');

  const store = new AdminStore();
  store.init(
    {
      es: { translationPage: { hero: { title: 'Hola' } } },
      en: { translationPage: { hero: { title: 'Hello' } } },
      fr: { translationPage: { hero: { title: 'Salut' } } },
    },
    {
      heroMainPhoto: '/images/site/original-hero.jpg',
      galleryCutouts: {},
      videoPlaceholderOrEmbedUrl: '',
      ugcHeaderImage: '',
      instagramScreenshot: '',
      socialLinks: { linkedin: '', instagram: '' },
      nicheBackgrounds: {},
      ugcVideos: {},
      ugcPhotos: {},
      nicheIcons: {},
      aboutPhotos: [],
      brandVideo: '',
      toolLogos: {},
      videoStickers: {},
      orbitMedia: [],
      arsenal: {
        languages: [],
        tools: [],
        skills: [],
      },
      person: { name: 'Marta', location: 'Elche', socialProfiles: { linkedin: '', instagram: '' } },
    },
    'es',
    'publish-token',
  );

  assert.throws(
    () => store.addEditableCollectionItem('skills', {
      label: { es: '', en: 'Localization', fr: 'Localisation' },
    }),
    /ES\/EN\/FR/,
  );

  const languageIndex = store.addEditableCollectionItem('languages', {
    label: { es: 'Portugués', en: 'Portuguese', fr: 'Portugais' },
    level: { es: 'Intermedio', en: 'Intermediate', fr: 'Intermédiaire' },
  });
  const skillIndex = store.addEditableCollectionItem('skills', {
    label: { es: 'SEO técnico', en: 'Technical SEO', fr: 'SEO technique' },
  });

  store.moveEditableCollectionItem('skills', skillIndex, -1);
  store.removeEditableCollectionItem('languages', languageIndex);

  const addedToolIndex = store.addEditableCollectionItem('tools', {
    label: { es: 'Screaming Frog', en: 'Screaming Frog', fr: 'Screaming Frog' },
    logo: '/images/tools/screaming-frog.svg',
  });

  const snapshot = store.getSnapshot();
  const addedTool = snapshot.getEditableCollection('tools')[addedToolIndex];
  assert.equal(addedTool.label.de, 'Screaming Frog');
  assert.equal(addedTool.label.it, 'Screaming Frog');
  assert.equal(addedTool.label.ca, 'Screaming Frog');

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    fetchCalls.push({ input: String(input), init });
    if (!init.method || init.method === 'GET') {
      return new Response(JSON.stringify({ sha: 'site-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ content: { sha: 'next-site-sha' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await store.publish();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(store.getSnapshot().publishError, '');
  assert.equal(store.getSnapshot().publishSuccess, true);
  assert.ok(fetchCalls.length >= 2, 'publishing site collections should update src/data/site.json');

  const siteWrite = fetchCalls.find((call) => String(call.input).includes('src/data/site.json'));
  assert.ok(siteWrite, 'publish should write site data');
});

test('translation page methodology and why-choose-me data stay scoped to four steps and three cards', async () => {
  const dictionaries = await Promise.all(
    locales.map((locale) => readJson(`src/i18n/${locale}.json`)),
  );

  for (const dictionary of dictionaries) {
    assert.equal(dictionary.translationPage.methodology.steps.length, 4);
    assert.equal(dictionary.translationPage.methodology.steps[0].title, 'Briefing');
    assert.equal(typeof dictionary.translationPage.methodology.steps[3].title, 'string');
    assert.notEqual(dictionary.translationPage.methodology.steps[3].title.trim(), '');
    assert.equal(dictionary.translationPage.whyChooseMe.cards.length, 3);
  }
});

test('built translation route ships translation-specific GSAP and React chunks while contact, blog, and ugc stay clear', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built assets.');
    return;
  }

  const distRoot = path.join(rootDir, 'dist');
  const [translationHtml, contactHtml, blogHtml, ugcHtml] = await Promise.all([
    readFile(path.join(distRoot, 'translation-seo', 'index.html'), 'utf8'),
    readFile(path.join(distRoot, 'contact', 'index.html'), 'utf8'),
    readFile(path.join(distRoot, 'blog', 'index.html'), 'utf8'),
    readFile(path.join(distRoot, 'ugc', 'index.html'), 'utf8'),
  ]);

  const collectAssetPaths = (html) => [...html.matchAll(/\/_astro\/[^"'?#]+\.js/g)].map((match) => match[0]);
  const translationAssets = collectAssetPaths(translationHtml);
  const contactAssets = collectAssetPaths(contactHtml);
  const blogAssets = collectAssetPaths(blogHtml);
  const ugcAssets = collectAssetPaths(ugcHtml);

  assert.ok(
    translationAssets.some((assetPath) => /ServiceSwitcher|ExperienceTabs|GsapPageRuntime/.test(assetPath)),
    'translation route should reference translation-specific interactive chunks',
  );
  assert.ok(contactAssets.every((assetPath) => !/ServiceSwitcher|ExperienceTabs|GsapPageRuntime/.test(assetPath)));
  assert.ok(blogAssets.every((assetPath) => !/ServiceSwitcher|ExperienceTabs|GsapPageRuntime/.test(assetPath)));
  assert.ok(ugcAssets.every((assetPath) => !/ServiceSwitcher|ExperienceTabs|GsapPageRuntime/.test(assetPath)));

  const builtFiles = await collectFiles(path.join(distRoot, '_astro'));
  assert.ok(builtFiles.some((filePath) => /ServiceSwitcher|ExperienceTabs/.test(path.basename(filePath))));
});
