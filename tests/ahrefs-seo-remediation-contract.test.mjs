import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const articleSlug = 'de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones';
const homeRoutes = {
  es: 'src/pages/index.astro',
  en: 'src/pages/en/index.astro',
  fr: 'src/pages/fr/index.astro',
  de: 'src/pages/de/index.astro',
  it: 'src/pages/it/index.astro',
  ca: 'src/pages/ca/index.astro',
};

test('every localized homepage passes its locale explicitly to HomePage', async () => {
  for (const [locale, relativePath] of Object.entries(homeRoutes)) {
    const source = await readFile(path.join(rootDir, relativePath), 'utf8');
    assert.match(
      source,
      new RegExp(`<HomePage\\s+lang="${locale}"\\s*/>`),
      `${relativePath} should pass lang="${locale}" to HomePage`,
    );
  }
});

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
}

function readFrontmatterValue(source, key) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(frontmatter, 'article should have YAML frontmatter');
  const value = frontmatter[1].match(new RegExp(`^${key}:\\s*"(.*)"$`, 'm'));
  assert.ok(value, `article frontmatter should define ${key}`);
  return value[1];
}

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

test('blog index metadata descriptions are localized and concise', async () => {
  const dictionaries = await Promise.all(locales.map((locale) => readJson(`src/i18n/${locale}.json`)));
  const spanishDescription = dictionaries[0].blog.metaDescription;

  for (const [index, dictionary] of dictionaries.entries()) {
    const description = dictionary.blog.metaDescription;
    assert.ok(description?.trim(), `${locales[index]} blog needs a dedicated meta description`);
    assert.ok(description.length <= 155, `${locales[index]} blog meta description must be at most 155 characters`);
    if (index > 0) {
      assert.notEqual(description, spanishDescription, `${locales[index]} blog description should be localized`);
    }
  }

  const source = await readFile(path.join(rootDir, 'src/views/BlogIndexPage.astro'), 'utf8');
  assert.match(source, /<BaseLayout[^>]*description=\{i\.blog\.metaDescription\}/);
});

test('Ahrefs-flagged page descriptions and titles stay concise', async () => {
  const site = await readJson('src/data/site.json');
  for (const title of Object.values(site.seo.home.title)) {
    assert.ok(title.length <= 60, `homepage SEO title is ${title.length} characters`);
  }
  for (const description of Object.values(site.seo.home.description)) {
    assert.ok(description.length <= 155, `homepage meta description is ${description.length} characters`);
  }

  const shortDescriptions = [
    site.seo.about.description.de,
    site.seo.translation.description.fr,
    site.seo.ugc.description.de,
    site.seo.ugc.description.fr,
  ];

  for (const description of shortDescriptions) {
    assert.ok(description.length <= 155, `meta description is ${description.length} characters`);
  }

  assert.ok(site.seo.translation.title.de.length <= 60, 'German translation title should be at most 60 characters');

  for (const locale of locales) {
    const source = await readFile(
      path.join(rootDir, 'src/content/blog', articleSlug, `${locale}.md`),
      'utf8',
    );
    const title = `${readFrontmatterValue(source, 'title')} — ${(await readJson(`src/i18n/${locale}.json`)).hero.name}`;
    assert.ok(title.length <= 60, `${locale} article title is ${title.length} characters`);

    if (locale === 'en' || locale === 'fr') {
      const description = readFrontmatterValue(source, 'description');
      assert.ok(description.length <= 155, `${locale} article description is ${description.length} characters`);
    }
  }
});

test('CHECK_DIST: localized homepages render their locale and copy in the generated HTML', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify generated homepage HTML.');
    return;
  }

  const site = await readJson('src/data/site.json');
  for (const locale of locales) {
    const relativePath = locale === 'es' ? 'dist/index.html' : `dist/${locale}.html`;
    const html = await readFile(path.join(rootDir, relativePath), 'utf8');
    const dictionary = await readJson(`src/i18n/${locale}.json`);
    const titleMatch = html.match(/<title>(.*?)<\/title>/s);
    const descriptionMatch = html.match(/<meta name="description" content="([^"]*)"/);
    assert.match(html, new RegExp(`<html lang="${locale}">`), `${relativePath} should declare its language`);
    assert.ok(titleMatch, `${relativePath} should have a title`);
    assert.ok(descriptionMatch, `${relativePath} should have a meta description`);
    const decodedHtml = decodeHtml(html);
    assert.ok(decodedHtml.includes(dictionary.home.hero.title), `${relativePath} should render the localized hero title`);
    assert.ok(decodeHtml(titleMatch[1]).includes(site.seo.home.title[locale]), `${relativePath} should use the localized SEO title`);
    assert.ok(
      decodeHtml(descriptionMatch[1]).includes(site.seo.home.description[locale]),
      `${relativePath} should use the localized SEO description`,
    );
  }
});

test('CHECK_DIST: targeted SEO titles and descriptions render the concise source copy', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify generated SEO metadata.');
    return;
  }

  const site = await readJson('src/data/site.json');
  const expectedPages = [];

  for (const locale of locales) {
    const dictionary = await readJson(`src/i18n/${locale}.json`);
    const blogPath = locale === 'es' ? 'dist/blog.html' : `dist/${locale}/blog.html`;
    expectedPages.push({
      path: blogPath,
      title: `${dictionary.blog.title} — ${dictionary.hero.name}`,
      description: dictionary.blog.metaDescription,
    });
  }

  expectedPages.push(
    {
      path: 'dist/de/ueber-mich.html',
      title: site.seo.about.title.de,
      description: site.seo.about.description.de,
    },
    {
      path: 'dist/fr/services/traduction.html',
      title: site.seo.translation.title.fr,
      description: site.seo.translation.description.fr,
    },
    {
      path: 'dist/de/dienstleistungen/uebersetzung.html',
      title: site.seo.translation.title.de,
      description: site.seo.translation.description.de,
      maxTitleLength: 60,
    },
    {
      path: 'dist/servicios/ugc.html',
      title: site.seo.ugc.title.es,
      description: site.seo.ugc.description.es,
    },
    {
      path: 'dist/de/dienstleistungen/ugc.html',
      title: site.seo.ugc.title.de,
      description: site.seo.ugc.description.de,
    },
    {
      path: 'dist/fr/services/ugc.html',
      title: site.seo.ugc.title.fr,
      description: site.seo.ugc.description.fr,
    },
    {
      path: 'dist/ca/serveis/ugc.html',
      title: site.seo.ugc.title.ca,
      description: site.seo.ugc.description.ca,
    },
  );

  for (const locale of locales) {
    const source = await readFile(
      path.join(rootDir, 'src/content/blog', articleSlug, `${locale}.md`),
      'utf8',
    );
    const dictionary = await readJson(`src/i18n/${locale}.json`);
    expectedPages.push({
      path: locale === 'es'
        ? `dist/blog/${articleSlug}.html`
        : `dist/${locale}/blog/${articleSlug}.html`,
      title: `${readFrontmatterValue(source, 'title')} — ${dictionary.hero.name}`,
      description: readFrontmatterValue(source, 'description'),
      maxTitleLength: 60,
    });
  }

  for (const expected of expectedPages) {
    const html = await readFile(path.join(rootDir, expected.path), 'utf8');
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    assert.ok(title, `${expected.path} should have a title`);
    assert.ok(description, `${expected.path} should have a meta description`);
    assert.equal(decodeHtml(title), expected.title, `${expected.path} should use the expected title`);
    assert.equal(
      decodeHtml(description),
      expected.description,
      `${expected.path} should use the expected meta description`,
    );
    if (expected.maxTitleLength) {
      assert.ok(decodeHtml(title).length <= expected.maxTitleLength, `${expected.path} title should be concise`);
    }
    assert.ok(decodeHtml(description).length <= 155, `${expected.path} description should be at most 155 characters`);
  }
});
