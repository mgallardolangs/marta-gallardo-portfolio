import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const legacyRasterPaths = [
  'public/images/site/img_5587.jpg',
  'public/images/site/about-me-world.png',
  'public/images/site/sticker-passport.png',
  'public/images/site/sticker-art.png',
  'public/images/site/sticker-crochet.png',
  'public/images/site/sticker-mountain.png',
  'public/images/site/nicho-viajes.jpg',
  'public/images/site/nicho-idiomas.jpg',
  'public/images/site/nicho-arte.jpg',
  'public/images/site/world-map.png',
  'public/images/decorations/globe.png',
  'public/images/decorations/paintbrush.png',
  'public/images/decorations/plane.png',
  'public/images/blog/img_5464.heic',
];

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
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

function collectStringValues(value, matches = []) {
  if (typeof value === 'string') {
    matches.push(value);
    return matches;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStringValues(item, matches));
    return matches;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStringValues(item, matches));
  }

  return matches;
}

function getAssetPathsFromHtml(html) {
  return [...html.matchAll(/\/_astro\/[^"'?#]+\.js/g)].map((match) => match[0]);
}

function getLocalMediaPathsFromHtml(html) {
  return [...html.matchAll(/(?:src|href|poster)=["'](\/images\/[^"']+)["']/g)].map((match) => match[1]);
}

test('referenced raster media stays optimized and stale oversized originals are removed', async () => {
  const site = await readJson('src/data/site.json');
  const referencedRasterPaths = new Set(
    collectStringValues(site)
      .filter((value) => /^\/images\/.+\.(?:png|jpe?g|webp)$/i.test(value))
      .map((value) => path.join(rootDir, 'public', value.replace(/^\//, ''))),
  );

  assert.ok(referencedRasterPaths.size >= 9, 'expected the public site data to keep a non-trivial raster inventory');

  for (const absolutePath of referencedRasterPaths) {
    const fileStats = await stat(absolutePath);
    assert.ok(
      fileStats.size <= 500 * 1024,
      `${path.relative(rootDir, absolutePath)} should stay at or below 500KB`,
    );
  }

  for (const relativePath of legacyRasterPaths) {
    await assert.rejects(
      access(path.join(rootDir, relativePath)),
      { code: 'ENOENT' },
      `${relativePath} should be removed once its optimized replacement ships`,
    );
  }
});

test('navigation exposes all six locales and header source restores focus when menus close', async () => {
  const [headerSource, i18nSource] = await Promise.all([
    readSource('src/components/Header.astro'),
    readSource('src/i18n/index.ts'),
  ]);

  assert.match(i18nSource, /export const visibleLangs: Lang\[] = \['es', 'en', 'fr', 'de', 'it', 'ca'\];/);
  assert.match(headerSource, /let previouslyFocusedElement: HTMLElement \| null = null;/);
  assert.match(
    headerSource,
    /previouslyFocusedElement = document\.activeElement instanceof HTMLElement \? document\.activeElement : null;/,
    'menu toggles should remember the previously focused element before opening an overlay',
  );
  assert.match(
    headerSource,
    /previouslyFocusedElement\?\.focus\(\);/,
    'closing either overlay should restore focus to the triggering control',
  );
  assert.match(
    headerSource,
    /menuClose\?\.focus\(\);|mobilePanel\.querySelector<HTMLElement>\('\[data-menu-close\]'\)\?\.focus\(\);/,
    'opening the mobile menu should move focus inside the panel',
  );
  assert.match(
    headerSource,
    /languageMenu\.querySelector<HTMLElement>\('\[role="menuitem"\]'\)\?\.focus\(\);/,
    'opening the language menu should focus the first available locale link',
  );
});

test('legacy page-transition references are fully removed from source', async () => {
  const sourceFiles = (await collectFiles(path.join(rootDir, 'src')))
    .filter((filePath) => /\.(astro|[cm]?[jt]sx?)$/.test(filePath));

  for (const filePath of sourceFiles) {
    const source = await readFile(filePath, 'utf8');
    assert.doesNotMatch(source, /PageTransition/, `${path.relative(rootDir, filePath)} should not reference the retired PageTransition wrapper`);
    assert.doesNotMatch(source, /StoryMap/, `${path.relative(rootDir, filePath)} should not reference retired StoryMap code`);
  }

  await assert.rejects(access(path.join(rootDir, 'src/components/PageTransition.tsx')), { code: 'ENOENT' });
});

test('motion runtime and reduced-motion-sensitive components keep the Phase 5 hardening hooks', async () => {
  const [motionRuntimeSource, translationMotionSource, orbitSource, serviceSwitcherSource, experienceTabsSource, footerSource] = await Promise.all([
    readSource('src/components/MotionRuntime.astro'),
    readSource('src/lib/translationPageMotion.ts'),
    readSource('src/components/OvalMediaOrbit.tsx'),
    readSource('src/components/translation/ServiceSwitcher.tsx'),
    readSource('src/components/translation/ExperienceTabs.tsx'),
    readSource('src/components/Footer.astro'),
  ]);

  assert.match(
    motionRuntimeSource,
    /if \(lenis\.prefersReducedMotion\) \{\s*lenis\.stop\(\);/s,
    'Lenis should stay off when the user prefers reduced motion',
  );
  assert.match(translationMotionSource, /applyReducedMotionState\(root\);/);
  assert.match(orbitSource, /const shouldAnimate = !previewMode && prefersReducedMotion === false;/);
  assert.match(orbitSource, /aria-pressed=\{soundState === 'sound-on'\}/);
  assert.match(serviceSwitcherSource, /prefersReducedMotion/);
  assert.match(experienceTabsSource, /prefersReducedMotion \? '' : 'duration-300'/);
  assert.doesNotMatch(footerSource, /animation:\s*[^;]*infinite/, 'footer should not carry any continuous animation loop');
});

test('public media surfaces keep eager hero loading, lazy below-fold loading, and explicit sizing contracts', async () => {
  const [homeSource, ugcSource, nicheCardSource, orbitSource, blogIndexSource, blogArticleSource, photoMasonrySource, videoGallerySource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/views/UgcPage.astro'),
    readSource('src/components/NicheCard.tsx'),
    readSource('src/components/OvalMediaOrbit.tsx'),
    readSource('src/views/BlogIndexPage.astro'),
    readSource('src/pages/blog/[slug].astro'),
    readSource('src/components/PhotoMasonry.tsx'),
    readSource('src/components/VideoGallery.tsx'),
  ]);

  assert.match(homeSource, /<img[^>]*src=\{siteData\.heroMainPhoto\}[^>]*alt=\{heroPortraitAlt\}[^>]*width=\{1200\}[^>]*height=\{1600\}[^>]*fetchpriority="high"/);
  assert.match(homeSource, /<img[^>]*src=\{siteData\.instagramScreenshot\}[^>]*width=\{1251\}[^>]*height=\{495\}[^>]*loading="lazy"[^>]*decoding="async"/);
  assert.match(ugcSource, /idx === 0 \? 'eager' : 'lazy'/);
  assert.match(ugcSource, /idx === 0 \? 'high' : 'auto'/);
  assert.doesNotMatch(nicheCardSource, /backgroundImage:/, 'niche cards should render real lazy images instead of CSS background-image payloads');
  assert.match(nicheCardSource, /<img[^>]*alt=""[^>]*width=\{1200\}[^>]*height=\{1600\}[^>]*loading="lazy"[^>]*decoding="async"/);
  assert.match(orbitSource, /<img[^>]*src=\{item\.src\}[^>]*alt=\{alt\}[^>]*loading="lazy"[^>]*decoding="async"/);
  assert.match(blogIndexSource, /<img src=\{post\.data\.image\} alt=\{post\.data\.title\}[^>]*width=\{1600\}[^>]*height=\{1200\}/);
  assert.match(blogArticleSource, /<img src=\{post\.data\.image\} alt=\{post\.data\.title\}[^>]*width=\{1600\}[^>]*height=\{900\}[^>]*fetchpriority="high"/);
  assert.match(photoMasonrySource, /alt=""[^>]*loading="lazy"[^>]*decoding="async"/);
  assert.match(videoGallerySource, /preload="metadata"/);
});

test('built HTML keeps route-scoped GSAP or Embla bundles limited to home and translation routes', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built route bundles.');
    return;
  }

  const routeHtmlMap = {
    homeEs: 'dist/index.html',
    homeEn: 'dist/en/index.html',
    translationEs: 'dist/translation-seo/index.html',
    translationDe: 'dist/de/translation-seo/index.html',
    ugcEs: 'dist/ugc/index.html',
    contactEs: 'dist/contact/index.html',
    blogEs: 'dist/blog/index.html',
    adminIndex: 'dist/admin/index.html',
    adminUgc: 'dist/admin/ugc/index.html',
    adminTranslation: 'dist/admin/translation-seo/index.html',
    adminContact: 'dist/admin/contact/index.html',
    adminBlog: 'dist/admin/blog/index.html',
  };

  const assetCache = new Map();
  const readAsset = async (assetPath) => {
    const existing = assetCache.get(assetPath);
    if (existing) return existing;
    const contents = await readFile(path.join(rootDir, 'dist', assetPath.replace(/^\/+/, '')), 'utf8');
    assetCache.set(assetPath, contents);
    return contents;
  };

  const routeSignals = {};
  for (const [label, relativePath] of Object.entries(routeHtmlMap)) {
    const html = await readFile(path.join(rootDir, relativePath), 'utf8');
    const assets = getAssetPathsFromHtml(html);
    const contents = await Promise.all(assets.map((assetPath) => readAsset(assetPath)));
    routeSignals[label] = contents.some((source) => /(?:gsap|ScrollTrigger|embla)/i.test(source));
  }

  assert.equal(routeSignals.homeEs, true);
  assert.equal(routeSignals.homeEn, true);
  assert.equal(routeSignals.translationEs, true);
  assert.equal(routeSignals.translationDe, true);
  assert.equal(routeSignals.ugcEs, false);
  assert.equal(routeSignals.contactEs, false);
  assert.equal(routeSignals.blogEs, false);
  assert.equal(routeSignals.adminIndex, false);
  assert.equal(routeSignals.adminUgc, false);
  assert.equal(routeSignals.adminTranslation, false);
  assert.equal(routeSignals.adminContact, false);
  assert.equal(routeSignals.adminBlog, false);
});

test('built representative routes keep SEO, noindex, hreflang, and local media references intact', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built HTML contracts.');
    return;
  }

  const publicRoutes = [
    'dist/index.html',
    'dist/en/index.html',
    'dist/fr/index.html',
    'dist/de/translation-seo/index.html',
    'dist/it/translation-seo/index.html',
    'dist/ca/index.html',
  ];
  const adminRoutes = [
    'dist/admin/index.html',
    'dist/admin/ugc/index.html',
    'dist/admin/translation-seo/index.html',
    'dist/admin/contact/index.html',
    'dist/admin/blog/index.html',
  ];

  for (const relativePath of publicRoutes) {
    const html = await readFile(path.join(rootDir, relativePath), 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.match(html, /<link rel="canonical" href="https:\/\/marttelier\.netlify\.app/);
    assert.equal((html.match(/rel="alternate" hreflang="/g) ?? []).length, 7);
    assert.doesNotMatch(html, /noindex/);

    for (const mediaPath of getLocalMediaPathsFromHtml(html)) {
      await access(path.join(rootDir, 'public', mediaPath.replace(/^\//, '')));
    }
  }

  for (const relativePath of adminRoutes) {
    const html = await readFile(path.join(rootDir, relativePath), 'utf8');
    assert.match(html, /<title>Admin/);
    assert.match(html, /<meta name="robots" content="noindex, nofollow"/);

    for (const mediaPath of getLocalMediaPathsFromHtml(html)) {
      await access(path.join(rootDir, 'public', mediaPath.replace(/^\//, '')));
    }
  }
});
