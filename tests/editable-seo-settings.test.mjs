import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPageSeo, resolveSeoText, seoPageKeys } from '../src/lib/siteData.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const productionSite = 'https://marttelier.com';

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
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

test('SEO resolver prefers requested locale text, then Spanish, then explicit fallback', () => {
  assert.equal(
    resolveSeoText(
      { en: '  English title  ', es: '  Título español  ' },
      'en',
      '  Fallback title  ',
    ),
    'English title',
  );
  assert.equal(
    resolveSeoText(
      { en: '   ', es: '  Título español  ' },
      'fr',
      '  Fallback title  ',
    ),
    'Título español',
  );
  assert.equal(resolveSeoText(undefined, 'fr', '  Fallback title  '), 'Fallback title');
});

test('SEO helpers normalize whitespace and always return strings for page metadata', () => {
  assert.equal(
    resolveSeoText(
      { en: '\n  Multilingual\tSEO \n title  ', es: '  Título español  ' },
      'en',
      '  Fallback title  ',
    ),
    'Multilingual SEO title',
  );
  assert.equal(resolveSeoText({ en: ' \n ', es: '\t ' }, 'en', '  Contact  \n fallback '), 'Contact fallback');

  const resolved = getPageSeo(
    {
      seo: {
        home: {
          title: { fr: '  Page   title  ' },
          description: { it: '   ' },
        },
      },
    },
    'home',
    'fr',
    {
      title: { fr: '  Home fallback  ' },
      description: { es: '  Descripción \n fallback  ' },
    },
  );

  assert.deepEqual(resolved, {
    title: 'Page title',
    description: 'Descripción fallback',
  });
  assert.equal(typeof resolved.title, 'string');
  assert.equal(typeof resolved.description, 'string');
});

test('SEO page fallback maps prefer requested locale, then Spanish, then empty strings', () => {
  assert.deepEqual(getPageSeo(undefined, 'contact', 'en', {
    title: { en: '  English fallback title  ', es: '  Título español  ' },
    description: { es: '  Descripción fallback  ' },
  }), {
    title: 'English fallback title',
    description: 'Descripción fallback',
  });

  assert.deepEqual(getPageSeo(undefined, 'contact', 'fr', {
    title: { en: '  English only title  ' },
    description: { en: '  English only description  ' },
  }), {
    title: '',
    description: '',
  });
});

test('SEO site data exposes only the four editable page groups and keeps the runtime contract optional', async () => {
  const site = await readJson('src/data/site.json');
  const source = await readSource('src/lib/siteData.ts');

  assert.deepEqual(seoPageKeys, ['home', 'translationSeo', 'ugc', 'contact']);
  assert.deepEqual(Object.keys(site.seo).sort(), [...seoPageKeys].sort());

  for (const page of seoPageKeys) {
    assert.equal(typeof site.seo[page].title.es, 'string', `${page} should seed a Spanish title`);
    assert.notEqual(site.seo[page].title.es.trim(), '', `${page} Spanish title should stay nonblank`);
    assert.equal(typeof site.seo[page].description.es, 'string', `${page} should seed a Spanish description`);
    assert.notEqual(site.seo[page].description.es.trim(), '', `${page} Spanish description should stay nonblank`);
  }

  assert.match(source, /seo\?: Partial<Record<SeoPageKey, SeoPageValue>>;/);
  assert.match(source, /export type ResolvedSeoPageValue = \{\s*title: string;\s*description: string;\s*\};/s);
});

test('public page views resolve editable SEO with exact page keys and localized BaseLayout fallbacks', async () => {
  const [homeSource, translationSource, ugcSource, contactSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/views/TranslationSeoPage.astro'),
    readSource('src/views/UgcPage.astro'),
    readSource('src/views/ContactPage.astro'),
  ]);

  assert.match(
    homeSource,
    /import\s+\{\s*getPageSeo,\s*siteData\s*\}\s+from\s+['"]\.\.\/lib\/siteData['"];?/,
    'HomePage should import getPageSeo alongside siteData',
  );
  assert.match(
    homeSource,
    /const pageTitle = `\$\{i\.hero\.name\} — \$\{i\.home\.hero\.kicker\}`;\s*const pageDescription = i\.home\.hero\.description;\s*const pageSeo = getPageSeo\(siteData,\s*'home',\s*lang,\s*\{\s*title:\s*\{\s*\[lang\]:\s*pageTitle\s*\},\s*description:\s*\{\s*\[lang\]:\s*pageDescription\s*\},\s*\}\);/s,
    'HomePage should resolve editable SEO with the exact home key and preserve its existing localized fallbacks',
  );
  assert.match(
    homeSource,
    /<BaseLayout\s+title=\{pageSeo\.title\}\s+description=\{pageSeo\.description\}>/,
    'HomePage should pass resolved pageSeo strings into BaseLayout',
  );

  assert.match(
    translationSource,
    /import\s+\{\s*getPageSeo,\s*siteData\s*\}\s+from\s+['"]\.\.\/lib\/siteData['"];?/,
    'TranslationSeoPage should import getPageSeo alongside siteData',
  );
  assert.match(
    translationSource,
    /const pageTitle = `\$\{i\.hero\.name\} — \$\{i\.nav\.translationSeo\}`;\s*const pageDescription = page\.hero\.text\.replaceAll\('\\n', ' '\)\.replace\(\/\\s\+\/g, ' '\)\.trim\(\);\s*const pageSeo = getPageSeo\(siteData,\s*'translationSeo',\s*lang,\s*\{\s*title:\s*\{\s*\[lang\]:\s*pageTitle\s*\},\s*description:\s*\{\s*\[lang\]:\s*pageDescription\s*\},\s*\}\);/s,
    'TranslationSeoPage should resolve editable SEO with the exact translationSeo key and keep the normalized localized fallback copy',
  );
  assert.match(
    translationSource,
    /<BaseLayout\s+title=\{pageSeo\.title\}\s+description=\{pageSeo\.description\}>/,
    'TranslationSeoPage should pass resolved pageSeo strings into BaseLayout',
  );

  assert.match(
    ugcSource,
    /import\s+\{\s*getPageSeo,\s*siteData\s*\}\s+from\s+['"]\.\.\/lib\/siteData['"];?/,
    'UgcPage should import getPageSeo alongside siteData',
  );
  assert.match(
    ugcSource,
    /const pageTitle = `\$\{i\.hero\.name\} \| \$\{i\.ugc\.title\}`;\s*const pageDescription = i\.ugcPage\.pageDescription;\s*const pageSeo = getPageSeo\(siteData,\s*'ugc',\s*lang,\s*\{\s*title:\s*\{\s*\[lang\]:\s*pageTitle\s*\},\s*description:\s*\{\s*\[lang\]:\s*pageDescription\s*\},\s*\}\);/s,
    'UgcPage should resolve editable SEO with the exact ugc key and preserve its existing localized fallbacks',
  );
  assert.match(
    ugcSource,
    /<BaseLayout\s+title=\{pageSeo\.title\}\s+description=\{pageSeo\.description\}>/,
    'UgcPage should pass resolved pageSeo strings into BaseLayout',
  );

  assert.match(
    contactSource,
    /import\s+\{\s*getPageSeo,\s*siteData\s*\}\s+from\s+['"]\.\.\/lib\/siteData['"];?/,
    'ContactPage should import getPageSeo alongside siteData',
  );
  assert.match(
    contactSource,
    /const pageTitle = `\$\{i\.contact\.title\} — \$\{i\.hero\.name\}`;\s*const pageDescription = i\.contact\.subtitle;\s*const pageSeo = getPageSeo\(siteData,\s*'contact',\s*lang,\s*\{\s*title:\s*\{\s*\[lang\]:\s*pageTitle\s*\},\s*description:\s*\{\s*\[lang\]:\s*pageDescription\s*\},\s*\}\);/s,
    'ContactPage should resolve editable SEO with the exact contact key and preserve its existing localized fallbacks',
  );
  assert.match(
    contactSource,
    /<BaseLayout\s+title=\{pageSeo\.title\}\s+description=\{pageSeo\.description\}>/,
    'ContactPage should pass resolved pageSeo strings into BaseLayout',
  );
});

test('blog article frontend keeps frontmatter metadata and does not opt into editable page SEO', async () => {
  const [blogRouteSource, blogArticleLayoutSource] = await Promise.all([
    readSource('src/pages/blog/[slug].astro'),
    readSource('src/components/BlogArticleLayout.astro'),
  ]);

  assert.doesNotMatch(
    blogRouteSource,
    /getPageSeo/,
    'Blog article routes should not import or call getPageSeo',
  );
  assert.doesNotMatch(
    blogArticleLayoutSource,
    /getPageSeo/,
    'BlogArticleLayout should not import or call getPageSeo',
  );
  assert.match(
    blogArticleLayoutSource,
    /<BaseLayout[\s\S]*title=\{`\$\{post\.data\.title\} — \$\{i\.hero\.name\}`\}[\s\S]*description=\{post\.data\.description\}[\s\S]*image=\{post\.data\.image\}/,
    'BlogArticleLayout should keep title, description, and image sourced from post frontmatter fields',
  );
  assert.match(
    blogRouteSource,
    /<BlogArticleLayout post=\{post\} posts=\{posts\} headings=\{headings\} alternateLinks=\{blogAlternateLinks\}>/,
    'Blog article routes should continue passing the post through to BlogArticleLayout unchanged',
  );
});
