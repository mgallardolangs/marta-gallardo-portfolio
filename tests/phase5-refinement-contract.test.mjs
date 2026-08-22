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

function normalizeRoutePath(routePath) {
  if (!routePath || routePath === '/') return '/';
  return routePath.replace(/\/+$/, '');
}

function getRoutePathFromDistHtml(relativePath) {
  const distRelativePath = relativePath.replace(/^dist[\\/]/, '').replace(/\\/g, '/');
  if (distRelativePath === 'index.html') return '/';
  return normalizeRoutePath(`/${distRelativePath.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`);
}

function isAdminRoute(routePath) {
  return routePath === '/admin' || routePath.startsWith('/admin/');
}

function isHomeRoute(routePath) {
  return routePath === '/' || /^\/(?:en|fr|de|it|ca)$/.test(routePath);
}

function isTranslationRoute(routePath) {
  return routePath === '/translation-seo' || /^\/(?:en|fr|de|it|ca)\/translation-seo$/.test(routePath);
}

function routeNeedsMotionBundles(routePath) {
  return isHomeRoute(routePath) || isTranslationRoute(routePath);
}

function getAbsoluteRouteUrl(routePath) {
  return new URL(routePath === '/' ? '/' : `${routePath}/`, 'https://marttelier.netlify.app').toString();
}

function getCanonicalUrlFromHtml(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
}

function getAlternateLinksFromHtml(html) {
  return [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
    .map((match) => ({ hreflang: match[1], href: match[2] }));
}

function getXmlLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function isBlogDetailRoute(routePath) {
  return /^\/(?:(?:en|fr|de|it|ca)\/)?blog\/[^/]+$/.test(routePath);
}

function isAssetLikePath(pathname) {
  return /\.[a-z0-9]+$/i.test(pathname);
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
  assert.match(
    headerSource,
    /import\s+\{\s*closeActiveHeaderOverlay,\s*createHeaderOverlayState,\s*getFocusTrapTarget,\s*toggleLanguageMenu,\s*toggleMobileMenu\s*\}\s+from\s+['"]\.\.\/lib\/headerOverlayState\.js['"];/,
    'header overlay behavior should be driven by the shared helper so mutual exclusion and focus policies stay centralized',
  );
  assert.match(
    headerSource,
    /getHeaderVisibilityState/,
    'header source should route scroll visibility through a shared helper so any active overlay keeps the header visible',
  );
  assert.match(
    headerSource,
    /applyOverlayResult\(toggleLanguageMenu\(overlayState, toggle\)\);/,
    'opening the language menu should route through the overlay helper so it can close the mobile panel first',
  );
  assert.match(
    headerSource,
    /applyOverlayResult\(toggleMobileMenu\(overlayState, menuToggle\)\);/,
    'opening the mobile panel should route through the overlay helper so it can close the language menu first',
  );
  assert.match(
    headerSource,
    /if \(!wasBodyScrollLocked && nextState\.bodyScrollLocked\) \{[\s\S]*document\.body\.style\.overflow = 'hidden';[\s\S]*\}[\s\S]*if \(wasBodyScrollLocked && !nextState\.bodyScrollLocked\) \{[\s\S]*document\.body\.style\.overflow = bodyOverflow;/s,
    'body scroll locking should only be tied to the mobile panel lifecycle',
  );
  assert.match(
    headerSource,
    /const activeOverlay = getFocusTrapTarget\(overlayState\);[\s\S]*trapFocus\(event,\s*activeOverlay === 'mobile' \? mobilePanel : languageMenu\);/s,
    'keyboard focus trapping should always target the currently active overlay',
  );
  assert.match(
    headerSource,
    /if \(event\.key === 'Escape'\) \{[\s\S]*applyOverlayResult\(closeActiveHeaderOverlay\(overlayState\)\);[\s\S]*return;[\s\S]*\}/s,
    'Escape should close only the active overlay and restore focus through the helper result',
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
    /import\s+\{\s*createMotionRuntimeController\s*\}\s+from\s+['"]\.\.\/lib\/motionRuntime\.js['"];/,
    'motion runtime should delegate Lenis lifecycle policy to the shared helper',
  );
  assert.match(translationMotionSource, /applyReducedMotionState\(root\);/);
  assert.match(orbitSource, /const shouldAnimate = !previewMode && prefersReducedMotion === false;/);
  assert.match(orbitSource, /getOrbitActivatedVideoPlaybackMode/);
  assert.doesNotMatch(orbitSource, /\baria-pressed=|\btoggleVideoSound\b|enableAudio|audioBlocked|mute:/);
  assert.match(serviceSwitcherSource, /prefersReducedMotion/);
  assert.match(experienceTabsSource, /prefersReducedMotion \? '' : 'duration-300'/);
  assert.doesNotMatch(footerSource, /animation:\s*[^;]*infinite/, 'footer should not carry any continuous animation loop');
  assert.match(
    motionRuntimeSource,
    /controller\.syncPreference\(reducedMotionMedia\.matches\);/,
    'runtime should synchronize the helper against the current reduced-motion media query',
  );
  assert.match(
    motionRuntimeSource,
    /createDeferredMotionPreferenceSync/,
    'runtime should use a shared deferred RAF helper so stale callbacks cannot recreate Lenis',
  );
  assert.doesNotMatch(
    motionRuntimeSource,
    /if \(reducedMotionMedia\.matches\) \{\s*lenis\.stop\(\);/s,
    'reduced motion should never stop an active Lenis instance while leaving input interception in place',
  );
  assert.match(
    motionRuntimeSource,
    /const onReducedMotionChange = \(\) => \{\s*if \(reducedMotionMedia\.matches\) \{\s*deferredPreferenceSync\.cancel\(\);\s*controller\.syncPreference\(true\);\s*return;\s*\}\s*controller\.syncPreference\(false\);\s*controller\.start\(\);\s*queueResizeSync\(\);\s*\};/s,
    'live reduced-motion toggles should cancel stale RAF work on reduce and recreate/start Lenis when full motion returns',
  );
  assert.match(
    motionRuntimeSource,
    /runtimeState\.cleanup = \(\) => \{\s*deferredPreferenceSync\.cancel\(\);\s*controller\.cleanup\(\);/s,
    'runtime cleanup should cancel any pending RAF before tearing down Lenis',
  );
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

  assert.match(homeSource, /<HomeHeroPortrait>/);
  assert.match(homeSource, /siteData\.heroMainPhoto/);
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

test('media dialogs keep focus trapped and video cards avoid nested interactive controls', async () => {
  const [photoMasonrySource, videoGallerySource] = await Promise.all([
    readSource('src/components/PhotoMasonry.tsx'),
    readSource('src/components/VideoGallery.tsx'),
  ]);

  assert.match(
    photoMasonrySource,
    /if \(event\.key === 'Tab'\) \{\s*const focusableElements = dialogRef\.current[\s\S]+const firstElement = focusableElements\[0\];[\s\S]+const lastElement = focusableElements\[focusableElements\.length - 1\];[\s\S]+lastElement\.focus\(\);[\s\S]+firstElement\.focus\(\);/s,
    'photo dialog should trap keyboard focus while it is open',
  );
  assert.match(
    videoGallerySource,
    /if \(event\.key === 'Tab'\) \{\s*const focusableElements = dialogRef\.current[\s\S]+const firstElement = focusableElements\[0\];[\s\S]+const lastElement = focusableElements\[focusableElements\.length - 1\];[\s\S]+lastElement\.focus\(\);[\s\S]+firstElement\.focus\(\);/s,
    'video dialog should trap keyboard focus while it is open',
  );
  assert.doesNotMatch(
    videoGallerySource,
    /<motion\.button[\s\S]*?<button/s,
    'video cards should not nest a fullscreen button inside another button',
  );
});

test('built HTML keeps route-scoped GSAP bundles limited to home and translation routes with no Embla chunks anywhere', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built route bundles.');
    return;
  }

  const distHtmlFiles = (await collectFiles(path.join(rootDir, 'dist')))
    .filter((filePath) => filePath.endsWith('.html'))
    .map((filePath) => path.relative(rootDir, filePath).replace(/\\/g, '/'));

  assert.ok(distHtmlFiles.length >= 1, 'expected the build to emit HTML files into dist/');

  const assetCache = new Map();
  const readAsset = async (assetPath) => {
    const existing = assetCache.get(assetPath);
    if (existing) return existing;
    const contents = await readFile(path.join(rootDir, 'dist', assetPath.replace(/^\/+/, '')), 'utf8');
    assetCache.set(assetPath, contents);
    return contents;
  };

  for (const relativePath of distHtmlFiles) {
    const routePath = getRoutePathFromDistHtml(relativePath);
    const html = await readFile(path.join(rootDir, relativePath), 'utf8');
    const assets = getAssetPathsFromHtml(html);
    const contents = await Promise.all(assets.map((assetPath) => readAsset(assetPath)));
    const hasMotionBundle = contents.some((source) => /(?:gsap|ScrollTrigger)/i.test(source));

    assert.equal(
      hasMotionBundle,
      routeNeedsMotionBundles(routePath),
      `${routePath} should ${routeNeedsMotionBundles(routePath) ? '' : 'not '}ship home/translation motion bundles`,
    );
  }

  const builtAssets = await collectFiles(path.join(rootDir, 'dist', '_astro'));
  const builtAssetContents = await Promise.all(builtAssets.map((filePath) => readFile(filePath, 'utf8')));
  assert.ok(builtAssets.every((filePath) => !/embla/i.test(path.basename(filePath))), 'dist/_astro should not emit any Embla-named chunks');
  assert.ok(builtAssetContents.every((source) => !/embla/i.test(source)), 'built bundles should not embed Embla runtime code anywhere');
});

test('built public and admin HTML keep SEO/noindex classes, local media references, and sitemap coverage intact', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built HTML contracts.');
    return;
  }

  const distHtmlFiles = (await collectFiles(path.join(rootDir, 'dist')))
    .filter((filePath) => filePath.endsWith('.html'))
    .map((filePath) => path.relative(rootDir, filePath).replace(/\\/g, '/'));
  const builtRoutePaths = new Set(distHtmlFiles.map((relativePath) => getRoutePathFromDistHtml(relativePath)));

  const publicRoutePaths = [];
  const adminRoutePaths = [];

  for (const relativePath of distHtmlFiles) {
    const routePath = getRoutePathFromDistHtml(relativePath);
    const html = await readFile(path.join(rootDir, relativePath), 'utf8');

    if (isAdminRoute(routePath)) {
      adminRoutePaths.push(routePath);
      assert.match(html, /<title>Admin/);
      assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
      assert.equal(getCanonicalUrlFromHtml(html), null, `${routePath} should not ship public canonical SEO tags`);
    } else {
      publicRoutePaths.push(routePath);
      const alternateLinks = getAlternateLinksFromHtml(html);
      assert.match(html, /<title>[^<]+<\/title>/);
      assert.match(html, /<meta name="description" content="[^"]+"/);
      assert.match(html, /<link rel="canonical" href="https:\/\/marttelier\.netlify\.app/);
      assert.match(html, /<link rel="alternate" hreflang="x-default"/);
      if (!isBlogDetailRoute(routePath)) {
        assert.equal(alternateLinks.length, 7, `${routePath} should keep all locale alternates plus x-default`);
      }
      assert.doesNotMatch(html, /noindex/);
      assert.equal(
        normalizeRoutePath(new URL(getCanonicalUrlFromHtml(html) ?? 'https://marttelier.netlify.app/').pathname),
        routePath,
        `${routePath} should self-canonicalize`,
      );

      for (const { href } of alternateLinks) {
        const alternateUrl = new URL(href);
        if (alternateUrl.origin !== 'https://marttelier.netlify.app') continue;
        if (isAssetLikePath(alternateUrl.pathname)) continue;

        const alternateRoutePath = normalizeRoutePath(alternateUrl.pathname);
        assert.ok(
          builtRoutePaths.has(alternateRoutePath),
          `${routePath} should only emit alternate hrefs for built HTML routes (missing ${alternateRoutePath})`,
        );
      }
    }

    for (const mediaPath of getLocalMediaPathsFromHtml(html)) {
      await access(path.join(rootDir, 'public', mediaPath.replace(/^\//, '')));
    }
  }

  assert.ok(adminRoutePaths.includes('/admin/blog/new'), 'dist should include the inline admin blog/new editor route');
  assert.ok(publicRoutePaths.includes('/blog/mi-primer-post'), 'dist should include the built Spanish blog article route');

  const robots = await readFile(path.join(rootDir, 'dist/robots.txt'), 'utf8');
  assert.match(robots, /^User-agent: \*\nAllow: \/\nDisallow: \/admin\n\nSitemap: https:\/\/marttelier\.netlify\.app\/sitemap-index\.xml\n?$/);

  const sitemapIndex = await readFile(path.join(rootDir, 'dist/sitemap-index.xml'), 'utf8');
  assert.match(sitemapIndex, /<sitemapindex/);
  const sitemapUrls = getXmlLocs(sitemapIndex);
  assert.ok(sitemapUrls.length >= 1, 'sitemap index should reference at least one sitemap file');

  const sitemapRoutePaths = new Set();
  for (const sitemapUrl of sitemapUrls) {
    const sitemapPath = path.join(rootDir, 'dist', path.basename(new URL(sitemapUrl).pathname));
    const sitemapXml = await readFile(sitemapPath, 'utf8');
    for (const pageUrl of getXmlLocs(sitemapXml)) {
      sitemapRoutePaths.add(normalizeRoutePath(new URL(pageUrl).pathname));
    }
  }

  for (const routePath of publicRoutePaths) {
    assert.ok(sitemapRoutePaths.has(routePath), `${routePath} should be listed in the public sitemap set`);
  }

  for (const routePath of adminRoutePaths) {
    assert.ok(!sitemapRoutePaths.has(routePath), `${routePath} should stay out of the sitemap set`);
  }

  assert.ok(sitemapRoutePaths.has('/blog/mi-primer-post'), 'sitemap should include the built Spanish article route');
  assert.ok(!sitemapRoutePaths.has('/admin/blog/new'), 'sitemap should exclude the inline admin new-post route');
  assert.ok(!sitemapRoutePaths.has('/en/blog/mi-primer-post'), 'sitemap should not invent unbuilt localized article routes');
});
