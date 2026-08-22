import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as adminStoreModule from '../src/components/admin/adminStore.ts';
import {
  ADMIN_INIT_FALLBACK_DELAY_MS,
  ADMIN_INIT_MAX_RETRIES,
  ADMIN_INIT_RETRY_DELAY_MS,
  getAdminInitDecision,
  shouldAllowTokenlessAdminInit,
} from '../src/lib/adminInit.js';
import {
  FOOTER_REVEAL_STORAGE_KEY,
  getFooterRevealMode,
} from '../src/lib/footerReveal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicUgcPages = ['src/views/UgcPage.astro'];
const publicContactPages = ['src/views/ContactPage.astro'];

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

test('footer reveal only animates once per browser session and skips on reduced motion', () => {
  assert.equal(FOOTER_REVEAL_STORAGE_KEY, 'mg-footer-reveal-seen');
  assert.equal(getFooterRevealMode({ hasSessionFlag: false, prefersReducedMotion: false }), 'play');
  assert.equal(getFooterRevealMode({ hasSessionFlag: true, prefersReducedMotion: false }), 'skip');
  assert.equal(getFooterRevealMode({ hasSessionFlag: false, prefersReducedMotion: true }), 'skip');
});

test('hosted admin preview falls back to tokenless init and late identity tokens upgrade the existing store session', async () => {
  assert.equal(shouldAllowTokenlessAdminInit('localhost'), true);
  assert.equal(shouldAllowTokenlessAdminInit('127.0.0.1'), true);
  assert.equal(shouldAllowTokenlessAdminInit('::1'), true);
  assert.equal(shouldAllowTokenlessAdminInit('studio-portfolio.netlify.app'), true);
  assert.equal(ADMIN_INIT_RETRY_DELAY_MS, 500);
  assert.equal(ADMIN_INIT_MAX_RETRIES, 12);
  assert.equal(ADMIN_INIT_FALLBACK_DELAY_MS, 2000);
  assert.ok(
    ADMIN_INIT_RETRY_DELAY_MS * ADMIN_INIT_MAX_RETRIES > ADMIN_INIT_FALLBACK_DELAY_MS,
    'identity retries should stay alive long enough to bind events after the tokenless fallback starts',
  );

  assert.equal(
    getAdminInitDecision({ isInitialized: false, identityToken: '', allowTokenlessFallback: false }),
    'wait',
  );
  assert.equal(
    getAdminInitDecision({ isInitialized: false, identityToken: '', allowTokenlessFallback: true }),
    'init-without-token',
  );
  assert.equal(
    getAdminInitDecision({ isInitialized: false, identityToken: 'token-123', allowTokenlessFallback: false }),
    'init-with-token',
  );
  assert.equal(
    getAdminInitDecision({ isInitialized: true, identityToken: 'token-123', allowTokenlessFallback: false }),
    'update-token',
  );

  assert.equal(typeof adminStoreModule.AdminStore, 'function', 'adminStore should export its store class');

  const store = new adminStoreModule.AdminStore();
  const i18n = {
    es: { hero: { title: 'Hola Marta' } },
    en: { hero: { title: 'Hello Marta' } },
    fr: { hero: { title: 'Salut Marta' } },
  };
  const images = { hero: { portrait: '/images/marta.png' } };

  store.init(i18n, images, 'es', '');
  assert.equal(store.getSnapshot().getText('hero.title'), 'Hola Marta');
  assert.equal(store.getSnapshot().getImageSrc('hero.portrait'), '/images/marta.png');

  await store.publish();
  assert.equal(store.getSnapshot().publishError, 'Login required before publishing.');

  store.setLang('fr');
  assert.equal(typeof store.setAuthToken, 'function', 'adminStore should expose a late-token upgrade path');
  store.setAuthToken('late-token');
  store.setText('hero.title', 'Salut publiée');

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

  assert.equal(store.getSnapshot().currentLang, 'fr');
  assert.equal(store.getSnapshot().publishError, '');
  assert.equal(store.getSnapshot().publishSuccess, true);
  assert.equal(fetchCalls.length, 2, 'late token publish should perform an authenticated read/write pair');
  assert.match(
    String(fetchCalls[0].init?.headers?.Authorization ?? ''),
    /late-token/,
    'late token should be reused for the follow-up publish fetch',
  );
});

test('admin layout does not force a full reload and admin init uses bounded identity retries with event callbacks', async () => {
  const [layoutSource, initSource] = await Promise.all([
    readSource('src/layouts/AdminLayout.astro'),
    readSource('src/components/admin/AdminInit.tsx'),
  ]);

  assert.doesNotMatch(layoutSource, /location\.reload\(\)/);
  assert.doesNotMatch(layoutSource, /document\.location/);
  assert.match(
    initSource,
    /identity\.on\('init', onIdentityChange\);/,
    'AdminInit should subscribe to Netlify Identity init events for late auth upgrades',
  );
  assert.match(
    initSource,
    /identity\.on\('login', onIdentityChange\);/,
    'AdminInit should subscribe to Netlify Identity login events for late auth upgrades',
  );
  assert.ok(
    initSource.indexOf("identity.on('init', onIdentityChange);") < initSource.indexOf('identity.init();'),
    'AdminInit should bind the init listener before bootstrapping Netlify Identity so the first auth event is not missed',
  );
  assert.match(
    initSource,
    /retryAttempts\s*\+=\s*1;[\s\S]*window\.setTimeout\(attemptIdentitySync,\s*ADMIN_INIT_RETRY_DELAY_MS\);/m,
    'AdminInit should use a bounded timeout-based retry instead of steady-state polling',
  );
  assert.doesNotMatch(initSource, /setInterval/, 'AdminInit should not keep a permanent 1-second polling loop');
});

test('shared UGC view reruns carousel setup on astro:page-load without duplicate listeners', async () => {
  const sources = await Promise.all(
    publicUgcPages.map(async (relativePath) => [relativePath, await readSource(relativePath)]),
  );

  for (const [relativePath, source] of sources) {
    assert.match(source, /import\s+\{\s*initHeroCarousels\s*\}\s+from\s+['"].+heroCarousel\.js['"]/,
      `${relativePath} should use the shared hero carousel initializer`);
    assert.match(source, /const initUgcPage = \(\) => initHeroCarousels\(\);/,
      `${relativePath} should wrap carousel setup in a named init function`);
    assert.match(source, /initUgcPage\(\);/,
      `${relativePath} should initialize the carousel on first load`);
    assert.match(source, /document\.addEventListener\('astro:page-load', initUgcPage\);/,
      `${relativePath} should re-run carousel setup after Astro client navigation`);
  }
});

test('shared contact view reruns form setup on astro:page-load without duplicate submit handlers', async () => {
  const sources = await Promise.all(
    publicContactPages.map(async (relativePath) => [relativePath, await readSource(relativePath)]),
  );

  for (const [relativePath, source] of sources) {
    assert.match(source, /import\s+\{\s*initContactForms\s*\}\s+from\s+['"].+contactForms\.js['"]/,
      `${relativePath} should use the shared contact form initializer`);
    assert.match(source, /const initContactPage = \(\) => initContactForms\(\);/,
      `${relativePath} should wrap form setup in a named init function`);
    assert.match(source, /initContactPage\(\);/,
      `${relativePath} should initialize the forms on first load`);
    assert.match(source, /document\.addEventListener\('astro:page-load', initContactPage\);/,
      `${relativePath} should re-run form setup after Astro client navigation`);
  }
});

test('motion runtime keeps Lenis global while lazy-loading GSAP only for marked pages', async () => {
  const [layoutSource, runtimeSource, gsapRuntimeSource, gsapRuntimeModuleSource, allSourceFiles, pageFiles, layoutFiles] = await Promise.all([
    readSource('src/layouts/BaseLayout.astro'),
    readSource('src/components/MotionRuntime.astro'),
    readSource('src/components/GsapPageRuntime.astro'),
    readSource('src/lib/gsapPageRuntime.ts'),
    collectFiles(path.join(rootDir, 'src')),
    collectFiles(path.join(rootDir, 'src', 'pages')),
    collectFiles(path.join(rootDir, 'src', 'layouts')),
  ]);

  assert.match(layoutSource, /<MotionRuntime\s*\/>/, 'BaseLayout should keep MotionRuntime mounted globally');
  assert.ok(
    layoutSource.indexOf('<MotionRuntime />') < layoutSource.indexOf('<main class="relative">'),
    'BaseLayout should render MotionRuntime before the page slot so first-load GSAP routes can see the global runtime as early as Astro allows',
  );
  assert.doesNotMatch(runtimeSource, /import\s+gsap\s+from\s+['"]gsap['"]/, 'MotionRuntime should not statically import gsap');
  assert.doesNotMatch(runtimeSource, /import\s+\{\s*ScrollTrigger\s*\}\s+from\s+['"]gsap\/ScrollTrigger['"]/, 'MotionRuntime should not statically import ScrollTrigger');
  assert.doesNotMatch(runtimeSource, /gsap|ScrollTrigger/, 'global MotionRuntime should stay Lenis-only');
  assert.match(gsapRuntimeSource, /import\s+\{\s*initGsapPageRuntime\s*\}\s+from\s+['"]\.\.\/lib\/gsapPageRuntime\.ts['"];/, 'GsapPageRuntime should delegate lifecycle hardening to a shared helper');
  assert.match(gsapRuntimeModuleSource, /export const GSAP_PAGE_SELECTOR = ['"]\[data-gsap-page\]['"];/, 'GsapPageRuntime should use an explicit page marker');
  assert.match(gsapRuntimeModuleSource, /import\(['"]gsap['"]\)/, 'GsapPageRuntime should lazy-load gsap with a dynamic import');
  assert.match(gsapRuntimeModuleSource, /import\(['"]gsap\/ScrollTrigger['"]\)/, 'GsapPageRuntime should lazy-load ScrollTrigger with a dynamic import');
  assert.match(gsapRuntimeModuleSource, /document\.querySelector\(GSAP_PAGE_SELECTOR\)/, 'GsapPageRuntime should require the page marker before loading');
  assert.match(gsapRuntimeModuleSource, /document\.addEventListener\('astro:page-load', onPageLoad\);/, 'GsapPageRuntime should re-evaluate on Astro page loads');
  assert.match(gsapRuntimeModuleSource, /document\.addEventListener\('astro:before-preparation', onBeforePreparation\);/, 'GsapPageRuntime should clean up on route changes');
  assert.match(gsapRuntimeModuleSource, /window\.__mgGsapPageRuntime\?\.runId !== runId/, 'GsapPageRuntime should gate async continuations behind a run-id token');
  assert.match(gsapRuntimeModuleSource, /waitForMotionRuntimeReady/, 'GsapPageRuntime should wait for MotionRuntime readiness when Lenis is not yet available on first load');
  assert.doesNotMatch(gsapRuntimeModuleSource, /ScrollTrigger\.getAll\(\)\.forEach\(\(trigger\) => trigger\.kill\(\)\)/, 'GsapPageRuntime cleanup should not kill route-owned ScrollTriggers');
  assert.doesNotMatch(gsapRuntimeModuleSource, /const lenis = window\.__mgMotionRuntime\?\.lenis \?\? null;/, 'GsapPageRuntime should not capture a one-time Lenis reference now that reduced-motion toggles recreate the instance');

  const sourceFiles = allSourceFiles.filter((filePath) => /\.(astro|[cm]?[jt]sx?)$/.test(filePath));
  const markerFiles = [];
  for (const filePath of sourceFiles) {
    const source = await readFile(filePath, 'utf8');
    if (source.includes('data-gsap-page')) {
      markerFiles.push(path.relative(rootDir, filePath));
    }
  }

  const pageAndLayoutFiles = [...pageFiles, ...layoutFiles].filter((filePath) => filePath.endsWith('.astro'));
  const gsapRuntimeUsageFiles = [];
  for (const filePath of pageAndLayoutFiles) {
    const source = await readFile(filePath, 'utf8');
    const relativePath = path.relative(rootDir, filePath);
    if (/import\s+.+\s+from\s+['"][^'"]*GsapPageRuntime\.astro['"]/.test(source)) {
      gsapRuntimeUsageFiles.push(`${relativePath} imports GsapPageRuntime`);
    }
    if (/<GsapPageRuntime(?:\s|\/|>)/.test(source)) {
      gsapRuntimeUsageFiles.push(`${relativePath} renders <GsapPageRuntime>`);
    }
  }

  assert.deepEqual(
    markerFiles,
    ['src/components/GsapPageRuntime.astro', 'src/lib/gsapPageRuntime.ts'],
    'the GSAP marker should stay confined to the route runtime component and its helper so unrelated routes never opt into the chunk',
  );
  assert.deepEqual(
    gsapRuntimeUsageFiles,
    [],
    'Phase 1 pages and layouts must not import or render the opt-in GSAP runtime component before the orbit/service rollout',
  );
});

test('built HTML pages keep the GSAP page marker scoped to home and translation routes while the global motion bundle stays Lenis-only', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built assets.');
    return;
  }

  const distFiles = await collectFiles(path.join(rootDir, 'dist'));
  const htmlFiles = distFiles.filter((filePath) => filePath.endsWith('.html'));
  assert.ok(htmlFiles.length > 0, 'build contract needs generated HTML files to inspect');

  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, 'utf8');
    const relativePath = path.relative(rootDir, htmlFile);
    const allowsGsapMarker = /dist\/(?:[a-z]{2}\/)?(?:index|translation-seo\/index)\.html$/.test(relativePath.replace(/\\/g, '/'));

    if (allowsGsapMarker) {
      assert.match(html, /data-gsap-page/, `${relativePath} should opt into the route-scoped GSAP marker`);
      continue;
    }

    assert.doesNotMatch(html, /data-gsap-page/, `${relativePath} should stay free of the route-scoped GSAP marker`);
  }

  const motionAssets = (await collectFiles(path.join(rootDir, 'dist', '_astro')))
    .filter((filePath) => path.basename(filePath).includes('MotionRuntime'));

  assert.equal(motionAssets.length, 1, 'build should emit exactly one global MotionRuntime asset');

  const runtimeBundle = await readFile(motionAssets[0], 'utf8');
  assert.doesNotMatch(runtimeBundle, /gsap|ScrollTrigger/, 'global MotionRuntime bundle should not embed GSAP loader code');

  const runtimeStats = await stat(motionAssets[0]);
  assert.ok(runtimeStats.size < 40000, 'Lenis-only MotionRuntime bundle should stay well below the old 130KB payload');

  for (const relativePath of [
    'dist/index.html',
    'dist/en/index.html',
    'dist/fr/index.html',
    'dist/de/index.html',
    'dist/it/index.html',
    'dist/ca/index.html',
    'dist/translation-seo/index.html',
    'dist/en/translation-seo/index.html',
    'dist/fr/translation-seo/index.html',
    'dist/de/translation-seo/index.html',
    'dist/it/translation-seo/index.html',
    'dist/ca/translation-seo/index.html',
  ]) {
    const html = await readFile(path.join(rootDir, relativePath.replace(/^dist[\\/]/, 'dist/')), 'utf8');
    const motionScriptIndex = html.indexOf('/_astro/MotionRuntime.astro_astro_type_script_index_0_lang');
    const gsapScriptIndex = html.indexOf('/_astro/GsapPageRuntime.astro_astro_type_script_index_0_lang');

    assert.ok(motionScriptIndex >= 0, `${relativePath} should include the global MotionRuntime asset`);
    assert.ok(gsapScriptIndex >= 0, `${relativePath} should include the route-scoped GsapPageRuntime asset`);
    assert.ok(
      motionScriptIndex < gsapScriptIndex,
      `${relativePath} should load MotionRuntime before GsapPageRuntime so first-load Lenis bridging can bind deterministically`,
    );
  }
});
