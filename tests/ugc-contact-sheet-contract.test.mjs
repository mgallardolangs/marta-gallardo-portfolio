import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];

async function readSource(relativePath) {
  try {
    return await readFile(path.join(rootDir, relativePath), 'utf8');
  } catch (error) {
    assert.fail(`${relativePath} should exist for the approved UGC contact sheet contract: ${error.message}`);
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

async function importModule(relativePath) {
  try {
    return await import(pathToFileURL(path.join(rootDir, relativePath)).href);
  } catch (error) {
    assert.fail(`${relativePath} should export the approved UGC contact sheet helpers: ${error.message}`);
  }
}

function assertMatchesAny(source, patterns, message) {
  assert.ok(
    patterns.some((pattern) => pattern.test(source)),
    message,
  );
}

test('all six locale files expose the exact UGC contact sheet copy keys', async () => {
  const dictionaries = await Promise.all(
    locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)]),
  );

  for (const [locale, dictionary] of dictionaries) {
    assert.ok(dictionary.ugcPage?.contactSheet, `${locale} should define ugcPage.contactSheet`);
    assert.deepEqual(
      Object.keys(dictionary.ugcPage.contactSheet),
      ['eyebrow', 'headline', 'filters', 'close', 'previous', 'next', 'formatLabel', 'pieceLabel'],
      `${locale} should keep the exact approved contactSheet keys`,
    );
    assert.deepEqual(
      Object.keys(dictionary.ugcPage.contactSheet.filters),
      ['all', 'travel', 'languages', 'art'],
      `${locale} should keep the exact approved contactSheet filter keys`,
    );

    for (const key of ['eyebrow', 'headline', 'close', 'previous', 'next', 'formatLabel', 'pieceLabel']) {
      assert.equal(typeof dictionary.ugcPage.contactSheet[key], 'string', `${locale} contactSheet.${key} should be a string`);
      assert.notEqual(dictionary.ugcPage.contactSheet[key].trim(), '', `${locale} contactSheet.${key} should not be empty`);
    }

    for (const filterKey of ['all', 'travel', 'languages', 'art']) {
      assert.equal(
        typeof dictionary.ugcPage.contactSheet.filters[filterKey],
        'string',
        `${locale} contactSheet.filters.${filterKey} should be a string`,
      );
      assert.notEqual(
        dictionary.ugcPage.contactSheet.filters[filterKey].trim(),
        '',
        `${locale} contactSheet.filters.${filterKey} should not be empty`,
      );
    }
  }
});

test('UGC helper module keeps filter visibility and wraparound navigation pure', async () => {
  const ugcModule = await importModule('src/lib/ugcPortfolio.ts');
  const { filterUgcPortfolio, getUgcTileVisibility, getNextUgcIndex } = ugcModule;
  const createLocalizedText = (seed) => Object.fromEntries(locales.map((locale) => [locale, `${seed}-${locale}`]));
  const items = [
    'travel',
    'languages',
    'art',
    'travel',
    'languages',
    'art',
    'travel',
    'languages',
    'art',
    'travel',
    'languages',
    'art',
  ].map((category, index) => ({
    id: `ugc-${category}-${String(Math.floor(index / 3) + 1).padStart(2, '0')}`,
    category,
    type: index % 2 === 0 ? 'image' : 'video',
    src: `/images/ugc/mock-${String(index + 1).padStart(2, '0')}.${index % 2 === 0 ? 'webp' : 'mp4'}`,
    poster: index % 2 === 0 ? null : `/images/ugc/mock-${String(index + 1).padStart(2, '0')}.webp`,
    label: createLocalizedText(`label-${index}`),
    title: createLocalizedText(`title-${index}`),
    description: createLocalizedText(`description-${index}`),
    format: createLocalizedText(`format-${index}`),
    alt: createLocalizedText(`alt-${index}`),
  }));

  assert.equal(typeof filterUgcPortfolio, 'function', 'filterUgcPortfolio should be exported');
  assert.equal(typeof getUgcTileVisibility, 'function', 'getUgcTileVisibility should be exported');
  assert.equal(typeof getNextUgcIndex, 'function', 'getNextUgcIndex should be exported');
  assert.equal(filterUgcPortfolio(items, 'all').length, 12, 'all filter should preserve all 12 fixed slots');
  assert.equal(filterUgcPortfolio(items, 'travel').length, 4, 'travel filter should return only the four travel slots');
  assert.equal(filterUgcPortfolio(items, 'languages').length, 4, 'languages filter should return only the four language slots');
  assert.equal(filterUgcPortfolio(items, 'art').length, 4, 'art filter should return only the four art slots');
  assert.equal(getUgcTileVisibility(items[0], 'art'), 'blank', 'non-matching tiles should become blank instead of unmounting');
  assert.equal(getUgcTileVisibility(items[0], 'travel'), 'visible', 'matching tiles should stay visible');
  assert.equal(getUgcTileVisibility(items[0], 'all'), 'visible', 'all filter should keep every tile visible');
  assert.equal(getNextUgcIndex(4, 0, 'previous'), 3, 'previous navigation should wrap from first to last');
  assert.equal(getNextUgcIndex(4, 3, 'next'), 0, 'next navigation should wrap from last to first');

  const initialFilter = typeof ugcModule.getInitialUgcFilter === 'function'
    ? ugcModule.getInitialUgcFilter()
    : ugcModule.INITIAL_UGC_FILTER ?? ugcModule.DEFAULT_UGC_FILTER ?? null;

  if (initialFilter !== null) {
    assert.equal(initialFilter, 'all', 'initial UGC filter helpers should default to All');
  }
});

test('public UgcPage keeps TypedTitle but swaps in the approved contact-sheet shell', async () => {
  const pageSource = await readSource('src/views/UgcPage.astro');

  assert.match(
    pageSource,
    /<section\b(?=[^>]*\bdata-ugc-hero\b)[^>]*>/,
    'UgcPage should expose a stable data-ugc-hero marker for the approved editorial hero',
  );
  assert.match(pageSource, /<TypedTitle\b/, 'UgcPage should preserve TypedTitle in the hero');
  assert.match(pageSource, /i\.ugcPage\.contactSheet\.eyebrow/, 'UgcPage should use the approved contactSheet eyebrow key');
  assert.match(pageSource, /i\.ugcPage\.contactSheet\.headline/, 'UgcPage should use the approved contactSheet headline key');
  assert.match(pageSource, /<UgcContactSheet\b/, 'UgcPage should render the shared UgcContactSheet component');
  assert.match(pageSource, /\.ugcPortfolio\b/, 'UgcPage should render from the fixed ugcPortfolio dataset');
  assert.match(pageSource, /contactSheet\b/, 'UgcPage should pass contactSheet copy into the public component');
  assert.doesNotMatch(pageSource, /\bNicheCard\b/, 'UgcPage should remove the old niche cards');
  assert.doesNotMatch(pageSource, /\bhero-carousel\b/, 'UgcPage should remove the old hero carousel');
  assert.doesNotMatch(pageSource, /\bniches\.map\(/, 'UgcPage should remove the old niche chapter loop');
  assert.doesNotMatch(pageSource, /\bbackToTop\b/, 'UgcPage should remove back-to-top chrome from the public composition');
  assert.doesNotMatch(pageSource, /\bPhotoMasonry\b/, 'UgcPage should remove duplicate photo masonry usage');
  assert.doesNotMatch(pageSource, /\bVideoGallery\b/, 'UgcPage should remove duplicate video gallery usage');
});

test('UgcContactSheet component locks fixed filters grid blank tiles hover previews and focus viewer behavior', async () => {
  const componentSource = await readSource('src/components/UgcContactSheet.tsx');

  assert.match(
    componentSource,
    /\[\s*['"]all['"]\s*,\s*['"]travel['"]\s*,\s*['"]languages['"]\s*,\s*['"]art['"]\s*\]/,
    'UgcContactSheet should keep the approved filter order All / Travel / Languages / Art',
  );
  assertMatchesAny(
    componentSource,
    [
      /useState(?:<[^>]+>)?\(\s*['"]all['"]\s*\)/,
      /useState(?:<[^>]+>)?\(\s*(?:INITIAL|DEFAULT)_UGC_FILTER\s*\)/,
      /useState(?:<[^>]+>)?\(\s*getInitialUgcFilter\(\)\s*\)/,
    ],
    'UgcContactSheet should start on the All filter through a stable useState contract or a small pure helper',
  );
  assert.match(componentSource, /\bgrid-cols-2\b/, 'UgcContactSheet should keep a two-column mobile grid');
  assert.match(componentSource, /\blg:grid-cols-4\b/, 'UgcContactSheet should keep a four-column desktop grid');
  assert.match(componentSource, /\bitems\.map\(/, 'UgcContactSheet should render all authored slots instead of only visible items');
  assert.match(componentSource, /getUgcTileVisibility\(\s*item\s*,\s*filter\s*\)/, 'UgcContactSheet should derive blank vs visible tiles from the pure visibility helper');
  assert.match(componentSource, /\bpointer-events-none\b/, 'blank contact-sheet tiles should be non-interactive');
  assert.match(componentSource, /\bbg-paper\b/, 'blank contact-sheet tiles should become paper cells');
  assert.match(componentSource, /\bopacity-0\b/, 'filtered media should stay mounted and fade out instead of unmounting');
  assert.match(componentSource, /onPointerEnter/, 'video tiles should react to hover');
  assert.match(componentSource, /muted\s*=\s*true/, 'hover previews should play muted');
  assert.match(componentSource, /currentTime\s*=\s*0/, 'video previews should reset to time zero');
  assert.match(componentSource, /\.play\(\)/, 'video hover previews should attempt playback');
  assert.match(componentSource, /onPointerLeave/, 'video tiles should react to pointer leave');
  assert.match(componentSource, /\.pause\(\)/, 'pointer leave should pause video previews');
  assert.match(componentSource, /\brole=["']dialog["']/, 'focus viewer should expose a dialog role');
  assert.match(componentSource, /\baria-modal=["']true["']/, 'focus viewer should be modal');
  assert.match(componentSource, /\baspect-\[9\/16\]\b/, 'focus viewer media should stay in a 9:16 frame');
  assert.match(componentSource, /\bcopy\.close\b/, 'focus viewer should expose the localized close label');
  assert.match(componentSource, /\bcopy\.previous\b/, 'focus viewer should expose localized previous navigation');
  assert.match(componentSource, /\bcopy\.next\b/, 'focus viewer should expose localized next navigation');
  assert.match(componentSource, /\bcopy\.formatLabel\b/, 'focus viewer should render localized format metadata');
  assert.match(componentSource, /\bcopy\.pieceLabel\b/, 'focus viewer should render localized piece metadata');
  assert.match(componentSource, /filterUgcPortfolio\(\s*items\s*,\s*filter\s*\)/, 'focus viewer navigation should scope itself to the active filter');
  assert.match(componentSource, /getNextUgcIndex\(/, 'focus viewer navigation should wrap through the pure helper');
  assert.match(componentSource, /findIndex\(\s*\(?item\)?\s*=>\s*item\.id\s*===\s*activeId\s*\)/, 'focus viewer should resolve active items against the visible filter');
  assert.match(componentSource, /Escape/, 'Escape should close the focus viewer');
  assert.match(componentSource, /ArrowUp/, 'ArrowUp should navigate the focused viewer');
  assert.match(componentSource, /ArrowDown/, 'ArrowDown should navigate the focused viewer');
  assert.match(componentSource, /\bloop\b/, 'focused videos should loop');
  assertMatchesAny(
    componentSource,
    [
      /\b(?:play|start)[A-Za-z]*(?:Focused|Active|Modal)[A-Za-z]*Video(?:Playback)?\s*\(/,
      /(?:focused|active|modal)[A-Za-z]*Video(?:Ref)?(?:\.current)?[\s\S]{0,240}?\.muted\s*=\s*false[\s\S]{0,240}?\.play\(\)/i,
    ],
    'focused videos should explicitly unmute and start after a user click instead of relying on autoplay alone; a playback helper is welcome',
  );
  assertMatchesAny(
    componentSource,
    [
      /\b(?:reset|stop|cleanup)[A-Za-z]*(?:Focused|Active|Modal)[A-Za-z]*Video(?:Playback)?\s*\(/,
      /(?:focused|active|modal)[A-Za-z]*Video(?:Ref)?(?:\.current)?[\s\S]{0,240}?\.pause\(\)[\s\S]{0,160}?currentTime\s*=\s*0/i,
    ],
    'focused viewer should pause and rewind the previously active video during navigation and when closing',
  );
  assert.match(
    componentSource,
    /paused\s*\?\s*[^:]*\.play\(\)\s*:\s*[^;]*\.pause\(\)/,
    'clicking the focused video should toggle play and pause',
  );
});

test('admin UGC preview and fixed-slot editor expose only the approved controls', async () => {
  const [adminPageSource, editorSource, adminStoreSource] = await Promise.all([
    readSource('src/pages/admin/ugc.astro'),
    readSource('src/components/admin/EditableUgcPortfolio.tsx'),
    readSource('src/components/admin/adminStore.ts'),
  ]);

  assert.match(adminPageSource, /<UgcContactSheet\b/, 'admin UGC page should reuse the public contact-sheet preview');
  assert.match(adminPageSource, /<EditableUgcPortfolio\b/, 'admin UGC page should render the fixed-slot editor');
  assert.match(adminPageSource, /contactSheet\b/, 'admin UGC page should pass the approved contactSheet copy');
  assert.doesNotMatch(adminPageSource, /\bAdminNicheCard\b/, 'admin UGC page should remove the niche-card editor');
  assert.doesNotMatch(adminPageSource, /\bhero-carousel\b/, 'admin UGC page should remove the old hero carousel');
  assert.doesNotMatch(adminPageSource, /\bniches\.map\(/, 'admin UGC page should remove the old niche chapter loop');
  assert.doesNotMatch(adminPageSource, /\bPhotoMasonry\b/, 'admin UGC page should remove duplicate masonry preview blocks');
  assert.doesNotMatch(adminPageSource, /\bVideoGallery\b/, 'admin UGC page should remove duplicate gallery preview blocks');
  assert.doesNotMatch(adminPageSource, /\bbackToTop\b/, 'admin UGC page should remove back-to-top chrome');

  assert.match(editorSource, /\[\s*['"]es['"]\s*,\s*['"]en['"]\s*,\s*['"]fr['"]\s*\]/, 'EditableUgcPortfolio should limit editable locales to ES / EN / FR');
  assert.match(editorSource, /updateUgcPortfolioField\([^)]*['"]category['"]/, 'EditableUgcPortfolio should edit the category field');
  assert.match(editorSource, /updateUgcPortfolioField\([^)]*['"]type['"]/, 'EditableUgcPortfolio should edit the type field');
  assert.match(editorSource, /updateUgcPortfolioField\([^)]*['"]label['"]/, 'EditableUgcPortfolio should edit localized labels');
  assert.match(editorSource, /updateUgcPortfolioField\([^)]*['"]title['"]/, 'EditableUgcPortfolio should edit localized titles');
  assert.match(editorSource, /updateUgcPortfolioField\([^)]*['"]description['"]/, 'EditableUgcPortfolio should edit localized descriptions');
  assert.match(editorSource, /updateUgcPortfolioField\([^)]*['"]format['"]/, 'EditableUgcPortfolio should edit localized formats');
  assert.match(editorSource, /updateUgcPortfolioField\([^)]*['"]alt['"]/, 'EditableUgcPortfolio should edit localized alt text');
  assert.match(editorSource, /setUgcPortfolioMedia\(/, 'EditableUgcPortfolio should edit slot media');
  assert.match(editorSource, /setUgcPortfolioPoster\(/, 'EditableUgcPortfolio should edit slot posters');
  assert.doesNotMatch(editorSource, /\baddUgcPortfolio\b|\bremoveUgcPortfolio\b|\bmoveUgcPortfolio\b|\breorderUgcPortfolio\b/, 'EditableUgcPortfolio should not add, remove, move, or reorder slots');
  assert.doesNotMatch(editorSource, />\s*(?:Add|Remove|Move|Reorder)\b/i, 'EditableUgcPortfolio should not expose add/remove/reorder buttons');

  assert.match(adminStoreSource, /updateUgcPortfolioField\s*\(/, 'adminStore should expose fixed-slot field updates');
  assert.match(adminStoreSource, /setUgcPortfolioMedia\s*\(/, 'adminStore should expose fixed-slot media uploads');
  assert.match(adminStoreSource, /setUgcPortfolioPoster\s*\(/, 'adminStore should expose fixed-slot poster uploads');
  assert.doesNotMatch(adminStoreSource, /\baddUgcPortfolioItem\b|\bremoveUgcPortfolioItem\b|\bmoveUgcPortfolioItem\b|\breorderUgcPortfolioItem\b/, 'adminStore should not reintroduce add/remove/reorder mutations for UGC slots');
  assert.match(adminStoreSource, /['"]src\/data\/site\.json['"]/, 'admin publishing should still write the fixed-slot dataset back to src/data/site.json');
});
