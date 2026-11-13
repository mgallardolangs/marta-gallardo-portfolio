import test from 'node:test';
import assert from 'node:assert/strict';

import trailingSlash, { config } from '../netlify/edge-functions/trailing-slash.js';

const run = (path) => trailingSlash(new Request(`https://marttelier.com${path}`));

test('trailing-slash edge function 301-redirects slashed paths to the canonical no-slash URL', async () => {
  for (const [from, to] of [
    ['/fr/', '/fr'],
    ['/fr/contact/', '/fr/contact'],
    ['/servicios/seo/', '/servicios/seo'],
    ['/en/blog/', '/en/blog'],
    ['/de/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones/', '/de/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones'],
    ['/fr//', '/fr'],
    ['/en/blog/?page=2', '/en/blog?page=2'],
  ]) {
    const response = await run(from);
    assert.ok(response, `${from} should redirect`);
    assert.equal(response.status, 301, `${from} should be a permanent redirect`);
    assert.equal(response.headers.get('location'), `https://marttelier.com${to}`);
  }
});

test('trailing-slash edge function leaves the root and canonical paths untouched', async () => {
  for (const path of ['/', '/fr', '/fr/contact', '/servicios/seo', '/admin']) {
    assert.equal(await run(path), undefined, `${path} should pass through`);
  }
});

test('trailing-slash edge function runs on pages but skips static assets', () => {
  assert.equal(config.path, '/*');
  for (const excluded of ['/_astro/*', '/images/*', '/favicon.svg', '/robots.txt']) {
    assert.ok(config.excludedPath.includes(excluded), `${excluded} should be excluded`);
  }
});
