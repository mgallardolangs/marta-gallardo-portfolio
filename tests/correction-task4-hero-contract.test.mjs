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
  // Static h1 (painted on first render for LCP); the accent words get a CSS write-in instead of typing.
  assert.match(heroSection, /<h1 class="home-hero__title" set:html=\{accentHtml\(i\.home\.hero\.title, i\.home\.hero\.titleAccent\)/);
  assert.equal(heroSection.match(/<h1\b/g)?.length, 1);
  assert.doesNotMatch(heroSection, /StaggerContainer|StaggerItem/);
  // Nothing in the hero may be server-rendered at opacity 0 waiting for React (it delays LCP).
  assert.doesNotMatch(heroSection, /<ScrollReveal\b/);
  assert.match(heroSection, /i\.home\.hero\.kicker/);
  assert.match(heroSection, /i\.home\.hero\.description/);
  assert.match(heroSection, /href=\{getLocalizedRoute\('contact',\s*lang\)\}/);
  assert.match(heroSection, /href="#home-services"/);
  assert.match(
    heroSection,
    /<HomeHeroPortrait\b[^>]*>\s*<img[^>]*src=\{netlifyImage\(siteData\.heroCutoutPhoto \?\? siteData\.heroMainPhoto[^>]*?\)\}[^>]*alt=\{i\.hero\.name\}[^>]*width=\{548\}[^>]*height=\{1000\}[^>]*loading="eager"[^>]*fetchpriority="high"[^>]*decoding="async"[^>]*\/>\s*<\/HomeHeroPortrait>/s,
  );
  assert.doesNotMatch(heroSection, /home-hero__portrait-image/);
  assert.equal(
    heroSection.match(/class="home-hero__cta home-hero__cta--primary"/g)?.length,
    1,
    'public hero should keep the diagnosis CTA as the primary action',
  );
  assert.equal(
    heroSection.match(/class="home-hero__cta home-hero__cta--secondary"/g)?.length,
    1,
    'public hero should include the secondary services-scroll action',
  );
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

  // Clay redesign (24/11/2026, DESIGN.md): the photo sits in a clay arch with clay balls and stickers.
  assert.match(portraitSource, /data-home-hero-portrait/);
  assert.match(portraitSource, /<slot \/>/);
  assert.doesNotMatch(portraitSource, /home-hero__arch|home-hero__ball|home-hero__sticker/); // only the three photos (24/11/2026)
  assert.match(portraitSource, /home-hero__fan--left/);
  assert.match(
    globalCssSource,
    /\.home-hero__portrait\s*\{[^}]*max-width:\s*540px;[^}]*aspect-ratio:\s*5\s*\/\s*4\.25;[^}]*margin-inline:\s*auto;[^}]*\}/s,
  );
  // The LCP photo must never be hidden by an entrance animation.
  assert.doesNotMatch(globalCssSource, /\.home-hero__portrait-media\s*\{[^}]*(?:clip-path|animation|opacity:\s*0)/s);
  assert.match(
    globalCssSource,
    /\.home-hero__portrait-media img\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*contain;[^}]*\}/s,
  );
  assert.match(
    globalCssSource,
    /\.home-hero__portrait:hover\s+\.home-hero__portrait-media img,\s*\.home-hero__portrait:focus-within\s+\.home-hero__portrait-media img\s*\{[^}]*transform:\s*scale\(1\.03\);[^}]*\}/s,
  );
  assert.doesNotMatch(globalCssSource, /\.home-hero__portrait-image\b/);
  assert.doesNotMatch(globalCssSource, /home-hero__oval|home-hero__frame|home-hero__mark/);
});

test('admin hero mirrors current homepage copy and keeps the image and service editors intact', async () => {
  const adminHomeSource = await readSource('src/pages/admin/index.astro');
  const heroSection = extractBetweenMarkers(adminHomeSource, ADMIN_HOME_HERO_START, ADMIN_HOME_HERO_END, 'admin hero source');

  assert.match(
    heroSection,
    /<section\b(?=[^>]*\bdata-admin-home-hero\b)(?=[^>]*\bclass=["'][^"']*\bhome-hero\b[^"']*\bbg-paper\b[^"']*["'])[^>]*>/,
  );
  assert.match(heroSection, /i18nKey="home\.hero\.kicker"/);
  assert.match(heroSection, /i18nKey="home\.hero\.title"/);
  assert.match(heroSection, /i18nKey="home\.hero\.description"/);
  assert.match(heroSection, /i18nKey="home\.hero\.ctaDiagnosis"/);
  assert.match(heroSection, /i18nKey="home\.hero\.ctaServices"/);
  assert.match(
    heroSection,
    /<HomeHeroPortrait>\s*<EditableImage client:load imageKey="heroMainPhoto" className="h-full w-full" alt=\{i\.hero\.name\} \/>[\s\S]*<\/HomeHeroPortrait>/s,
  );
  assert.doesNotMatch(heroSection, /home-hero__portrait-image/);
  assert.match(heroSection, /href="\/admin\/contact" class="home-hero__cta home-hero__cta--primary"/);
  assert.match(heroSection, /href="#home-services" class="home-hero__cta home-hero__cta--secondary"/);
  assert.match(adminHomeSource, /HomeHeroPortrait/);
  assert.match(adminHomeSource, /EditableOrbitCollection/);
  assert.match(adminHomeSource, /AdminOrbitPreview/);
  assert.doesNotMatch(heroSection, /bg-\[radial-gradient/i);
  assert.doesNotMatch(heroSection, /bg-white\/72|backdrop-blur-sm/);
});
