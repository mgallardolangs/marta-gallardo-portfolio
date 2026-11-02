import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTranslationArsenalColumns } from '../src/lib/translationPage.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

test('Home sections follow hero, services, orbit, visibility, About and latest posts', async () => {
  const source = await readSource('src/views/HomePage.astro');
  const sectionOrder = [
    'data-home-hero',
    'id="home-services"',
    'data-home-orbit',
    'home.visibility.title',
    'home.about.title',
    'home.latestArticles.title',
  ];
  const positions = sectionOrder.map((marker) => source.indexOf(marker));

  assert.ok(positions.every((position) => position >= 0), 'all approved Home sections should be present');
  assert.deepEqual([...positions].sort((first, second) => first - second), positions, 'Home sections should be in approved order');
  assert.match(source, /home-hero__cta--primary[\s\S]*i\.home\.hero\.ctaDiagnosis/);
  assert.match(source, /href="#home-services"[\s\S]*i\.home\.hero\.ctaServices/);
  assert.match(source, /<h3 class="font-heading text-2xl font-normal/);
  assert.doesNotMatch(source, /brandVideoEmbedUrl|instagramScreenshot/);
});

test('About keeps the personal video in a click-to-load facade and reuses the trajectory tabs', async () => {
  const [aboutSource, videoSource] = await Promise.all([
    readSource('src/views/AboutPage.astro'),
    readSource('src/components/ClickToLoadYouTube.astro'),
  ]);

  assert.match(aboutSource, /<ClickToLoadYouTube/);
  assert.match(aboutSource, /<ExperienceTabs/);
  assert.match(aboutSource, /i\.translationPage\.experience\.cards/);
  assert.doesNotMatch(aboutSource, /instagramScreenshot|instagram-thumb/);
  assert.match(videoSource, /data-click-to-load-youtube/);
  assert.match(videoSource, /button\.replaceWith\(iframe\)/);
  assert.doesNotMatch(videoSource, /<iframe[^>]+src=/);
});

test('public Translation page contains translation skills only while SEO skills stay on SEO page', async () => {
  const [site, translationSource, seoSource, arsenalHelperSource] = await Promise.all([
    readJson('src/data/site.json'),
    readSource('src/views/TranslationServicePage.astro'),
    readSource('src/views/SeoServicePage.astro'),
    readSource('src/lib/translationPage.js'),
  ]);

  const translationArsenal = getTranslationArsenalColumns('es', site, 'translation');
  const seoArsenal = getTranslationArsenalColumns('es', site, 'seo');

  assert.ok(translationArsenal.skills.length > 0);
  assert.ok(translationArsenal.skills.every((skill) => skill.group === 'translation'));
  assert.deepEqual(
    translationArsenal.tools.map((tool) => tool.id).sort(),
    ['ai-tools', 'google-workspace', 'microsoft-office', 'notion', 'tool-claude'].sort(),
  );
  assert.ok(seoArsenal.skills.length > 0);
  assert.ok(seoArsenal.skills.every((skill) => skill.group === 'seo'));
  assert.deepEqual(
    seoArsenal.tools.map((tool) => tool.id).sort(),
    ['google-business-profile', 'google-search-console', 'wordpress'].sort(),
  );
  assert.match(translationSource, /getTranslationArsenalColumns\(lang,\s*siteData,\s*'translation'\)/);
  assert.match(translationSource, /arsenal\.skills\.map/);
  assert.doesNotMatch(translationSource, /skillGroups\.seo|SEO Local|Keyword planner/);
  assert.match(seoSource, /getTranslationArsenalColumns\(lang,\s*siteData,\s*'seo'\)/);
  assert.match(seoSource, /arsenal\.skills\.map/);
  assert.match(seoSource, /SEO_RESERVED_TOOL_LABELS\.map/);
  assert.match(arsenalHelperSource, /SEO_RESERVED_TOOL_LABELS\s*=\s*\['Ahrefs',\s*'SEMrush',\s*'Screaming Frog'\]/);
});

test('UGC page retains the contact sheet and adds the four-step approved process', async () => {
  const [pageSource, site] = await Promise.all([
    readSource('src/views/UgcPage.astro'),
    readJson('src/data/site.json'),
  ]);

  assert.equal(site.ugcPortfolio.length, 12);
  assert.match(pageSource, /<UgcContactSheet/);
  assert.match(pageSource, /ugcPage\.benefits\.title/);
  assert.match(pageSource, /ugcPage\.process\.steps\.map/);
});

test('localized Blog article keeps its visible link labels and points only to current canonical pages', async () => {
  const expectedLinks = {
    es: ['/sobre-mi', '/contacto'],
    en: ['/en/about', '/en/contact'],
    fr: ['/fr/a-propos', '/fr/contact'],
    de: ['/sobre-mi', '/contacto'],
    it: ['/sobre-mi', '/contacto'],
    ca: ['/sobre-mi', '/contacto'],
  };
  const expectedLabels = {
    es: ['portfolio', 'contactarme'],
    en: ['portfolio', 'get in touch'],
    fr: ['portfolio', 'contacter'],
    de: ['portfolio', 'contactarme'],
    it: ['portfolio', 'contactarme'],
    ca: ['portfolio', 'contactarme'],
  };

  for (const locale of Object.keys(expectedLinks)) {
    const source = await readSource(`src/content/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones/${locale}.md`);
    const links = [...source.matchAll(/\[([^\]]+)\]\(https:\/\/marttelier\.com([^)]*)\)/g)];

    assert.deepEqual(links.map((match) => match[1]), expectedLabels[locale], `${locale} link labels should stay unchanged`);
    assert.deepEqual(links.map((match) => match[2]), expectedLinks[locale], `${locale} internal hrefs should use current no-slash routes`);
  }
});
