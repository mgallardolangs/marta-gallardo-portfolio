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
