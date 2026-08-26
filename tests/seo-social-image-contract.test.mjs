import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const siteUrl = 'https://marttelier.netlify.app';
const blogSocialImage = `${siteUrl}/images/blog/mi-primer-post.webp`;

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

function getMetaContents(html, attributeName) {
  const escapedAttribute = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...html.matchAll(new RegExp(`<meta[^>]+(?:property|name)="${escapedAttribute}"[^>]+content="([^"]+)"[^>]*>`, 'g'))]
    .map((match) => match[1]);
}

function getPersonJsonLd(html) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];

  for (const [, rawJson] of scripts) {
    const parsed = JSON.parse(rawJson);
    if (parsed?.['@type'] === 'Person') return parsed;
  }

  return null;
}

test('SEO components expose a dedicated optional social image pipeline for blog articles', async () => {
  const [seoHeadSource, baseLayoutSource, blogArticleLayoutSource] = await Promise.all([
    readSource('src/components/SeoHead.astro'),
    readSource('src/layouts/BaseLayout.astro'),
    readSource('src/components/BlogArticleLayout.astro'),
  ]);

  assert.match(
    seoHeadSource,
    /image\?:\s*string;/,
    'SeoHead props should accept an optional image override',
  );
  assert.match(
    seoHeadSource,
    /const socialImage = absolute\(image \?\? siteData\.heroMainPhoto\);/,
    'SeoHead should resolve a dedicated social image with a portrait fallback',
  );
  assert.match(
    seoHeadSource,
    /const personImage = absolute\(siteData\.heroMainPhoto\);/,
    'SeoHead should keep the Person JSON-LD portrait separate from social metadata',
  );
  assert.match(
    baseLayoutSource,
    /image\?:\s*string;/,
    'BaseLayout props should accept an optional image override',
  );
  assert.match(
    baseLayoutSource,
    /const\s*\{[\s\S]*image,[\s\S]*\}\s*=\s*Astro\.props;/,
    'BaseLayout should read the optional image prop',
  );
  assert.match(
    baseLayoutSource,
    /<SeoHead[\s\S]*image=\{image\}/,
    'BaseLayout should forward the optional image prop to SeoHead',
  );
  assert.match(
    blogArticleLayoutSource,
    /<BaseLayout[\s\S]*image=\{post\.data\.image\}/,
    'BlogArticleLayout should pass the article image through to BaseLayout',
  );
});

test('built Spanish blog article uses its own social image exactly once while Person JSON-LD keeps the portrait', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built social images.');
    return;
  }

  const site = await readJson('src/data/site.json');
  const heroImage = `${siteUrl}${site.heroMainPhoto}`;
  const html = await readSource('dist/blog/mi-primer-post/index.html');
  const ogImages = getMetaContents(html, 'og:image');
  const twitterImages = getMetaContents(html, 'twitter:image');
  const personJsonLd = getPersonJsonLd(html);

  assert.deepEqual(
    ogImages,
    [blogSocialImage],
    'built Spanish blog article should advertise the blog asset as the sole og:image',
  );
  assert.deepEqual(
    twitterImages,
    [blogSocialImage],
    'built Spanish blog article should advertise the blog asset as the sole twitter:image',
  );
  assert.ok(personJsonLd, 'built Spanish blog article should include Person JSON-LD');
  assert.equal(
    personJsonLd.image,
    heroImage,
    'Person JSON-LD should keep the portrait instead of switching to the article image',
  );
});

test('built home and contact pages keep the portrait fallback social image without duplicate tags', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built social-image fallbacks.');
    return;
  }

  const site = await readJson('src/data/site.json');
  const heroImage = `${siteUrl}${site.heroMainPhoto}`;

  await Promise.all(['dist/index.html', 'dist/contact/index.html'].map(async (relativePath) => {
    const html = await readSource(relativePath);
    const ogImages = getMetaContents(html, 'og:image');
    const twitterImages = getMetaContents(html, 'twitter:image');

    assert.deepEqual(
      ogImages,
      [heroImage],
      `${relativePath} should keep the portrait as the sole og:image fallback`,
    );
    assert.deepEqual(
      twitterImages,
      [heroImage],
      `${relativePath} should keep the portrait as the sole twitter:image fallback`,
    );
  }));
});
