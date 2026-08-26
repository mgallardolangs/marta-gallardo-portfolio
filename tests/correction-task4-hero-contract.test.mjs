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
  assert.doesNotMatch(heroSection, /coverLabel|mainPhoto/);
  assert.doesNotMatch(heroSection, /bg-white\/72|backdrop-blur-sm/);
  assert.doesNotMatch(heroSection, /FloatingIcon client:visible intensity=\{18\}/);
  assert.doesNotMatch(heroSection, /home-hero__oval|home-hero__frame|home-hero__mark/);
});

test('public hero matches the approved Checkpoint 1 source markers and CTA structure', async () => {
  const homeSource = await readSource('src/views/HomePage.astro');
  const heroSection = extractBetweenMarkers(homeSource, HOME_HERO_START, HOME_HERO_END, 'public hero source');

  assert.match(
    heroSection,
    /<section\b(?=[^>]*\bdata-home-hero\b)(?=[^>]*\bclass=["'][^"']*\bhome-hero\b[^"']*\bbg-paper\b[^"']*["'])[^>]*>/,
  );
  assert.match(homeSource, /import HomeHeroPortrait from '\.\.\/components\/HomeHeroPortrait\.astro';/);
  assert.match(heroSection, /<TypedTitle\b[^>]*\btext=\{i\.hero\.name\}[^>]*\bclass="[^"]*\bhome-hero__title\b[^"]*"/);
  assert.match(heroSection, /i\.home\.hero\.kicker/);
  assert.match(heroSection, /i\.hero\.age/);
  assert.match(heroSection, /i\.hero\.city/);
  assert.match(heroSection, /i\.home\.hero\.description/);
  assert.match(
    heroSection,
    /<HomeHeroPortrait>\s*<img[^>]*src=\{siteData\.heroMainPhoto\}[^>]*alt=\{i\.hero\.name\}[^>]*width=\{1200\}[^>]*height=\{1600\}[^>]*loading="eager"[^>]*fetchpriority="high"[^>]*decoding="async"[^>]*\/>\s*<\/HomeHeroPortrait>/s,
  );
  assert.doesNotMatch(heroSection, /home-hero__portrait-image/);
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

test('portrait component replaces the old abstract visual with a slotted media frame', async () => {
  const [portraitSource, globalCssSource] = await Promise.all([
    readSource('src/components/HomeHeroPortrait.astro'),
    readSource('src/styles/global.css'),
  ]);

  await assert.rejects(
    readSource('src/components/HomeHeroAbstractVisual.astro'),
    /ENOENT/,
    'HomeHeroAbstractVisual.astro should be deleted after the portrait refactor',
  );

  assert.match(portraitSource, /data-home-hero-portrait/);
  assert.match(portraitSource, /<slot \/>/);
  assert.match(portraitSource, /home-hero__portrait-corner--top-left/);
  assert.match(portraitSource, /home-hero__portrait-corner--top-right/);
  assert.match(portraitSource, /home-hero__portrait-corner--bottom-right/);
  assert.match(portraitSource, /home-hero__portrait-corner--bottom-left/);
  assert.match(portraitSource, /home-hero__portrait-rule/);
  assert.match(
    globalCssSource,
    /\.home-hero__portrait\s*\{[^}]*max-width:\s*400px;[^}]*aspect-ratio:\s*4\s*\/\s*5;[^}]*margin-inline:\s*auto;[^}]*\}/s,
  );
  assert.match(globalCssSource, /\.home-hero__portrait-media\s*\{[^}]*clip-path:/s);
  assert.match(globalCssSource, /\.home-hero__portrait-media img\s*\{[^}]*object-fit:\s*cover;[^}]*transition:[^}]*transform 0\.42s ease,[^}]*filter 0\.42s ease;[^}]*\}/s);
  assert.match(
    globalCssSource,
    /\.home-hero__portrait:hover\s+\.home-hero__portrait-media img,\s*\.home-hero__portrait:focus-within\s+\.home-hero__portrait-media img\s*\{[^}]*transform:\s*scale\(1\.055\);[^}]*\}/s,
  );
  assert.doesNotMatch(globalCssSource, /\.home-hero__portrait-image\b/);
  assert.doesNotMatch(globalCssSource, /home-hero__oval|home-hero__frame|home-hero__mark/);
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
    /<HomeHeroPortrait>\s*<EditableImage client:load imageKey="heroMainPhoto" className="h-full w-full" alt=\{i\.hero\.name\} \/>[\s\S]*<\/HomeHeroPortrait>/s,
  );
  assert.doesNotMatch(heroSection, /home-hero__portrait-image/);
  assert.match(
    heroSection,
    /<div class="group\/edit relative flex w-full">[\s\S]*?<a href="\/admin\/ugc" class="home-hero__cta home-hero__cta--primary">[\s\S]*?<\/a>[\s\S]*?<\/div>/,
  );
  assert.match(
    heroSection,
    /<div class="group\/edit relative flex w-full">[\s\S]*?<a href="\/admin\/translation-seo" class="home-hero__cta home-hero__cta--primary">[\s\S]*?<\/a>[\s\S]*?<\/div>/,
  );
  assert.match(heroSection, /<EditableText client:load i18nKey="hero\.ugcLabel" as="span" className="home-hero__cta-label" clickToEdit=\{false\} editButtonTargetId="admin-home-ugc-cta-edit" \/>/);
  assert.match(heroSection, /<EditableText client:load i18nKey="hero\.seoLabel" as="span" className="home-hero__cta-label" clickToEdit=\{false\} editButtonTargetId="admin-home-seo-cta-edit" \/>/  );
  assert.match(heroSection, /<span id="admin-home-ugc-cta-edit" \/>/);
  assert.match(heroSection, /<span id="admin-home-seo-cta-edit" \/>/);
  assert.match(adminHomeSource, /HomeHeroPortrait/);
  assert.match(adminHomeSource, /EditableOrbitCollection/);
  assert.match(adminHomeSource, /AdminOrbitPreview/);
  assert.doesNotMatch(heroSection, /bg-\[radial-gradient/i);
  assert.doesNotMatch(heroSection, /bg-white\/72|backdrop-blur-sm/);
});
