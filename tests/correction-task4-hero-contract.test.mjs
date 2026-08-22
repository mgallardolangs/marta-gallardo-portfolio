import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const HOME_HERO_START = '<!-- home-hero:start -->';
const HOME_HERO_END = '<!-- home-hero:end -->';
const ADMIN_HOME_HERO_START = '<!-- admin-home-hero:start -->';
const ADMIN_HOME_HERO_END = '<!-- admin-home-hero:end -->';

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

function extractBetweenMarkers(source, startMarker, endMarker, label) {
  const startIndex = source.indexOf(startMarker);
  assert.notEqual(startIndex, -1, `${label} should include ${startMarker}`);

  const contentStartIndex = startIndex + startMarker.length;
  const endIndex = source.indexOf(endMarker, contentStartIndex);
  assert.notEqual(endIndex, -1, `${label} should include ${endMarker}`);

  return source.slice(contentStartIndex, endIndex);
}

test('public hero removes the old gradient, card, photo, and scroll-cue tokens', async () => {
  const homeSource = await readSource('src/views/HomePage.astro');
  const heroSection = extractBetweenMarkers(homeSource, HOME_HERO_START, HOME_HERO_END, 'public hero source');

  assert.doesNotMatch(heroSection, /bg-\[radial-gradient/i);
  assert.doesNotMatch(homeSource, /AnimatedScrollText/);
  assert.doesNotMatch(heroSection, /heroMainPhoto|siteData\.heroMainPhoto/);
  assert.doesNotMatch(heroSection, /coverLabel|mainPhoto/);
  assert.doesNotMatch(heroSection, /bg-white\/72|backdrop-blur-sm/);
  assert.doesNotMatch(heroSection, /FloatingIcon client:visible intensity=\{18\}/);
});

test('public hero matches the approved Checkpoint 1 source markers and CTA structure', async () => {
  const homeSource = await readSource('src/views/HomePage.astro');
  const heroSection = extractBetweenMarkers(homeSource, HOME_HERO_START, HOME_HERO_END, 'public hero source');

  assert.match(
    heroSection,
    /<section\b(?=[^>]*\bdata-home-hero\b)(?=[^>]*\bclass=["'][^"']*\bhome-hero\b[^"']*\bbg-paper\b[^"']*["'])[^>]*>/,
  );
  assert.match(homeSource, /import HomeHeroAbstractVisual from '\.\.\/components\/HomeHeroAbstractVisual\.astro';/);
  assert.match(heroSection, /<TypedTitle\b[^>]*\btext=\{i\.hero\.name\}[^>]*\bclass="[^"]*\bhome-hero__title\b[^"]*"/);
  assert.match(heroSection, /i\.home\.hero\.kicker/);
  assert.match(heroSection, /i\.hero\.age/);
  assert.match(heroSection, /i\.hero\.city/);
  assert.match(heroSection, /i\.home\.hero\.description/);
  assert.match(heroSection, /href=\{getLocalizedPath\('\/ugc',\s*lang\)\}/);
  assert.match(heroSection, /href=\{getLocalizedPath\('\/translation-seo',\s*lang\)\}/);
  assert.equal(
    heroSection.match(/class="home-hero__cta home-hero__cta--primary"/g)?.length,
    2,
    'public hero should keep both CTAs on the shared primary treatment',
  );
  assert.doesNotMatch(heroSection, /home-hero__cta--secondary/);
  assert.doesNotMatch(heroSection, /rounded-full|rounded-\[/);
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
  const heroSection = extractBetweenMarkers(adminHomeSource, ADMIN_HOME_HERO_START, ADMIN_HOME_HERO_END, 'admin hero source');

  assert.match(
    heroSection,
    /<section\b(?=[^>]*\bdata-admin-home-hero\b)(?=[^>]*\bclass=["'][^"']*\bhome-hero\b[^"']*\bbg-paper\b[^"']*["'])[^>]*>/,
  );
  assert.match(heroSection, /i18nKey="home\.hero\.kicker"/);
  assert.match(heroSection, /i18nKey="hero\.name"/);
  assert.match(heroSection, /i18nKey="hero\.age"/);
  assert.match(heroSection, /i18nKey="hero\.city"/);
  assert.match(heroSection, /i18nKey="home\.hero\.description"/);
  assert.match(
    heroSection,
    /<div class="group\/edit relative flex w-full">[\s\S]*?<a href="\/admin\/ugc" class="home-hero__cta home-hero__cta--primary">[\s\S]*?<\/a>[\s\S]*?<\/div>/,
  );
  assert.match(
    heroSection,
    /<div class="group\/edit relative flex w-full">[\s\S]*?<a href="\/admin\/translation-seo" class="home-hero__cta home-hero__cta--primary">[\s\S]*?<\/a>[\s\S]*?<\/div>/,
  );
  assert.match(heroSection, /<EditableText client:load i18nKey="hero\.ugcLabel" as="span" className="home-hero__cta-label" clickToEdit=\{false\} editButtonTargetId="admin-home-ugc-cta-edit" \/>/);
  assert.match(heroSection, /<EditableText client:load i18nKey="hero\.seoLabel" as="span" className="home-hero__cta-label" clickToEdit=\{false\} editButtonTargetId="admin-home-seo-cta-edit" \/>/);
  assert.match(heroSection, /<span id="admin-home-ugc-cta-edit" \/>/);
  assert.match(heroSection, /<span id="admin-home-seo-cta-edit" \/>/);
  assert.match(adminHomeSource, /HomeHeroAbstractVisual/);
  assert.match(adminHomeSource, /EditableOrbitCollection/);
  assert.match(adminHomeSource, /AdminOrbitPreview/);
  assert.doesNotMatch(heroSection, /bg-\[radial-gradient/i);
  assert.doesNotMatch(heroSection, /imageKey="heroMainPhoto"/);
  assert.doesNotMatch(heroSection, /bg-white\/72|backdrop-blur-sm/);
});
