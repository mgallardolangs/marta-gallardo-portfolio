import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readProjectFile(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

test('Astro builds canonical no-trailing-slash routes without changing locale routing', async () => {
  const config = await readProjectFile('astro.config.mjs');

  assert.match(config, /trailingSlash:\s*['"]never['"]/);
  assert.match(config, /format:\s*['"]file['"]/);
  assert.match(config, /defaultLocale:\s*['"]es['"]/);
  assert.match(config, /locales:\s*\[\s*['"]es['"],\s*['"]en['"],\s*['"]fr['"],\s*['"]de['"],\s*['"]it['"],\s*['"]ca['"]\s*\]/);
  assert.match(config, /prefixDefaultLocale:\s*false/);
});

test('Netlify serves unknown paths as 404s and retains only the approved www redirect', async () => {
  const config = await readProjectFile('netlify.toml');
  const redirectRules = config.match(/\[\[redirects\]\][\s\S]*?(?=\n\[\[|\n\[headers\]|\s*$)/g) ?? [];

  assert.equal(redirectRules.length, 1, 'only the www host redirect should be configured');
  assert.match(redirectRules[0], /from\s*=\s*"https:\/\/www\.marttelier\.com\/\*"/);
  assert.match(redirectRules[0], /to\s*=\s*"https:\/\/marttelier\.com\/:splat"/);
  assert.match(redirectRules[0], /status\s*=\s*301/);
  assert.match(config, /\[build\.processing\.html\]\s*pretty_urls\s*=\s*false/);
  assert.doesNotMatch(redirectRules[0], /conditions\s*=/);
  assert.doesNotMatch(config, /status\s*=\s*200/);
  assert.doesNotMatch(config, /to\s*=\s*"\/index\.html"/);
});

test('Netlify Identity loads only in admin and email tokens return to the canonical admin route', async () => {
  const layout = await readProjectFile('src/layouts/BaseLayout.astro');
  const adminLayout = await readProjectFile('src/layouts/AdminLayout.astro');

  assert.doesNotMatch(layout, /identity\.netlify\.com/);
  assert.match(adminLayout, /identity\.netlify\.com\/v1\/netlify-identity-widget\.js/);
  assert.match(layout, /\(invite\|recovery\|confirmation\|email_change\)_token=/);
  assert.match(layout, /location\.replace\("\/admin" \+ location\.hash\)/);
  assert.doesNotMatch(layout, /"\/admin\/"/);
});

test('Netlify security headers retain HSTS and framing protection while CSP stays report-only', async () => {
  const config = await readProjectFile('netlify.toml');

  assert.match(config, /Strict-Transport-Security\s*=\s*"max-age=31536000"/);
  assert.match(config, /X-Frame-Options\s*=\s*"DENY"/);
  assert.match(config, /Content-Security-Policy-Report-Only\s*=/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.doesNotMatch(config, /^\s*Content-Security-Policy\s*=/m);
  assert.doesNotMatch(config, /^\s*Cross-Origin-Opener-Policy\s*=/m);
});

test('custom 404 page is noindex, Spanish, and links back to the default root', async () => {
  const page = await readProjectFile('src/pages/404.astro');

  assert.match(page, /<html lang="es">/);
  assert.match(page, /name="robots"\s+content="noindex, nofollow"/);
  assert.match(page, /Error 404/);
  assert.match(page, /href="\/"/);
  assert.match(page, /Volver al inicio/);
});

test('robots.txt keeps the admin private and points crawlers to the sitemap', async () => {
  const robots = await readProjectFile('public/robots.txt');

  assert.match(robots, /^User-agent:\s+\*/m);
  assert.match(robots, /^Disallow:\s+\/admin\s*$/m);
  assert.match(robots, /^Sitemap:\s+https:\/\/marttelier\.com\/sitemap-index\.xml\s*$/m);
});
