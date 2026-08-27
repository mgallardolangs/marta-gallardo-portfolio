import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const navKeys = ['nav.home', 'nav.ugc', 'nav.translationSeo', 'nav.blog', 'nav.contact'];
const navLabelsByLang = {
  es: {
    home: 'Inicio',
    ugc: 'Contenido creativo',
    translationSeo: 'Comunicación multilingüe y SEO',
    blog: 'Blog',
    contact: 'Contacto',
  },
  en: {
    home: 'Home',
    ugc: 'UGC',
    translationSeo: 'SEO Translation',
    blog: 'Blog',
    contact: 'Contact',
  },
  fr: {
    home: 'Accueil',
    ugc: 'UGC',
    translationSeo: 'Traduction SEO',
    blog: 'Blog',
    contact: 'Contact',
  },
};

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readOptionalSource(relativePath) {
  try {
    return await readSource(relativePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createMinimalNavI18n() {
  return {
    es: { nav: { ...navLabelsByLang.es } },
    en: { nav: { ...navLabelsByLang.en } },
    fr: { nav: { ...navLabelsByLang.fr } },
  };
}

function createMinimalSiteData() {
  return {
    heroMainPhoto: '/images/site/hero.webp',
    galleryCutouts: {},
    videoPlaceholderOrEmbedUrl: '',
    ugcHeaderImage: '',
    instagramScreenshot: '',
    socialLinks: { linkedin: '', instagram: '' },
    publicLanguagePicker: ['es', 'en', 'fr'],
    nicheBackgrounds: {},
    ugcVideos: {},
    ugcPhotos: {},
    nicheIcons: {},
    aboutPhotos: [],
    brandVideo: '',
    toolLogos: {},
    videoStickers: {},
    orbitMedia: [],
    ugcPortfolio: [],
    arsenal: { languages: [], tools: [], skills: [] },
    person: {
      name: 'Marta Gallardo',
      location: 'Elche',
      socialProfiles: { linkedin: '', instagram: '' },
    },
  };
}

function createAdminStore() {
  const store = new AdminStore();
  store.init(createMinimalNavI18n(), createMinimalSiteData(), 'es', 'publish-token');
  return store;
}

function findArrayDeclarationContaining(source, requiredPatterns) {
  const arrayPattern = /const\s+\w+(?:\s*:\s*[^=]+?)?\s*=\s*\[((?:[\s\S]*?))\]\s*(?:as\s+const)?\s*;/g;
  let match;

  while ((match = arrayPattern.exec(source))) {
    const [declaration, body] = match;
    const nameMatch = /const\s+(\w+)/.exec(declaration);

    assert.ok(nameMatch, 'Expected metadata array declarations to include a const name.');

    if (requiredPatterns.every((pattern) => pattern.test(body))) {
      return { name: nameMatch[1], body };
    }
  }

  return null;
}

function findPattern(source, pattern, startIndex = 0) {
  if (typeof pattern === 'string') {
    const index = source.indexOf(pattern, startIndex);

    return index === -1 ? null : { index, length: pattern.length, match: pattern };
  }

  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  regex.lastIndex = startIndex;

  const match = regex.exec(source);
  if (!match) return null;

  return { index: match.index, length: match[0].length, match: match[0] };
}

function extractBoundedBlock(source, startPattern, endPattern, description) {
  const start = findPattern(source, startPattern);
  assert.ok(start, `Expected to find the start of the ${description}.`);

  const end = findPattern(source, endPattern, start.index + start.length);
  assert.ok(end, `Expected to find the end of the ${description}.`);

  return source.slice(start.index, end.index + end.length);
}

function extractBalancedBlock(source, startIndex) {
  const opening = source[startIndex];
  const closing = opening === '(' ? ')' : opening === '{' ? '}' : null;

  assert.ok(closing, 'Expected a balanced block to start with ( or {.');

  let depth = 0;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (char === opening) {
      depth += 1;
    } else if (char === closing) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function extractMapRenderBlock(source, arrayName, description) {
  const mapCall = findPattern(
    source,
    new RegExp(`${escapeRegex(arrayName)}\\.map\\(\\s*\\(item\\)\\s*=>\\s*`),
  );

  assert.ok(mapCall, `Expected the ${description} to render from ${arrayName}.map((item) => ...).`);

  const blockStart = source.slice(mapCall.index + mapCall.length).search(/\S/);
  assert.notEqual(blockStart, -1, `Expected the ${description} map callback to render JSX.`);

  const absoluteBlockStart = mapCall.index + mapCall.length + blockStart;
  const renderBlock = extractBalancedBlock(source, absoluteBlockStart);

  assert.ok(renderBlock, `Expected the ${description} map callback to have a balanced render block.`);

  return renderBlock;
}

function extractTagBlock(source, startPattern, tagName, description) {
  const start = findPattern(source, startPattern);
  assert.ok(start, `Expected to find the start of the ${description}.`);

  const tagPattern = new RegExp(`<${escapeRegex(tagName)}(?=\\s|>)|</${escapeRegex(tagName)}>`, 'g');
  tagPattern.lastIndex = start.index;

  let depth = 0;
  let match;

  while ((match = tagPattern.exec(source))) {
    if (match[0].startsWith(`</${tagName}`)) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start.index, match.index + match[0].length);
      }
    } else {
      depth += 1;
    }
  }

  return null;
}

function extractComponentTags(source, componentName) {
  return [
    ...source.matchAll(new RegExp(`<${escapeRegex(componentName)}\\b[\\s\\S]*?/>`, 'g')),
  ].map(([tag]) => tag);
}

function extractHeader(html, label) {
  const match = html.match(/<header\b[\s\S]*?<\/header>/);
  assert.ok(match, `${label} should render a header element`);
  return match[0];
}

function extractAstroIslandBlocks(html) {
  return [...html.matchAll(/<astro-island\b[\s\S]*?<\/astro-island>/g)].map(([block]) => block);
}

test('AdminStore keeps shared navigation label edits scoped to the active locale', () => {
  const store = createAdminStore();

  for (const [key, value] of Object.entries(navLabelsByLang.es)) {
    assert.equal(
      store.getText(`nav.${key}`),
      value,
      `AdminStore should expose the current Spanish value for nav.${key}`,
    );
  }

  store.setText('nav.home', 'Portada');

  assert.equal(store.getText('nav.home'), 'Portada', 'setText should immediately update the active locale value');
  assert.equal(store.getText('nav.contact'), navLabelsByLang.es.contact, 'editing nav.home should not rewrite sibling Spanish labels');
  assert.equal(store.getSnapshot().isDirty, true, 'editing a navigation label should mark the store dirty');
  assert.ok(store.getSnapshot().pendingCount > 0, 'editing a navigation label should increase the pending diff count');

  store.setLang('en');

  assert.equal(store.getSnapshot().currentLang, 'en', 'setLang should switch the active locale');
  for (const [key, value] of Object.entries(navLabelsByLang.en)) {
    assert.equal(
      store.getText(`nav.${key}`),
      value,
      `switching to English should expose the English nav.${key} value`,
    );
  }

  store.setText('nav.home', 'Homepage');

  assert.equal(store.getText('nav.home'), 'Homepage', 'setText should update the English value once EN is active');
  assert.equal(store.getText('nav.contact'), navLabelsByLang.en.contact, 'editing the English home label should not rewrite sibling English labels');

  store.setLang('es');

  assert.equal(store.getText('nav.home'), 'Portada', 'switching back to Spanish should preserve the Spanish edit');
  assert.equal(store.getText('nav.contact'), navLabelsByLang.es.contact, 'switching locales should leave the original Spanish sibling labels intact');

  store.setLang('fr');
  assert.equal(store.getText('nav.home'), navLabelsByLang.fr.home, 'the untouched French locale should keep its original nav.home value');
});

test('AdminToolbar keeps the shared navigation labels editable from one metadata list', async () => {
  const source = await readSource('src/components/admin/AdminToolbar.tsx');
  const navMetadata = findArrayDeclarationContaining(
    source,
    navKeys.map((key) => new RegExp(`key\\s*:\\s*['"]${escapeRegex(key)}['"]`)),
  );

  assert.ok(
    navMetadata,
    'AdminToolbar should keep the five shared navigation keys together in one metadata list.',
  );

  for (const key of navKeys) {
    assert.equal(
      countMatches(navMetadata.body, new RegExp(`key\\s*:\\s*['"]${escapeRegex(key)}['"]`, 'g')),
      1,
      `AdminToolbar should list ${key} exactly once in the shared navigation metadata.`,
    );
  }

  assert.match(
    source,
    /Etiquetas de navegación/,
    'AdminToolbar should label the nav editor section "Etiquetas de navegación".',
  );
  assert.match(
    source,
    new RegExp(
      `${escapeRegex(navMetadata.name)}\\.map\\(\\s*\\(item\\)\\s*=>[\\s\\S]*?value=\\{\\s*store\\.getText\\(item\\.key\\)\\s*\\}[\\s\\S]*?onChange=\\{\\s*\\(event\\)\\s*=>\\s*store\\.setText\\(item\\.key,\\s*event\\.target\\.value\\)\\s*\\}`,
      's',
    ),
    `AdminToolbar should render the nav rows specifically from ${navMetadata.name}.map((item) => ...) with controlled text inputs.`,
  );
  const toolbarRenderBlock = extractMapRenderBlock(
    source,
    navMetadata.name,
    'shared navigation labels editor',
  );

  assert.doesNotMatch(
    toolbarRenderBlock,
    /item\.key\s*===/,
    'AdminToolbar should not gate the controlled input on one specific navigation key.',
  );
  assert.doesNotMatch(
    toolbarRenderBlock,
    /item\.key\s*!==/,
    'AdminToolbar should not exclude a navigation key from the controlled input.',
  );
  assert.doesNotMatch(
    toolbarRenderBlock,
    /\.filter\(/,
    'AdminToolbar should render the controlled input for every mapped metadata item instead of filtering the metadata collection.',
  );
  assert.equal(
    countMatches(source, /value=\{\s*store\.getText\(item\.key\)\s*\}/g),
    1,
    'AdminToolbar should render one controlled nav input binding.',
  );
  assert.equal(
    countMatches(source, /onChange=\{\s*\(event\)\s*=>\s*store\.setText\(item\.key,\s*event\.target\.value\)\s*\}/g),
    1,
    'AdminToolbar should write each nav label through one controlled onChange handler.',
  );
});

test('Header mirrors nav labels only under adminMode', async () => {
  const source = await readSource('src/components/Header.astro');
  const navMetadata = findArrayDeclarationContaining(
    source,
    navKeys.map((key) => new RegExp(`i18nKey\\s*:\\s*['"]${escapeRegex(key)}['"]`)),
  );

  assert.ok(navMetadata, 'Header should keep the shared nav item metadata with i18n keys in one array.');
  assert.match(
    source,
    /import\s+AdminTextMirror\s+from\s+['"]\.\/admin\/AdminTextMirror['"];/,
    'Header should import the shared display-only admin mirror.',
  );

  for (const key of navKeys) {
    assert.match(
      navMetadata.body,
      new RegExp(`i18nKey\\s*:\\s*['"]${escapeRegex(key)}['"]`),
      `Header should assign ${key} to a nav item.`,
    );
  }

  assert.equal(
    countMatches(navMetadata.body, /i18nKey\s*:\s*['"]nav\.[^'"]+['"]/g),
    5,
    'Header should assign exactly one i18nKey per nav item.',
  );

  const desktopNavSection = extractBoundedBlock(
    source,
    /<nav\s+aria-label="Primary"[\s\S]*?>/,
    '</nav>',
    'desktop primary navigation section',
  );
  const mobileNavSection = extractBoundedBlock(
    source,
    /<nav\s+aria-label="Mobile"[\s\S]*?>/,
    '</nav>',
    'mobile navigation section',
  );
  const desktopRenderBlock = extractMapRenderBlock(
    desktopNavSection,
    navMetadata.name,
    'desktop primary navigation section',
  );
  const mobileRenderBlock = extractMapRenderBlock(
    mobileNavSection,
    navMetadata.name,
    'mobile navigation section',
  );
  const desktopLabelRegion = extractTagBlock(
    desktopRenderBlock,
    /<span class="nav-link__text">/,
    'span',
    'desktop primary navigation label region',
  );
  const mobileLabelRegion = extractTagBlock(
    mobileRenderBlock,
    /<span class="mobile-nav-link__line">/,
    'span',
    'mobile navigation label region',
  );

  for (const [description, renderBlock, labelRegion, expectedClass] of [
    ['desktop primary navigation section', desktopRenderBlock, desktopLabelRegion, 'nav-link group'],
    ['mobile navigation section', mobileRenderBlock, mobileLabelRegion, 'mobile-nav-link'],
  ]) {
    assert.match(
      renderBlock,
      new RegExp(`class=["']${escapeRegex(expectedClass)}["']`),
      `Header should keep the ${description} anchored to the ${expectedClass} link markup.`,
    );
    assert.equal(
      countMatches(labelRegion, /adminMode\s*\?\s*(?:\(\s*)?<AdminTextMirror\b/g),
      2,
      `Header should keep two admin mirror branches in the ${description} label region.`,
    );
    assert.doesNotMatch(
      labelRegion,
      /item\.i18nKey\s*===|item\.i18nKey\s*!==/,
      `Header should not branch on a navigation i18n key in the ${description} label region.`,
    );
    assert.match(
      labelRegion,
      /adminMode\s*\?\s*(?:\(\s*)?<AdminTextMirror[\s\S]*?:\s*\(?\s*item\.label\s*\)?/s,
      `Header should use adminMode ? hydrated AdminTextMirror : item.label for each mapped navigation label in the ${description} label region.`,
    );
    const adminMirrors = extractComponentTags(labelRegion, 'AdminTextMirror');

    assert.equal(adminMirrors.length, 2, `Header should render exactly two AdminTextMirror copies in the ${description} label region.`);

    for (const mirrorTag of adminMirrors) {
      assert.match(
        mirrorTag,
        /\bclient:load\b/,
        `Header should hydrate each AdminTextMirror copy with client:load in the ${description} label region.`,
      );
      assert.match(
        mirrorTag,
        /i18nKey=\{\s*item\.i18nKey\s*\}/,
        `Header should pass item.i18nKey into each AdminTextMirror copy in the ${description} label region.`,
      );
      assert.match(
        mirrorTag,
        /fallback=\{\s*item\.label\s*\}/,
        `Header should pass item.label as the fallback for each AdminTextMirror copy in the ${description} label region.`,
      );
    }
    assert.equal(
      countMatches(labelRegion, /:\s*\(?\s*item\.label\s*\)?/g),
      2,
      `Header should keep two static item.label public fallbacks in the ${description} label region.`,
    );
  }
});

test('built header keeps public nav static and limits AdminTextMirror islands to the admin header', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built header HTML.');
    return;
  }

  const [publicHtml, adminHtml] = await Promise.all([
    readSource('dist/index.html'),
    readSource('dist/admin/index.html'),
  ]);

  const publicHeader = extractHeader(publicHtml, 'public home HTML');
  const adminHeader = extractHeader(adminHtml, 'admin home HTML');

  assert.doesNotMatch(publicHeader, /AdminTextMirror/, 'public header should not ship AdminTextMirror markers');
  assert.doesNotMatch(publicHeader, /<astro-island\b/, 'public header should stay static without hydrated admin text islands');

  for (const label of Object.values(navLabelsByLang.es)) {
    assert.match(
      publicHeader,
      new RegExp(escapeRegex(label)),
      `public header should keep the static Spanish nav label "${label}"`,
    );
  }

  const adminMirrorIslands = extractAstroIslandBlocks(adminHeader).filter((block) => block.includes('AdminTextMirror'));

  assert.ok(
    adminMirrorIslands.length >= navKeys.length * 4,
    'admin header should hydrate AdminTextMirror islands for both desktop and mobile nav label copies',
  );

  for (const island of adminMirrorIslands) {
    assert.match(island, /client="load"/, 'admin header nav mirrors should hydrate with client="load"');
  }

  for (const [i18nKey, fallback] of [
    ['nav.home', navLabelsByLang.es.home],
    ['nav.contact', navLabelsByLang.es.contact],
  ]) {
    const matchingIslands = adminMirrorIslands.filter((island) => (
      island.includes(i18nKey) && island.includes(fallback)
    ));

    assert.ok(
      matchingIslands.length >= 4,
      `admin header should include desktop and mobile hydrated AdminTextMirror copies for ${i18nKey} with the ${fallback} fallback`,
    );
  }
});

test('AdminTextMirror renders fallback until initialized and then mirrors store text', async () => {
  const source = await readOptionalSource('src/components/admin/AdminTextMirror.tsx');

  assert.ok(
    source,
    'src/components/admin/AdminTextMirror.tsx should be created to support display-only admin text mirrors.',
  );
  assert.match(source, /useAdminStore\(\)/, 'AdminTextMirror should subscribe through useAdminStore.');
  assert.match(
    source,
    /store\.getText\(i18nKey\)/,
    'AdminTextMirror should read the live admin text from store.getText(i18nKey).',
  );
  assert.match(
    source,
    /store\.initialized\s*\?\s*(?:\(\s*)?store\.getText\(i18nKey\)\s*(?:\))?\s*:\s*(?:\(\s*)?fallback\s*(?:\))?/s,
    'AdminTextMirror should render store.getText(i18nKey) when initialized and fallback otherwise.',
  );
  assert.doesNotMatch(source, /\bEditableText\b/, 'AdminTextMirror should not depend on EditableText.');
  assert.doesNotMatch(source, /\binput\b/, 'AdminTextMirror should not render inputs.');
  assert.doesNotMatch(source, /\bcontentEditable\b/, 'AdminTextMirror should not be editable content.');
  assert.doesNotMatch(source, /\bonClick\b/, 'AdminTextMirror should not wire click handlers.');
  assert.doesNotMatch(
    source,
    /\b(?:clickToEdit|showEditButton|editButtonTargetId)\b/,
    'AdminTextMirror should not expose editing controls.',
  );
});

test('global buttons keep native pointer and not-allowed cursors', async () => {
  const source = await readSource('src/styles/global.css');

  assert.match(
    source,
    /button:not\(:disabled\)\s*\{[\s\S]*?cursor:\s*pointer;[\s\S]*?\}/s,
    'Enabled native buttons should set cursor: pointer.',
  );
  assert.match(
    source,
    /button:disabled\s*\{[\s\S]*?cursor:\s*not-allowed;[\s\S]*?\}/s,
    'Disabled native buttons should set cursor: not-allowed.',
  );
});
