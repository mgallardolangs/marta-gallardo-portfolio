import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const affectedSourcePaths = [
  'src/styles/global.css',
  'src/components/Header.astro',
  'src/components/TypedTitle.astro',
  'src/views/HomePage.astro',
  'src/components/OvalMediaOrbit.tsx',
  'src/pages/admin/index.astro',
  'src/components/admin/AdminOrbitPreview.tsx',
];
const legacyVisualTokenPattern = /\b(?:amaranth-soft|amaranth-mist|amaranth-ink|blush-[a-z0-9/-]+|rose-gold)\b|#fff(?:fff)?\b/i;

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

function getEnclosingSection(source, marker) {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Expected source marker: ${marker}`);

  const start = source.lastIndexOf('<section', markerIndex);
  assert.notEqual(start, -1, `Expected enclosing <section> before: ${marker}`);

  const end = source.indexOf('</section>', markerIndex);
  assert.notEqual(end, -1, `Expected closing </section> after: ${marker}`);

  return source.slice(start, end + '</section>'.length);
}

test('approved home correction removes legacy visual tokens from the affected sources only', async () => {
  const sources = await Promise.all(
    affectedSourcePaths.map(async (relativePath) => [relativePath, await readSource(relativePath)]),
  );

  for (const [relativePath, source] of sources) {
    assert.doesNotMatch(
      source,
      legacyVisualTokenPattern,
      `${relativePath} should drop legacy blush/amaranth/rose-gold tokens and opaque #fff literals`,
    );
  }
});

test('header shell and social controls keep the mock-faithful chrome contract', async () => {
  const headerSource = await readSource('src/components/Header.astro');

  assert.doesNotMatch(
    headerSource,
    /site-header__shell[^"\n]*rounded/i,
    'site-header__shell should not keep a rounded container',
  );
  assert.doesNotMatch(
    headerSource,
    /site-header__shell[^"\n]*(?:border(?:-[^"\s]+)?|bg-[^"\s]+|backdrop-blur)/,
    'site-header__shell should not keep border, background, or backdrop classes',
  );
  assert.doesNotMatch(
    headerSource,
    /\.site-header\[data-compact='true'\]\s*\.site-header__shell\s*\{[^}]*?(?:border-radius|box-shadow)\s*:/s,
    'compact header shell should not reintroduce rounded chrome or shadows',
  );
  assert.doesNotMatch(
    headerSource,
    /\.site-header__shell\s*\{[^}]*box-shadow\s*:/s,
    'site-header__shell should not keep a resting box shadow',
  );
  assert.match(
    headerSource,
    /\.social-control\s*\{[^}]*box-shadow:\s*none;/s,
    'social icons should sit flat until hover or focus',
  );
  assert.match(
    headerSource,
    /\.social-control:hover,\s*\.social-control:focus-visible\s*\{[^}]*color:\s*(?:var\(--color-amaranth\)|#E83256);[^}]*box-shadow:\s*[^;]*(?:232,\s*50,\s*86|#E83256)/s,
    'social icons should only lift with the approved amaranth hover/focus shadow',
  );
});

test('TypedTitle keeps the underscore cursor and global injected cursor styling contract', async () => {
  const [typedTitleSource, globalCssSource] = await Promise.all([
    readSource('src/components/TypedTitle.astro'),
    readSource('src/styles/global.css'),
  ]);

  assert.match(typedTitleSource, /showCursor:\s*true/);
  assert.match(typedTitleSource, /cursorChar:\s*['_"]_/);
  assert.match(
    globalCssSource,
    /\.typed-cursor\s*\{[^}]*color:\s*(?:var\(--color-amaranth\)|#E83256);[^}]*margin(?:-inline-start|-left):\s*[^;]+;[^}]*animation:\s*[^;]*infinite[^;]*;/s,
    'the injected Typed.js cursor should be styled globally with the approved color, fixed gap, and infinite blink',
  );
});

test('Home keeps the approved full-width ink orbit feature instead of the old about side-by-side layout', async () => {
  const homeSource = await readSource('src/views/HomePage.astro');
  const orbitSection = getEnclosingSection(homeSource, '<OvalMediaOrbit client:visible');

  assert.match(homeSource, /i\.home\.orbit\.kicker/);
  assert.match(homeSource, /i\.home\.orbit\.title/);
  assert.match(homeSource, /i\.home\.orbit\.description/);
  assert.match(homeSource, /i\.home\.orbit\.index/);
  assert.match(orbitSection, /bg-ink/, 'the Home orbit section should sit on the ink background');
  assert.doesNotMatch(
    orbitSection,
    /lg:grid-cols-\[1\.1fr_0\.9fr\]/,
    'the Home orbit section should no longer keep the adjacent two-column about layout',
  );
});

test('favicon stays transparent and renders only a black MG mark', async () => {
  const faviconSource = await readSource('public/favicon.svg');

  assert.doesNotMatch(faviconSource, /<rect\b/i, 'favicon should not include a filled background rect');
  assert.doesNotMatch(faviconSource, /#(?:B76E79|E83256|FFFAF8)/i, 'favicon should not keep the legacy pink or pale fills');
  assert.match(faviconSource, /MG/);
  assert.match(faviconSource, /#(?:000|000000)\b/i, 'favicon should render the MG mark in black');
});

test('site orbit dataset is the approved local mock placeholder set', async () => {
  const site = await readJson('src/data/site.json');

  assert.equal(site.orbitMedia.length, 15, 'orbitMedia should stay at exactly 15 items');

  site.orbitMedia.forEach((item, index) => {
    assert.equal(item.type, 'image', `orbitMedia[${index}] should ship as an image placeholder`);
    assert.match(
      item.src,
      /^\/images\/orbit\/mock-\d{2}\.webp$/,
      `orbitMedia[${index}].src should point at the approved local mock placeholder path`,
    );
    assert.equal(item.href, null, `orbitMedia[${index}].href should stay null until real destinations are approved`);
  });
});

test('all six locale files expose the approved home orbit copy keys', async () => {
  const dictionaries = await Promise.all(
    locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)]),
  );

  for (const [locale, dictionary] of dictionaries) {
    const orbitCopy = dictionary.home?.orbit;
    assert.ok(orbitCopy && typeof orbitCopy === 'object', `${locale} should define home.orbit`);

    for (const key of ['kicker', 'title', 'description', 'index']) {
      assert.equal(typeof orbitCopy[key], 'string', `${locale} home.orbit.${key} should be a string`);
      assert.notEqual(orbitCopy[key].trim(), '', `${locale} home.orbit.${key} should not be empty`);
    }
  }
});
