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

test('AdminToolbar keeps the shared navigation labels editable from one metadata list', async () => {
  const source = await readSource('src/components/admin/AdminToolbar.tsx');
  const navKeys = ['nav.home', 'nav.ugc', 'nav.translationSeo', 'nav.blog', 'nav.contact'];
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
    /Navigation labels/,
    'AdminToolbar should label the nav editor section "Navigation labels".',
  );
  assert.match(
    source,
    new RegExp(
      `${escapeRegex(navMetadata.name)}\\.map\\(\\s*\\(item\\)\\s*=>[\\s\\S]*?value=\\{\\s*store\\.getText\\(item\\.key\\)\\s*\\}[\\s\\S]*?onChange=\\{\\s*\\(event\\)\\s*=>\\s*store\\.setText\\(item\\.key,\\s*event\\.target\\.value\\)\\s*\\}`,
      's',
    ),
    `AdminToolbar should render the nav rows specifically from ${navMetadata.name}.map((item) => ...) with controlled text inputs.`,
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

  for (const [description, renderBlock, expectedClass] of [
    ['desktop primary navigation section', desktopRenderBlock, 'nav-link group'],
    ['mobile navigation section', mobileRenderBlock, 'mobile-nav-link'],
  ]) {
    assert.match(
      renderBlock,
      new RegExp(`class=["']${escapeRegex(expectedClass)}["']`),
      `Header should keep the ${description} anchored to the ${expectedClass} link markup.`,
    );
    assert.match(
      renderBlock,
      /adminMode\s*\?/,
      `Header should make the ${description} label rendering conditional on adminMode.`,
    );
    assert.equal(
      countMatches(renderBlock, /<AdminTextMirror\b/g),
      2,
      `Header should render exactly two AdminTextMirror copies in the ${description}.`,
    );
    assert.equal(
      countMatches(renderBlock, /i18nKey=\{\s*item\.i18nKey\s*\}/g),
      2,
      `Header should pass item.i18nKey into both AdminTextMirror copies in the ${description}.`,
    );
    assert.equal(
      countMatches(renderBlock, /fallback=\{\s*item\.label\s*\}/g),
      2,
      `Header should pass item.label as the fallback for both AdminTextMirror copies in the ${description}.`,
    );
    assert.equal(
      countMatches(renderBlock, /:\s*\(?\s*item\.label\s*\)?/g),
      2,
      `Header should keep item.label as the public branch for both visible label copies in the ${description}.`,
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
