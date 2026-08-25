import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';
import { getPublicLanguagePicker } from '../src/lib/siteData.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const publicPickerFallback = ['es', 'en', 'fr'];
const heroMarks = {
  es: 'ELCHE · WORKING WORLDWIDE',
  en: 'ELCHE · WORKING WORLDWIDE',
  fr: 'ELCHE · DISPONIBLE DANS LE MONDE ENTIER',
  de: 'ELCHE · WELTWEIT TÄTIG',
  it: 'ELCHE · OPERATIVA IN TUTTO IL MONDO',
  ca: 'ELCHE · TREBALLANT ARREU DEL MÓN',
};

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
}

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readBuiltHtml(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

function createWindowStorage(overrides = {}) {
  return {
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      ...overrides,
    },
  };
}

function installWindow(mockWindow) {
  const previousWindow = globalThis.window;
  globalThis.window = mockWindow;
  return () => {
    if (previousWindow === undefined) {
      delete globalThis.window;
      return;
    }
    globalThis.window = previousWindow;
  };
}

function createStore() {
  const store = new AdminStore();
  store.init(
    {
      es: { translationPage: { heroMark: heroMarks.es } },
      en: { translationPage: { heroMark: heroMarks.en } },
      fr: { translationPage: { heroMark: heroMarks.fr } },
    },
    {
      heroMainPhoto: '/images/site/hero.webp',
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
      arsenal: { languages: [], tools: [], skills: [] },
      person: { name: 'Marta', location: 'Elche', socialProfiles: { linkedin: '', instagram: '' } },
    },
    'es',
    'publish-token',
  );
  return store;
}

function extractFooter(html, label) {
  const match = html.match(/<footer\b[\s\S]*?<\/footer>/);
  assert.ok(match, `${label} should render a footer element`);
  return match[0];
}

test('AdminStore guards ES in the public picker and preserves picker changes in local draft state', () => {
  const store = createStore();
  let savedPayload = '';
  const restoreWindow = installWindow(createWindowStorage({
    setItem: (_key, value) => {
      savedPayload = value;
    },
    getItem: () => savedPayload,
  }));

  try {
    assert.equal(typeof store.getPublicLanguagePicker, 'function', 'AdminStore should expose getPublicLanguagePicker');
    assert.equal(typeof store.setPublicLanguageVisibility, 'function', 'AdminStore should expose setPublicLanguageVisibility');
    assert.deepEqual(store.getPublicLanguagePicker(), publicPickerFallback);

    store.setPublicLanguageVisibility('es', false);
    assert.deepEqual(store.getPublicLanguagePicker(), publicPickerFallback, 'ES should stay locked in the public picker');

    store.setPublicLanguageVisibility('fr', false);
    store.setPublicLanguageVisibility('de', true);

    assert.deepEqual(store.getPublicLanguagePicker(), ['es', 'en', 'de']);
    assert.equal(store.getSnapshot().isDirty, true);
    assert.ok(store.getSnapshot().pendingCount > 0, 'picker changes should increase the dirty count');

    store.saveDraft();
    const parsed = JSON.parse(savedPayload);
    assert.deepEqual(parsed.images.publicLanguagePicker, ['es', 'en', 'de']);

    const reloadedStore = createStore();
    reloadedStore.loadDraft();
    assert.deepEqual(reloadedStore.getPublicLanguagePicker(), ['es', 'en', 'de'], 'draft reload should restore picker visibility');
  } finally {
    restoreWindow();
  }
});

test('public language picker helper falls back to ES EN FR when site data is missing or invalid', () => {
  assert.deepEqual(getPublicLanguagePicker(undefined), publicPickerFallback);
  assert.deepEqual(getPublicLanguagePicker({ publicLanguagePicker: [] }), publicPickerFallback);
  assert.deepEqual(getPublicLanguagePicker({ publicLanguagePicker: ['zz'] }), publicPickerFallback);
  assert.deepEqual(getPublicLanguagePicker({ publicLanguagePicker: ['de'] }), publicPickerFallback);
  assert.deepEqual(getPublicLanguagePicker({ publicLanguagePicker: ['es', 'de', 'zz'] }), publicPickerFallback);
});

test('AdminStore publishes public picker visibility through src/data/site.json without touching translations', async () => {
  const store = createStore();
  store.setPublicLanguageVisibility('fr', false);
  store.setPublicLanguageVisibility('it', true);
  store.setAuthToken('publish-token');

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    fetchCalls.push({ input: String(input), init });

    if (!init.method || init.method === 'GET') {
      return new Response(JSON.stringify({ sha: 'file-sha-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ content: { sha: 'next-sha' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await store.publish();
  } finally {
    globalThis.fetch = originalFetch;
  }

  const putCalls = fetchCalls.filter((call) => call.init?.method === 'PUT');
  assert.deepEqual(
    putCalls.map((call) => call.input),
    ['/.netlify/git/github/contents/src/data/site.json'],
    'public picker changes should publish only the site data document',
  );

  const payload = JSON.parse(String(putCalls[0].init?.body));
  const publishedSite = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
  assert.deepEqual(publishedSite.publicLanguagePicker, ['es', 'en', 'it']);
});

test('admin bootstrap sanitizes built heroMark text but restores original locale values before store init', async () => {
  const [layoutSource, initSource] = await Promise.all([
    readSource('src/layouts/AdminLayout.astro'),
    readSource('src/components/admin/AdminInit.tsx'),
  ]);

  assert.match(layoutSource, /heroMark:\s*''/, 'AdminLayout should keep heroMark out of built admin HTML payloads');
  assert.match(initSource, /heroMark:\s*original(?:Es|En|Fr)\.translationPage\.heroMark/, 'AdminInit should restore the original heroMark values before the admin store bootstraps');
  assert.match(initSource, /adminStore\.init\(restoredI18n,\s*parsedSite,\s*lang,\s*token\)/, 'AdminInit should still initialize the shared admin store after restoring hidden translation fields');
});

test('useAdminStore and AdminToolbar expose compact public language picker controls for all six locales', async () => {
  const [storeSource, hookSource, toolbarSource] = await Promise.all([
    readSource('src/components/admin/adminStore.ts'),
    readSource('src/components/admin/useAdminStore.ts'),
    readSource('src/components/admin/AdminToolbar.tsx'),
  ]);

  assert.match(storeSource, /getPublicLanguagePicker\s*\(\)\s*:\s*SupportedLang\[\]/, 'adminStore should expose a typed public picker getter');
  assert.match(storeSource, /setPublicLanguageVisibility\s*\(\s*lang:\s*SupportedLang,\s*visible:\s*boolean\s*\)/, 'adminStore should expose a visibility toggle mutator');
  assert.match(hookSource, /getPublicLanguagePicker:\s*adminStore\.getPublicLanguagePicker\.bind\(adminStore\)/, 'useAdminStore should expose the public picker getter');
  assert.match(hookSource, /setPublicLanguageVisibility:\s*adminStore\.setPublicLanguageVisibility\.bind\(adminStore\)/, 'useAdminStore should expose the public picker toggle mutator');
  assert.match(toolbarSource, /Public language picker/, 'AdminToolbar should label the compact public picker controls');
  assert.match(toolbarSource, /ES[\s\S]*EN[\s\S]*FR[\s\S]*DE[\s\S]*IT[\s\S]*CA/s, 'AdminToolbar should expose toggles for all six locales');
  assert.match(toolbarSource, /disabled=\{pickerLang\.code === 'es'\}/, 'AdminToolbar should keep ES checked and disabled');
  assert.match(toolbarSource, /store\.setPublicLanguageVisibility\(pickerLang\.code,\s*!isVisible\)/, 'AdminToolbar toggles should call the public picker visibility mutator');
});

test('footer source stops rendering footer.location while all locale keys stay intact', async (t) => {
  const [footerSource, dictionaries] = await Promise.all([
    readSource('src/components/Footer.astro'),
    Promise.all(locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)])),
  ]);

  assert.doesNotMatch(footerSource, /i\.footer\.location/, 'shared Footer should stop rendering footer.location');

  const footerLocations = dictionaries.map(([, dictionary]) => dictionary.footer.location);
  for (const [locale, dictionary] of dictionaries) {
    assert.equal(typeof dictionary.footer.location, 'string', `${locale} should keep footer.location in i18n data`);
    assert.notEqual(dictionary.footer.location.trim(), '', `${locale} footer.location should stay populated`);
  }

  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built footer output.');
    return;
  }

  const [homeHtml, adminHtml] = await Promise.all([
    readBuiltHtml('dist/index.html'),
    readBuiltHtml('dist/admin/translation-seo/index.html'),
  ]);

  for (const [label, html] of [['home', homeHtml], ['admin translation', adminHtml]]) {
    const footer = extractFooter(html, `${label} built HTML`);
    for (const location of footerLocations) {
      assert.doesNotMatch(footer, new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${label} footer should not render ${location}`);
    }
    assert.match(footer, />MG</, `${label} footer should keep the MG mark`);
  }
});

test('translation public and admin views stop rendering heroMark while locale data keeps the key', async (t) => {
  const [publicSource, adminSource, dictionaries] = await Promise.all([
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
    Promise.all(locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)])),
  ]);

  assert.doesNotMatch(publicSource, /page\.heroMark/, 'public translation page should stop rendering heroMark');
  assert.doesNotMatch(adminSource, /translationPage\.heroMark/, 'admin translation page should stop rendering heroMark');

  for (const [locale, dictionary] of dictionaries) {
    assert.equal(typeof dictionary.translationPage.heroMark, 'string', `${locale} should keep translationPage.heroMark in i18n data`);
    assert.notEqual(dictionary.translationPage.heroMark.trim(), '', `${locale} translationPage.heroMark should stay populated`);
  }

  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built translation pages.');
    return;
  }

  const [publicHtml, adminHtml] = await Promise.all([
    readBuiltHtml('dist/translation-seo/index.html'),
    readBuiltHtml('dist/admin/translation-seo/index.html'),
  ]);

  for (const [locale, heroMark] of Object.entries(heroMarks)) {
    assert.doesNotMatch(publicHtml, new RegExp(heroMark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `public built translation HTML should not render ${locale} heroMark`);
    assert.doesNotMatch(adminHtml, new RegExp(heroMark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `admin built translation HTML should not render ${locale} heroMark`);
  }
});
