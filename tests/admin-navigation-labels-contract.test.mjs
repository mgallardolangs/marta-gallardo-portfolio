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

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findArrayBodyContaining(source, requiredPatterns) {
  const arrayPattern = /const\s+\w+\s*=\s*\[((?:[\s\S]*?))\];/g;
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
    navKeys.map((key) => new RegExp(escapeRegex(key))),
  );

  assert.ok(
    navMetadataBody,
    'AdminToolbar should keep the five shared navigation keys together in one metadata list.',
  );

  for (const key of navKeys) {
    assert.equal(
      countMatches(navMetadataBody, new RegExp(`['"]${escapeRegex(key)}['"]`, 'g')),
      1,
      `AdminToolbar should list ${key} exactly once in the shared navigation metadata.`,
    );
  }

  assert.match(
    source,
    /Navigation labels/,
    'AdminToolbar should label the nav editor section "Navigation labels".',
  );
  assert.equal(
    countMatches(source, /store\.getText\(item\.key\)/g),
    5,
    'AdminToolbar should read each nav label through store.getText(item.key) once per row.',
  );
  assert.equal(
    countMatches(source, /store\.setText\(item\.key,\s*event\.target\.value\)/g),
    5,
    'AdminToolbar should write each nav label through store.setText(item.key, event.target.value) once per row.',
  );
  assert.equal(
    countMatches(source, /value=\{store\.getText\(item\.key\)\}/g),
    5,
    'AdminToolbar should render one controlled input per shared nav key.',
  );
});

test('Header mirrors nav labels only under adminMode', async () => {
  const source = await readSource('src/components/Header.astro');
  const navItemsBody = source.match(/const\s+navItems\s*=\s*\[((?:[\s\S]*?))\];/)?.[1] ?? null;

  assert.ok(navItemsBody, 'Header should keep the shared nav item metadata in one array.');
  assert.match(
    source,
    /import\s+EditableText\s+from\s+['"]\.\/admin\/EditableText['"];/,
    'Header should import the shared display-only admin mirror.',
  );

  for (const key of ['nav.home', 'nav.ugc', 'nav.translationSeo', 'nav.blog', 'nav.contact']) {
    assert.match(
      navItemsBody,
      new RegExp(`i18nKey:\\s*['"]${escapeRegex(key)}['"]`),
      `Header should assign ${key} to a nav item.`,
    );
  }

  assert.equal(
    countMatches(navItemsBody, /i18nKey:\s*['"]nav\.[^'"]+['"]/g),
    5,
    'Header should assign exactly one i18nKey per nav item.',
  );

  assert.match(
    source,
    /class="nav-link"[\s\S]*?adminMode\s*\?[\s\S]*?EditableText client:load[\s\S]*?i18nKey=\{item\.i18nKey\}[\s\S]*?showEditButton=\{false\}[\s\S]*?:\s*\([\s\S]*?<span>\{item\.label\}<\/span>[\s\S]*?<span aria-hidden="true">\{item\.label\}<\/span>[\s\S]*?\)/s,
    'Desktop nav labels should use the admin mirror only inside adminMode and keep the public copy static.',
  );
  assert.match(
    source,
    /class="mobile-nav-link"[\s\S]*?adminMode\s*\?[\s\S]*?EditableText client:load[\s\S]*?i18nKey=\{item\.i18nKey\}[\s\S]*?showEditButton=\{false\}[\s\S]*?:\s*\([\s\S]*?<span>\{item\.label\}<\/span>[\s\S]*?<span aria-hidden="true">\{item\.label\}<\/span>[\s\S]*?\)/s,
    'Mobile nav labels should use the admin mirror only inside adminMode and keep the public copy static.',
  );
});

test('global buttons keep native pointer and not-allowed cursors', async () => {
  const source = await readSource('src/styles/global.css');

  assert.match(
    source,
    /button:not\(:disabled\)\s*\{\s*cursor:\s*pointer;\s*\}/s,
    'Enabled native buttons should set cursor: pointer.',
  );
  assert.match(
    source,
    /button:disabled\s*\{\s*cursor:\s*not-allowed;\s*\}/s,
    'Disabled native buttons should set cursor: not-allowed.',
  );
});
