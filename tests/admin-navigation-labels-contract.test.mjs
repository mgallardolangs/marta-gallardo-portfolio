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

function findArrayBodyContaining(source, requiredPatterns) {
  const arrayPattern = /const\s+\w+(?:\s*:\s*[^=]+?)?\s*=\s*\[((?:[\s\S]*?))\]\s*(?:as\s+const)?\s*;/g;
  let match;

  while ((match = arrayPattern.exec(source))) {
    const body = match[1];
    if (requiredPatterns.every((pattern) => pattern.test(body))) {
      return body;
    }
  }

  return null;
}

test('AdminToolbar keeps the shared navigation labels editable from one metadata list', async () => {
  const source = await readSource('src/components/admin/AdminToolbar.tsx');
  const navKeys = ['nav.home', 'nav.ugc', 'nav.translationSeo', 'nav.blog', 'nav.contact'];
  const navMetadataBody = findArrayBodyContaining(
    source,
    navKeys.map((key) => new RegExp(`key\\s*:\\s*['"]${escapeRegex(key)}['"]`)),
  );

  assert.ok(
    navMetadataBody,
    'AdminToolbar should keep the five shared navigation keys together in one metadata list.',
  );

  for (const key of navKeys) {
    assert.equal(
      countMatches(navMetadataBody, new RegExp(`key\\s*:\\s*['"]${escapeRegex(key)}['"]`, 'g')),
      1,
      `AdminToolbar should list ${key} exactly once in the shared navigation metadata.`,
    );
  }

  assert.match(
    source,
    /Navigation labels/,
    'AdminToolbar should label the nav editor section "Navigation labels".',
  );
  assert.match(
    source,
    /\.map\(\s*\(item\)\s*=>[\s\S]*?value=\{\s*store\.getText\(item\.key\)\s*\}[\s\S]*?onChange=\{\s*\(event\)\s*=>\s*store\.setText\(item\.key,\s*event\.target\.value\)\s*\}/s,
    'AdminToolbar should render the nav rows from one shared map template with controlled text inputs.',
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
  const navKeys = ['nav.home', 'nav.ugc', 'nav.translationSeo', 'nav.blog', 'nav.contact'];
  const navItemsBody = findArrayBodyContaining(
    source,
    navKeys.map((key) => new RegExp(`i18nKey\\s*:\\s*['"]${escapeRegex(key)}['"]`)),
  );

  assert.ok(navItemsBody, 'Header should keep the shared nav item metadata with i18n keys in one array.');
  assert.match(
    source,
    /import\s+AdminTextMirror\s+from\s+['"]\.\/admin\/AdminTextMirror['"];/,
    'Header should import the shared display-only admin mirror.',
  );

  for (const key of navKeys) {
    assert.match(
      navItemsBody,
      new RegExp(`i18nKey\\s*:\\s*['"]${escapeRegex(key)}['"]`),
      `Header should assign ${key} to a nav item.`,
    );
  }

  assert.equal(
    countMatches(navItemsBody, /i18nKey\s*:\s*['"]nav\.[^'"]+['"]/g),
    5,
    'Header should assign exactly one i18nKey per nav item.',
  );

  assert.equal(
    countMatches(source, /adminMode[\s\S]{0,500}<AdminTextMirror\b/g),
    2,
    'Header should gate the desktop and mobile nav mirrors behind adminMode.',
  );
  assert.equal(
    countMatches(source, /fallback=\{\s*item\.label\s*\}/g),
    2,
    'Header should keep the public nav label fallback static in both desktop and mobile copies.',
  );
  assert.match(
    source,
    /i18nKey=\{\s*item\.i18nKey\s*\}/,
    'Header mirror usage should pass through the nav item i18nKey.',
  );
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
    /(?:store\.initialized[\s\S]{0,120}fallback|fallback[\s\S]{0,120}store\.initialized)/s,
    'AdminTextMirror should render the fallback before initialization and the store text after initialization.',
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
