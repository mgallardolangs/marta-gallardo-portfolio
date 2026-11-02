import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { netlifyImage } from '../src/lib/netlifyImage.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

test('local raster images keep their source paths outside Netlify production', () => {
  assert.equal(netlifyImage('/images/site/img_5587.webp', { width: 1200 }), '/images/site/img_5587.webp');
  assert.equal(netlifyImage('/images/blog/story.jpg', { width: 720 }), '/images/blog/story.jpg');
});

test('home services CTA scrolls to the matching section through the active smooth-scroll runtime', async () => {
  const [source, motionSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/components/MotionRuntime.astro'),
  ]);

  assert.match(source, /href="#home-services"[^>]*data-home-services-cta/);
  assert.match(source, /id="home-services"/);
  assert.match(motionSource, /closest<HTMLAnchorElement>\('\[data-home-services-cta\]'\)/);
  assert.match(motionSource, /controller\.getLenis\(\)/);
  assert.match(motionSource, /lenis\.scrollTo\(target,/);
  assert.match(motionSource, /window\.scrollTo\(/);
});

test('SEO and translation international sections link to the complementary service', async () => {
  const [seoSource, translationSource] = await Promise.all([
    readSource('src/views/SeoServicePage.astro'),
    readSource('src/views/TranslationServicePage.astro'),
  ]);

  assert.match(seoSource, /href=\{getLocalizedRoute\('translation', lang\)\}/);
  assert.match(seoSource, /page\.international\.description[\s\S]*getLocalizedRoute\('translation', lang\)/);
  assert.match(translationSource, /href=\{getLocalizedRoute\('seo', lang\)\}/);
  assert.match(translationSource, /page\.multilingualSeo\.description[\s\S]*getLocalizedRoute\('seo', lang\)/);
});

test('About education markers remain fixed-size across wrapped study entries', async () => {
  const [source, adminSource] = await Promise.all([
    readSource('src/components/translation/ExperienceTabs.tsx'),
    readSource('src/components/admin/AdminTranslationExperienceEditor.tsx'),
  ]);

  assert.match(source, /className="mt-3 h-2 w-2 shrink-0 rounded-full bg-amaranth"/);
  assert.match(adminSource, /className="mt-3 h-2 w-2 shrink-0 rounded-full bg-amaranth"/);
});

test('home admin mirrors the current public page and removes retired content blocks', async () => {
  const source = await readSource('src/pages/admin/index.astro');

  for (const marker of [
    'data-admin-home-hero',
    'data-admin-home-services',
    'data-admin-home-orbit',
    'data-admin-home-visibility',
    'data-admin-home-about',
    'home.hero.title',
    'home.hero.ctaDiagnosis',
    'home.hero.ctaServices',
    'home.services.items.seo',
    'home.visibility.title',
    'home.about.description',
    'EditableSeoSettings',
  ]) {
    assert.ok(source.includes(marker), `admin homepage should include ${marker}`);
  }

  assert.doesNotMatch(source, /i18nKey="hero\.name"|i18nKey="home\.video\.description"|instagramScreenshot|videoStickers\./);
});

test('admin exposes editable pages for the current About, SEO and Translation routes', async () => {
  const routeFiles = [
    'src/pages/admin/about.astro',
    'src/pages/admin/seo.astro',
    'src/pages/admin/translation-seo.astro',
  ];
  const adminPageFiles = await readdir(path.join(rootDir, 'src/pages/admin'));

  for (const routeFile of routeFiles) {
    assert.ok(adminPageFiles.includes(path.basename(routeFile)), `${routeFile} should be available`);
  }

  const [aboutSource, seoSource, translationSource, layoutSource, toolbarSource] = await Promise.all([
    readSource(routeFiles[0]),
    readSource(routeFiles[1]),
    readSource(routeFiles[2]),
    readSource('src/layouts/AdminLayout.astro'),
    readSource('src/components/admin/AdminToolbar.tsx'),
  ]);

  assert.match(aboutSource, /aboutPage\.hero\.title/);
  assert.match(aboutSource, /AdminTranslationExperienceEditor/);
  assert.match(seoSource, /seoPage\.international\.description/);
  assert.match(translationSource, /translationServicePage\.localization\.items/);
  assert.match(layoutSource, /import de from '\.\.\/i18n\/de\.json'/);
  assert.match(layoutSource, /import it from '\.\.\/i18n\/it\.json'/);
  assert.match(layoutSource, /import ca from '\.\.\/i18n\/ca\.json'/);
  assert.match(toolbarSource, /code: 'de'/);
  assert.match(toolbarSource, /code: 'it'/);
  assert.match(toolbarSource, /code: 'ca'/);
});

test('page gutters, home hero type and public text stacks use the revised reading rhythm with intact descenders', async () => {
  const [styles, homeSource, aboutSource, seoSource, translationSource, ugcSource] = await Promise.all([
    readSource('src/styles/global.css'),
    readSource('src/views/HomePage.astro'),
    readSource('src/views/AboutPage.astro'),
    readSource('src/views/SeoServicePage.astro'),
    readSource('src/views/TranslationServicePage.astro'),
    readSource('src/views/UgcPage.astro'),
  ]);

  assert.match(styles, /min\(100% - 2rem,\s*86rem\)/);
  assert.match(styles, /font-size:\s*clamp\(3rem,\s*5\.4vw,\s*4rem\)/);
  assert.match(styles, /line-height:\s*1\.08/);
  assert.match(styles, /\.home-hero__title\s*\{[^}]*padding-bottom:\s*0\.16em;/s);
  assert.match(styles, /max-width:\s*18ch/);
  assert.match(styles, /@media \(max-width: 480px\)[\s\S]*\.home-hero__cta\s*\{[^}]*font-size:\s*0\.62rem;[^}]*letter-spacing:\s*0\.12em;/);
  assert.match(homeSource, /className="flex flex-col gap-8 md:gap-10"/);
  assert.match(aboutSource, /className="flex flex-col gap-8"/);
  assert.match(seoSource, /className="flex flex-col gap-8"/);
  assert.match(translationSource, /className="flex flex-col gap-8"/);
  assert.match(ugcSource, /className="flex flex-col gap-6"/);
  assert.match(translationSource, /site-container max-w-7xl/);
  assert.match(translationSource, /max-w-5xl font-body text-lg leading-8/);
});

test('animated Astro slot stacks use flex gaps so spacing applies between slotted children', async () => {
  const paths = [
    'src/views/HomePage.astro',
    'src/views/AboutPage.astro',
    'src/views/SeoServicePage.astro',
    'src/views/TranslationServicePage.astro',
    'src/views/UgcPage.astro',
    'src/pages/admin/index.astro',
    'src/pages/admin/about.astro',
    'src/pages/admin/seo.astro',
    'src/pages/admin/translation-seo.astro',
    'src/pages/admin/ugc.astro',
  ];
  const sources = await Promise.all(paths.map((path) => readSource(path)));

  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(
      source,
      /<(?:ScrollReveal|StaggerContainer)\s+[^>]*className="[^"]*\bspace-y-/,
      `${paths[index]} should use flex gap for its animated slotted text stacks`,
    );
  }
});

test('homepage and service CTAs keep text-only hit areas beside a full-width accent underline', async () => {
  const [styles, home, seo, translation, adminHome, adminSeo, adminTranslation] = await Promise.all([
    readSource('src/styles/global.css'),
    readSource('src/views/HomePage.astro'),
    readSource('src/views/SeoServicePage.astro'),
    readSource('src/views/TranslationServicePage.astro'),
    readSource('src/pages/admin/index.astro'),
    readSource('src/pages/admin/seo.astro'),
    readSource('src/pages/admin/translation-seo.astro'),
  ]);
  const sourcesAndCounts = [
    [home, 1, 'Home'],
    [seo, 3, 'SEO'],
    [translation, 2, 'Translation'],
    [adminHome, 1, 'admin Home'],
    [adminSeo, 3, 'admin SEO'],
    [adminTranslation, 2, 'admin Translation'],
  ];

  for (const [source, expectedCount, page] of sourcesAndCounts) {
    assert.equal(
      source.match(/class="site-text-cta"/g)?.length,
      expectedCount,
      `${page} should use the shared text-link CTA treatment`,
    );
    assert.equal(
      source.match(/class="site-text-cta-row"/g)?.length,
      expectedCount,
      `${page} should keep each text link inside a non-clickable full-row underline`,
    );
  }

  assert.match(styles, /\.site-text-cta-row\s*\{[^}]*display:\s*flex;[^}]*width:\s*100%;[^}]*border-bottom:\s*1px solid var\(--color-amaranth\);/s);
  assert.match(styles, /\.site-text-cta\s*\{[^}]*width:\s*fit-content;[^}]*flex:\s*0 0 auto;/s);
  assert.doesNotMatch(styles, /\.site-text-cta-row\s*\{\s*cursor:\s*pointer/);
});

test('Home about CTA uses a readable base color on its dark section', async () => {
  const styles = await readSource('src/styles/global.css');

  assert.match(styles, /\.bg-ink \.site-text-cta\s*\{[^}]*color:\s*var\(--color-paper\);/s);
});

test('Home and Blog read-more links share the requested underline and arrow hover', async () => {
  const [home, blog, styles] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/views/BlogIndexPage.astro'),
    readSource('src/styles/global.css'),
  ]);

  assert.equal(home.match(/class="blog-read-more"/g)?.length, 1);
  assert.equal(blog.match(/class="blog-read-more"/g)?.length, 1);
  assert.match(styles, /\.blog-read-more::after\s*\{[^}]*transform:\s*scaleX\(0\);[^}]*transform-origin:\s*left;/s);
  assert.match(styles, /\.blog-read-more:hover::after,\s*\.blog-read-more:focus-visible::after\s*\{[^}]*transform:\s*scaleX\(1\);/s);
  assert.match(styles, /\.blog-read-more:hover \.blog-read-more__arrow,\s*\.blog-read-more:focus-visible \.blog-read-more__arrow\s*\{[^}]*translateX\(3px\)/s);
});

test('navbar switches to light text over dark sections while the selected link keeps its accent', async () => {
  const source = await readSource('src/components/Header.astro');

  assert.match(source, /data-surface="light"/);
  assert.match(source, /document\.querySelectorAll<HTMLElement>\('\.bg-ink'\)/);
  assert.match(source, /header\.dataset\.surface\s*=\s*isDarkSurface\s*\?\s*'dark'\s*:\s*'light'/);
  assert.match(source, /window\.addEventListener\('resize', updateHeaderSurface\)/);
  assert.match(source, /\.site-header\[data-surface='dark'\] \.nav-link__text\s*\{[^}]*color:\s*var\(--color-paper\);/s);

  const darkTextRule = source.indexOf(".site-header[data-surface='dark'] .nav-link__text");
  const activeTextRule = source.indexOf(".nav-link[aria-current='page'] .nav-link__text");
  assert.ok(darkTextRule !== -1 && activeTextRule > darkTextRule, 'active nav pink should override the dark-surface text color');
});

test('mobile navigation uses single labels, an opaque panel, and pink active states', async () => {
  const source = await readSource('src/components/Header.astro');

  assert.doesNotMatch(source, /mobile-nav-link__line/, 'mobile items should not render duplicate animated labels');
  assert.match(source, /\.mobile-panel\s*\{[^}]*background:\s*var\(--color-paper\);/s);
  assert.match(source, /\.mobile-panel\s*\{[^}]*overflow-y:\s*auto;/s);
  assert.match(source, /\.mobile-nav-link\s*\{[^}]*display:\s*flex;[^}]*min-height:\s*3\.25rem;/s);
  assert.match(source, /querySelectorAll<HTMLAnchorElement>\('a\.mobile-nav-link, a\.language-chip'\)/);
  assert.match(
    source,
    /\.mobile-nav-link:hover,[\s\S]*\.mobile-nav-link:active,[\s\S]*\.mobile-nav-link\[aria-current='page'\][\s\S]*color:\s*var\(--color-amaranth\);/s,
  );
});
