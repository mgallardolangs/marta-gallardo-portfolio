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
    title: 'HISTORIAS EN MOVIMIENTO.',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'CONTENIDO · IDIOMAS · VIAJES · ARTE',
  },
  en: {
    kicker: 'CREATIVE ARCHIVE',
    title: 'STORIES IN MOTION.',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'CONTENT · LANGUAGES · TRAVEL · ART',
  },
  fr: {
    kicker: 'ARCHIVES CRÉATIVES',
    title: 'HISTOIRES EN MOUVEMENT.',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'CONTENU · LANGUES · VOYAGES · ART',
  },
  de: {
    kicker: 'KREATIVARCHIV',
    title: 'GESCHICHTEN IN BEWEGUNG.',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'INHALTE · SPRACHEN · REISEN · KUNST',
  },
  it: {
    kicker: 'ARCHIVIO CREATIVO',
    title: 'STORIE IN MOVIMENTO.',
    index: 'MARTA GALLARDO · PORTFOLIO',
    note: 'CONTENUTI · LINGUE · VIAGGI · ARTE',
  },
  ca: {
    kicker: 'ARXIU CREATIU',
    title: 'HISTÒRIES EN MOVIMENT.',
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

  assert.match(typedTitleSource, /<span class="typed-title__cursor" aria-hidden="true">_<\/span>/);
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
  const [homeSource, adminHomeSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/pages/admin/index.astro'),
  ]);

  assert.match(
    homeSource,
    /className="space-y-4 lg:col-start-1 lg:row-start-1 lg:self-start"[\s\S]*i\.home\.orbit\.kicker[\s\S]*i\.home\.orbit\.title/s,
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
  assert.match(globalCssSource, /\.home-hero__portrait-media\s*\{[^}]*clip-path:\s*inset\(100% 0 0 0\);[^}]*animation:\s*home-hero-portrait-reveal 1\.05s/s);
  assert.match(globalCssSource, /\.home-hero__portrait-corner\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px;[^}]*\}/s);
  assert.match(globalCssSource, /\.home-hero__portrait-corner--top-left\s*\{[^}]*animation-delay:\s*0\.62s;[^}]*\}/s);
  assert.match(globalCssSource, /\.home-hero__portrait-corner--bottom-left\s*\{[^}]*animation-delay:\s*0\.92s;[^}]*\}/s);
  assert.match(globalCssSource, /\.home-hero__portrait-rule\s*\{[^}]*animation:\s*home-hero-portrait-rule-draw [^;]* 1\.02s both;[^}]*\}/s);
  assert.match(globalCssSource, /\.home-hero__portrait:hover\s+\.home-hero__portrait-image,[\s\S]*transform:\s*scale\(1\.055\);[\s\S]*filter:\s*saturate\(/s);
});

test('public and admin heroes wire the approved portrait media with eager public loading and editable admin media', async () => {
  const [homeSource, adminHomeSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/pages/admin/index.astro'),
  ]);

  assert.match(homeSource, /import HomeHeroPortrait from '\.\.\/components\/HomeHeroPortrait\.astro';/);
  assert.match(
    homeSource,
    /<HomeHeroPortrait>\s*<img[^>]*src=\{siteData\.heroMainPhoto\}[^>]*alt=\{i\.hero\.name\}[^>]*width=\{1200\}[^>]*height=\{1600\}[^>]*loading="eager"[^>]*fetchpriority="high"[^>]*decoding="async"[^>]*class="home-hero__portrait-image"[^>]*\/>\s*<\/HomeHeroPortrait>/s,
  );

  assert.match(adminHomeSource, /import HomeHeroPortrait from '\.\.\/\.\.\/components\/HomeHeroPortrait\.astro';/);
  assert.match(
    adminHomeSource,
    /<HomeHeroPortrait>\s*<EditableImage client:load imageKey="heroMainPhoto" className="home-hero__portrait-image" alt=\{i\.hero\.name\} \/>[\s\S]*<\/HomeHeroPortrait>/s,
  );
});
