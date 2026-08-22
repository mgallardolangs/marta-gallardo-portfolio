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
const approvedOpaqueHexColors = new Set(['#f4f5f1', '#060403', '#e83256']);
const hexLiteralPattern = /#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})\b/gi;

function extractHexLiterals(source) {
  return [...source.matchAll(hexLiteralPattern)].map((match) => match[0]);
}

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

function getMarkedHomeOrbitSection(source) {
  const sectionMatch = source.match(/<section\b[^>]*(?:data-home-orbit\b|class=(['"])[^'"]*\bhome-orbit\b[^'"]*\1)[^>]*>/i);
  assert.ok(sectionMatch, 'Expected the Home orbit section to advertise a stable data-home-orbit or home-orbit marker');

  const start = sectionMatch.index ?? -1;
  assert.notEqual(start, -1, 'Expected the marked Home orbit section opening tag');

  const end = source.indexOf('</section>', start);
  assert.notEqual(end, -1, 'Expected the marked Home orbit section to close');

  return {
    openingTag: sectionMatch[0],
    section: source.slice(start, end + '</section>'.length),
  };
}

function getSvgTextNodes(source) {
  return [...source.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi)].map((match) => ({
    attributes: match[1] ?? '',
    textContent: match[2]?.trim() ?? '',
  }));
}

function getSvgRootOnlyTextChild(source) {
  const rootMatch = source.match(/^\s*<svg\b[^>]*>\s*(<text\b[^>]*>[\s\S]*?<\/text>)\s*<\/svg>\s*$/i);
  assert.ok(rootMatch, 'favicon should keep a root <svg> with exactly one <text> child and no sibling elements');
  return rootMatch[1] ?? '';
}

function getSvgPaintValues(source) {
  return [...source.matchAll(/\b(?:fill|stroke)=["']([^"']+)["']/gi)].map((match) => match[1].trim());
}

test('approved home correction removes legacy visual tokens and unapproved hex colors from the affected sources only', async () => {
  const sources = await Promise.all(
    affectedSourcePaths.map(async (relativePath) => [relativePath, await readSource(relativePath)]),
  );

  for (const [relativePath, source] of sources) {
    assert.doesNotMatch(
      source,
      legacyVisualTokenPattern,
      `${relativePath} should drop legacy blush/amaranth/rose-gold tokens and opaque #fff literals`,
    );

    const disallowedHexLiterals = [...new Set(
      extractHexLiterals(source).filter((hexLiteral) => !approvedOpaqueHexColors.has(hexLiteral.toLowerCase())),
    )];
    assert.deepEqual(
      disallowedHexLiterals,
      [],
      `${relativePath} should only keep approved opaque hex colors (#F4F5F1, #060403, #E83256); transparent variants must use rgb()/rgba()/color-mix() instead`,
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

test('Home keeps the approved full-width ink orbit wrapper contract instead of the old about side-by-side layout', async () => {
  const homeSource = await readSource('src/views/HomePage.astro');
  const orbitSection = getMarkedHomeOrbitSection(homeSource);

  assert.match(homeSource, /i\.home\.orbit\.kicker/);
  assert.match(homeSource, /i\.home\.orbit\.title/);
  assert.match(homeSource, /i\.home\.orbit\.description/);
  assert.match(homeSource, /i\.home\.orbit\.index/);
  assert.match(orbitSection.openingTag, /\bbg-ink\b/, 'the Home orbit section should sit on the ink background');
  assert.doesNotMatch(
    orbitSection.section,
    /\bbg-(?:white|paper)\b/,
    'the Home orbit section should not keep white or paper backgrounds in its wrapper contract',
  );
  assert.doesNotMatch(
    orbitSection.section,
    /\b(?:rounded(?:-[^\s"'`>]+)?|border(?:-[^\s"'`>]+)?|shadow(?:-[^\s"'`>]+)?|card)\b/i,
    'the Home orbit section should not keep rounded, border, shadow, or card wrapper chrome',
  );
  assert.doesNotMatch(
    orbitSection.section,
    /lg:grid-cols-\[1\.1fr_0\.9fr\]/,
    'the Home orbit section should no longer keep the adjacent two-column about layout',
  );
});

test('favicon keeps only a root svg with one ink MG text child', async () => {
  const faviconSource = await readSource('public/favicon.svg');
  const rootTextChild = getSvgRootOnlyTextChild(faviconSource);
  const textNodes = getSvgTextNodes(faviconSource);
  const paintValues = getSvgPaintValues(faviconSource)
    .filter((value) => !/^(?:none|transparent)$/i.test(value))
    .map((value) => value.toLowerCase());

  assert.equal(textNodes.length, 1, 'favicon should expose exactly one text node');
  assert.equal(textNodes[0]?.textContent, 'MG', 'favicon should render only the MG monogram');
  assert.match(rootTextChild, /^<text\b[^>]*>\s*MG\s*<\/text>$/i, 'favicon should keep MG as the lone direct svg child');
  assert.match(textNodes[0]?.attributes ?? '', /\bfill=["']#060403["']/i, 'favicon should render the MG mark in ink (#060403)');
  assert.doesNotMatch(
    faviconSource,
    /<(?:style|defs|rect|circle|ellipse|path|polygon|polyline|line|image|use|foreignObject)\b/i,
    'favicon should not include styles, defs, shapes, image/use nodes, or foreignObject content',
  );
  assert.doesNotMatch(faviconSource, /\bbackground(?:-color)?\b\s*(?:=|:)/i, 'favicon should not declare a background');
  assert.doesNotMatch(faviconSource, /\bstroke\b\s*(?:=|:)/i, 'favicon should not declare stroke paint');
  assert.deepEqual(
    [...new Set(paintValues)],
    ['#060403'],
    'favicon should not introduce any fill or stroke colors beyond the ink MG mark',
  );
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
