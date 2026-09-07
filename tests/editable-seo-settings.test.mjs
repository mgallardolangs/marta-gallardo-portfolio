import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const productionSite = 'https://marttelier.com';

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

test('Astro SEO settings use the canonical production origin and keep admin routes out of the sitemap', async () => {
  const astroConfigSource = await readSource('astro.config.mjs');

  assert.match(
    astroConfigSource,
    /site:\s*'https:\/\/marttelier\.com'/,
    'Astro should publish canonical URLs from the production marttelier.com origin',
  );
  assert.match(
    astroConfigSource,
    /sitemap\(\{\s*filter:\s*\(page\)\s*=>\s*!page\.includes\('\/admin'\),\s*\}\)/s,
    'The sitemap integration should exclude every /admin route from crawlable XML output',
  );
});

test('robots.txt allows public crawling, blocks /admin, and advertises the production sitemap index', async () => {
  const robots = await readSource('public/robots.txt');

  assert.equal(
    robots,
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${productionSite}/sitemap-index.xml\n`,
  );
});
