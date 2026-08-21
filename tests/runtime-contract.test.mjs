import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getAdminInitDecision,
  shouldAllowTokenlessAdminInit,
} from '../src/lib/adminInit.js';
import {
  FOOTER_REVEAL_STORAGE_KEY,
  getFooterRevealMode,
} from '../src/lib/footerReveal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicUgcPages = [
  'src/pages/ugc.astro',
  'src/pages/en/ugc.astro',
  'src/pages/fr/ugc.astro',
  'src/pages/de/ugc.astro',
  'src/pages/it/ugc.astro',
  'src/pages/ca/ugc.astro',
];
const publicContactPages = [
  'src/pages/contact.astro',
  'src/pages/en/contact.astro',
  'src/pages/fr/contact.astro',
  'src/pages/de/contact.astro',
  'src/pages/it/contact.astro',
  'src/pages/ca/contact.astro',
];

test('footer reveal only animates once per browser session and skips on reduced motion', () => {
  assert.equal(FOOTER_REVEAL_STORAGE_KEY, 'mg-footer-reveal-seen');
  assert.equal(getFooterRevealMode({ hasSessionFlag: false, prefersReducedMotion: false }), 'play');
  assert.equal(getFooterRevealMode({ hasSessionFlag: true, prefersReducedMotion: false }), 'skip');
  assert.equal(getFooterRevealMode({ hasSessionFlag: false, prefersReducedMotion: true }), 'skip');
});

test('admin auth fallback stays local-only and later identity login can upgrade an initialized store', () => {
  assert.equal(shouldAllowTokenlessAdminInit('localhost'), true);
  assert.equal(shouldAllowTokenlessAdminInit('127.0.0.1'), true);
  assert.equal(shouldAllowTokenlessAdminInit('::1'), true);
  assert.equal(shouldAllowTokenlessAdminInit('studio-portfolio.netlify.app'), false);

  assert.equal(
    getAdminInitDecision({ isInitialized: false, identityToken: '', allowTokenlessFallback: false }),
    'wait',
  );
  assert.equal(
    getAdminInitDecision({ isInitialized: false, identityToken: '', allowTokenlessFallback: true }),
    'init-without-token',
  );
  assert.equal(
    getAdminInitDecision({ isInitialized: false, identityToken: 'token-123', allowTokenlessFallback: false }),
    'init-with-token',
  );
  assert.equal(
    getAdminInitDecision({ isInitialized: true, identityToken: 'token-123', allowTokenlessFallback: false }),
    'update-token',
  );
});

test('admin layout does not force a full reload after Netlify Identity login', async () => {
  const source = await readFile(path.join(rootDir, 'src/layouts/AdminLayout.astro'), 'utf8');

  assert.doesNotMatch(source, /location\.reload\(\)/);
  assert.doesNotMatch(source, /document\.location/);
});

test('public UGC pages rerun carousel setup on astro:page-load without inline duplicate listeners', async () => {
  const sources = await Promise.all(
    publicUgcPages.map(async (relativePath) => [relativePath, await readFile(path.join(rootDir, relativePath), 'utf8')]),
  );

  for (const [relativePath, source] of sources) {
    assert.match(source, /import\s+\{\s*initHeroCarousels\s*\}\s+from\s+['"].+heroCarousel\.js['"]/,
      `${relativePath} should use the shared hero carousel initializer`);
    assert.match(source, /const initUgcPage = \(\) => initHeroCarousels\(\);/,
      `${relativePath} should wrap carousel setup in a named init function`);
    assert.match(source, /initUgcPage\(\);/,
      `${relativePath} should initialize the carousel on first load`);
    assert.match(source, /document\.addEventListener\('astro:page-load', initUgcPage\);/,
      `${relativePath} should re-run carousel setup after Astro client navigation`);
  }
});

test('public contact pages rerun form setup on astro:page-load without duplicate submit handlers', async () => {
  const sources = await Promise.all(
    publicContactPages.map(async (relativePath) => [relativePath, await readFile(path.join(rootDir, relativePath), 'utf8')]),
  );

  for (const [relativePath, source] of sources) {
    assert.match(source, /import\s+\{\s*initContactForms\s*\}\s+from\s+['"].+contactForms\.js['"]/,
      `${relativePath} should use the shared contact form initializer`);
    assert.match(source, /const initContactPage = \(\) => initContactForms\(\);/,
      `${relativePath} should wrap form setup in a named init function`);
    assert.match(source, /initContactPage\(\);/,
      `${relativePath} should initialize the forms on first load`);
    assert.match(source, /document\.addEventListener\('astro:page-load', initContactPage\);/,
      `${relativePath} should re-run form setup after Astro client navigation`);
  }
});
