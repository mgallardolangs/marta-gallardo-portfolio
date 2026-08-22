import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

test('public hero removes the old gradient, card, photo, and scroll-cue tokens', async () => {
  const homeSource = await readSource('src/views/HomePage.astro');
  const heroSection = homeSource.match(/<section data-home-hero[\s\S]*?<\/section>/)?.[0] ?? '';

  assert.doesNotMatch(heroSection, /bg-\[radial-gradient/i);
  assert.doesNotMatch(homeSource, /AnimatedScrollText/);
  assert.doesNotMatch(heroSection, /heroMainPhoto|siteData\.heroMainPhoto/);
  assert.doesNotMatch(heroSection, /coverLabel|mainPhoto/);
  assert.doesNotMatch(heroSection, /bg-white\/72|backdrop-blur-sm/);
  assert.doesNotMatch(heroSection, /FloatingIcon client:visible intensity=\{18\}/);
});

test('public hero matches the approved Checkpoint 1 source markers and CTA structure', async () => {
  const homeSource = await readSource('src/views/HomePage.astro');

  assert.match(
    homeSource,
    /<section\b(?=[^>]*\bdata-home-hero\b)(?=[^>]*\bclass=["'][^"']*\bhome-hero\b[^"']*\bbg-paper\b[^"']*["'])[^>]*>/,
  );
  assert.match(homeSource, /import HomeHeroAbstractVisual from '\.\.\/components\/HomeHeroAbstractVisual\.astro';/);
  assert.match(homeSource, /<TypedTitle\b[^>]*\btext=\{i\.hero\.name\}[^>]*\bclass="[^"]*\bhome-hero__title\b[^"]*"/);
  assert.match(homeSource, /i\.home\.hero\.kicker/);
  assert.match(homeSource, /i\.hero\.age/);
  assert.match(homeSource, /i\.hero\.city/);
  assert.match(homeSource, /i\.home\.hero\.description/);
  assert.match(homeSource, /href=\{getLocalizedPath\('\/ugc',\s*lang\)\}/);
  assert.match(homeSource, /href=\{getLocalizedPath\('\/translation-seo',\s*lang\)\}/);
  assert.match(homeSource, /class="home-hero__cta home-hero__cta--primary"/);
  assert.match(homeSource, /class="home-hero__cta home-hero__cta--secondary"/);
  assert.doesNotMatch(homeSource.match(/<section data-home-hero[\s\S]*?<\/section>/)?.[0] ?? '', /rounded-full|rounded-\[/);
});

test('abstract visual stays decorative-only with the required Checkpoint 1 markers', async () => {
  const visualSource = await readSource('src/components/HomeHeroAbstractVisual.astro');

  assert.match(visualSource, /data-home-hero-visual/);
  assert.match(visualSource, /home-hero__oval/);
  assert.match(visualSource, /home-hero__frame--amaranth/);
  assert.match(visualSource, /home-hero__frame--ink/);
  assert.match(visualSource, /home-hero__frame--paper/);
  assert.match(visualSource, /home-hero__mark-text/);
  assert.match(visualSource, /home-hero__mark-rule/);
  assert.doesNotMatch(visualSource, /img|EditableImage|heroMainPhoto/);
});

test('admin hero mirrors the layout with editable copy and keeps later admin tooling intact', async () => {
  const adminHomeSource = await readSource('src/pages/admin/index.astro');

  assert.match(
    adminHomeSource,
    /<section\b(?=[^>]*\bdata-admin-home-hero\b)(?=[^>]*\bclass=["'][^"']*\bhome-hero\b[^"']*\bbg-paper\b[^"']*["'])[^>]*>/,
  );
  assert.match(adminHomeSource, /i18nKey="home\.hero\.kicker"/);
  assert.match(adminHomeSource, /i18nKey="hero\.name"/);
  assert.match(adminHomeSource, /i18nKey="hero\.age"/);
  assert.match(adminHomeSource, /i18nKey="hero\.city"/);
  assert.match(adminHomeSource, /i18nKey="home\.hero\.description"/);
  assert.match(adminHomeSource, /i18nKey="hero\.ugcLabel"/);
  assert.match(adminHomeSource, /i18nKey="hero\.seoLabel"/);
  assert.match(adminHomeSource, /HomeHeroAbstractVisual/);
  assert.match(adminHomeSource, /EditableOrbitCollection/);
  assert.match(adminHomeSource, /AdminOrbitPreview/);
  assert.doesNotMatch(adminHomeSource, /bg-\[radial-gradient/i);
  assert.doesNotMatch(adminHomeSource, /imageKey="heroMainPhoto"/);
  assert.doesNotMatch(adminHomeSource, /bg-white\/72|backdrop-blur-sm/);
});
