import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const expectedOrbitCopy = {
  es: {
    kicker: 'ARCHIVO CREATIVO',
    title: 'Mi historia',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'CONTENIDO · IDIOMAS · VIAJES · ARTE',
  },
  en: {
    kicker: 'CREATIVE ARCHIVE',
    title: 'My story',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'CONTENT · LANGUAGES · TRAVEL · ART',
  },
  fr: {
    kicker: 'ARCHIVES CRÉATIVES',
    title: 'Mon histoire',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'CONTENU · LANGUES · VOYAGES · ART',
  },
  de: {
    kicker: 'KREATIVARCHIV',
    title: 'Meine Geschichte',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'INHALTE · SPRACHEN · REISEN · KUNST',
  },
  it: {
    kicker: 'ARCHIVIO CREATIVO',
    title: 'La mia storia',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'CONTENUTI · LINGUE · VIAGGI · ARTE',
  },
  ca: {
    kicker: 'ARXIU CREATIU',
    title: 'La meva història',
    index: 'MARTA GALLARDO · PORTFOLI',
    note: 'CONTINGUT · IDIOMES · VIATGES · ART',
  },
};

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

test('TypedTitle owns a permanent custom cursor and disables Typed.js cursor injection', async () => {
  const [typedTitleSource, globalCssSource] = await Promise.all([
    readSource('src/components/TypedTitle.astro'),
    readSource('src/styles/global.css'),
  ]);

  assert.match(typedTitleSource, /<span class="typed-title__cursor" aria-hidden="true"><\/span>/);
  assert.match(typedTitleSource, /\.typed-title__cursor::before\s*\{\s*content:\s*'_';\s*\}/);
  assert.match(typedTitleSource, /showCursor:\s*false/);
  assert.doesNotMatch(typedTitleSource, /cursorChar:/);
  assert.match(
    typedTitleSource,
    /\.typed-title__cursor\s*\{[^}]*grid-area:\s*1\s*\/\s*2;[^}]*align-self:\s*end;[^}]*margin-inline-start:\s*0\.12em;[^}]*animation:\s*typed-title-cursor-blink 1s steps\(1\) infinite;[^}]*\}/s,
  );
  assert.doesNotMatch(globalCssSource, /\.typed-cursor\b/);
  assert.doesNotMatch(globalCssSource, /typed-cursor-blink/);
});

test('all six locale files replace home orbit descriptions with the approved four-field chrome copy', async () => {
  const dictionaries = await Promise.all(locales.map((locale) => readJson(`src/i18n/${locale}.json`)));

  dictionaries.forEach((dictionary, index) => {
    const locale = locales[index];
    const orbit = dictionary.home?.orbit;

    assert.deepEqual(Object.keys(orbit).sort(), ['index', 'kicker', 'note', 'title']);
    assert.deepEqual(orbit, expectedOrbitCopy[locale]);
  });
});

test('public and admin orbit sections render kicker title index note only, with note replacing the old description block', async () => {
  // The orbit carousel moved from Home to About on 24/11/2026 (clay redesign); its contract now lives there.
  const [homeSource, adminHomeSource] = await Promise.all([
    readSource('src/views/AboutPage.astro'),
    readSource('src/pages/admin/index.astro'),
  ]);

  assert.match(
    homeSource,
    /className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1 lg:self-start"[\s\S]*i\.home\.orbit\.kicker[\s\S]*i\.home\.orbit\.title/s,
  );
  assert.match(
    homeSource,
    /className="order-2 lg:col-start-3 lg:row-start-1 lg:order-none lg:justify-self-end lg:self-start"[\s\S]*i\.home\.orbit\.index/s,
  );
  assert.match(
    homeSource,
    /className="order-3 lg:col-start-1 lg:row-start-3 lg:order-none lg:self-end"[\s\S]*i\.home\.orbit\.note/s,
  );
  assert.doesNotMatch(homeSource, /i\.home\.orbit\.description/);

  assert.match(adminHomeSource, /i18nKey="home\.orbit\.kicker"/);
  assert.match(adminHomeSource, /i18nKey="home\.orbit\.title"/);
  assert.match(adminHomeSource, /i18nKey="home\.orbit\.index"/);
  assert.match(adminHomeSource, /i18nKey="home\.orbit\.note"/);
  assert.doesNotMatch(adminHomeSource, /i18nKey="home\.orbit\.description"/);
});

test('portrait refactor deletes the abstract hero visual and replaces it with the approved slotted image frame', async () => {
  const [homeSource, adminHomeSource, portraitSource, globalCssSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/pages/admin/index.astro'),
    readSource('src/components/HomeHeroPortrait.astro'),
    readSource('src/styles/global.css'),
  ]);

  await assert.rejects(access(path.join(rootDir, 'src/components/HomeHeroAbstractVisual.astro')));
  assert.doesNotMatch(homeSource, /HomeHeroAbstractVisual/);
  assert.doesNotMatch(adminHomeSource, /HomeHeroAbstractVisual/);

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
});

test('public and admin heroes wire the approved portrait media with eager public loading and editable admin media', async () => {
  const [homeSource, adminHomeSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/pages/admin/index.astro'),
  ]);

  assert.match(homeSource, /import HomeHeroPortrait from '\.\.\/components\/HomeHeroPortrait\.astro';/);
  assert.match(
    homeSource,
    /<HomeHeroPortrait\b[^>]*>\s*<img[^>]*src=\{netlifyImage\(siteData\.heroCutoutPhoto \?\? siteData\.heroMainPhoto[^>]*?\)\}[^>]*alt=\{i\.hero\.name\}[^>]*width=\{548\}[^>]*height=\{1000\}[^>]*loading="eager"[^>]*fetchpriority="high"[^>]*decoding="async"[^>]*\/>\s*<\/HomeHeroPortrait>/s,
  );
  assert.doesNotMatch(homeSource, /home-hero__portrait-image/);

  assert.match(adminHomeSource, /import HomeHeroPortrait from '\.\.\/\.\.\/components\/HomeHeroPortrait\.astro';/);
  assert.match(
    adminHomeSource,
    /<HomeHeroPortrait>\s*<EditableImage client:load imageKey="heroMainPhoto" className="h-full w-full" alt=\{i\.hero\.name\} \/>[\s\S]*<\/HomeHeroPortrait>/s,
  );
  assert.doesNotMatch(adminHomeSource, /home-hero__portrait-image/);
});
