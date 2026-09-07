import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdminStore, SUPPORTED_LANGS } from '../src/components/admin/adminStore.ts';
import { getPageSeo, resolveSeoText, seoPageKeys } from '../src/lib/siteData.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const productionSite = 'https://marttelier.com';

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readBuiltSource(relativePath) {
  try {
    return await readSource(relativePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      assert.fail(`Missing built artifact "${relativePath}". Run npm run build before CHECK_DIST=1 verification.`);
    }

    throw error;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

function getLinkHrefs(html, relName) {
  const escapedRel = relName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...html.matchAll(new RegExp(`<link[^>]+rel="${escapedRel}"[^>]+href="([^"]+)"[^>]*>`, 'g'))]
    .map((match) => match[1]);
}

function getMetaContents(html, attributeName) {
  const escapedAttribute = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...html.matchAll(new RegExp(`<meta[^>]+(?:property|name)="${escapedAttribute}"[^>]+content="([^"]+)"[^>]*>`, 'g'))]
    .map((match) => match[1]);
}

function getXmlLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function findGeneratedSitemapPaths() {
  const sitemapIndexPath = 'dist/sitemap-index.xml';
  const sitemapIndex = await readBuiltSource(sitemapIndexPath);
  const sitemapMatches = getXmlLocs(sitemapIndex)
    .map((url) => new URL(url))
    .filter((url) => url.pathname !== '/sitemap-index.xml')
    .map((url) => `dist/${path.basename(url.pathname)}`);

  if (sitemapMatches.length > 0) {
    return [...new Set(sitemapMatches)];
  }

  const distEntries = await readdir(path.join(rootDir, 'dist')).catch((error) => {
    if (error?.code === 'ENOENT') {
      assert.fail('Missing built dist directory. Run npm run build before CHECK_DIST=1 verification.');
    }

    throw error;
  });
  const fallbackSitemap = distEntries
    .filter((entry) => /^sitemap(?:-\d+)?\.xml$/.test(entry))
    .sort()[0];

  assert.ok(
    fallbackSitemap,
    'Expected Astro to emit a sitemap XML file such as sitemap.xml or sitemap-0.xml.',
  );

  return [`dist/${fallbackSitemap}`];
}

function createAdminI18n() {
  return {
    es: {},
    en: {},
    fr: {},
  };
}

function installWindow(mockWindow) {
  const previousWindow = globalThis.window;
  globalThis.window = mockWindow;
  return () => {
    if (previousWindow === undefined) {
      delete globalThis.window;
      return;
    }
    globalThis.window = previousWindow;
  };
}

function createSeoLocales(seed) {
  return {
    es: `${seed} ES`,
    en: `${seed} EN`,
    fr: `${seed} FR`,
    de: `${seed} DE`,
    it: `${seed} IT`,
    ca: `${seed} CA`,
  };
}

function createAdminSiteData(overrides = {}) {
  return {
    publicLanguagePicker: ['es', 'en', 'fr'],
    arsenal: {
      languages: [],
      tools: [],
      skills: [],
    },
    seo: {
      home: {
        title: createSeoLocales('Home title'),
        description: createSeoLocales('Home description'),
      },
      translationSeo: {
        title: createSeoLocales('Translation title'),
        description: createSeoLocales('Translation description'),
      },
      ugc: {
        title: createSeoLocales('UGC title'),
        description: createSeoLocales('UGC description'),
      },
      contact: {
        title: createSeoLocales('Contact title'),
        description: createSeoLocales('Contact description'),
      },
    },
    ...overrides,
  };
}

function decodePublishedJsonBody(body) {
  const payload = JSON.parse(String(body));
  return JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
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

test('built public SEO output uses marttelier.com canonicals, alternates, sitemap, and robots metadata', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built SEO output.');
    return;
  }

  const sitemapPaths = await findGeneratedSitemapPaths();
  const [homeHtml, contactHtml, translationHtml, ugcHtml, robots, sitemapIndex, ...sitemaps] = await Promise.all([
    readBuiltSource('dist/index.html'),
    readBuiltSource('dist/contact/index.html'),
    readBuiltSource('dist/translation-seo/index.html'),
    readBuiltSource('dist/ugc/index.html'),
    readBuiltSource('dist/robots.txt'),
    readBuiltSource('dist/sitemap-index.xml'),
    ...sitemapPaths.map((sitemapPath) => readBuiltSource(sitemapPath)),
  ]);

  assert.deepEqual(getLinkHrefs(homeHtml, 'canonical'), [`${productionSite}/`]);

  for (const [relativePath, html] of [
    ['dist/index.html', homeHtml],
    ['dist/contact/index.html', contactHtml],
    ['dist/translation-seo/index.html', translationHtml],
    ['dist/ugc/index.html', ugcHtml],
  ]) {
    const canonicalLinks = getLinkHrefs(html, 'canonical');
    const alternateLinks = getLinkHrefs(html, 'alternate');
    const ogUrls = getMetaContents(html, 'og:url');
    const ogImages = getMetaContents(html, 'og:image');
    const twitterImages = getMetaContents(html, 'twitter:image');

    assert.equal(canonicalLinks.length, 1, `${relativePath} should emit exactly one canonical link`);
    assert.ok(
      canonicalLinks[0].startsWith(`${productionSite}/`),
      `${relativePath} canonical should use the marttelier.com origin`,
    );
    assert.ok(alternateLinks.length > 0, `${relativePath} should emit alternate links`);
    assert.ok(
      alternateLinks.every((href) => href.startsWith(`${productionSite}/`)),
      `${relativePath} alternates should use the marttelier.com origin`,
    );
    assert.deepEqual(
      ogUrls,
      canonicalLinks,
      `${relativePath} og:url should match the canonical marttelier.com URL`,
    );
    assert.equal(ogImages.length, 1, `${relativePath} should emit exactly one og:image`);
    assert.equal(twitterImages.length, 1, `${relativePath} should emit exactly one twitter:image`);
    assert.equal(
      new URL(ogImages[0]).origin,
      productionSite,
      `${relativePath} og:image should use the marttelier.com origin`,
    );
    assert.equal(
      new URL(twitterImages[0]).origin,
      productionSite,
      `${relativePath} twitter:image should use the marttelier.com origin`,
    );
  }

  assert.equal(
    robots,
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${productionSite}/sitemap-index.xml\n`,
    'built robots.txt should advertise the canonical production sitemap index',
  );
  const sitemapIndexLocs = getXmlLocs(sitemapIndex);
  const childSitemapLocs = sitemaps.flatMap((sitemap) => getXmlLocs(sitemap));

  assert.ok(sitemapIndexLocs.length > 0, 'sitemap index should point at at least one child sitemap payload');
  assert.ok(childSitemapLocs.length > 0, 'generated child sitemap payloads should contain crawlable URLs');

  for (const loc of [...sitemapIndexLocs, ...childSitemapLocs]) {
    const parsed = new URL(loc);

    assert.equal(
      parsed.origin,
      productionSite,
      `sitemap loc ${loc} should use the canonical marttelier.com origin`,
    );
    assert.ok(
      !parsed.pathname.split('/').filter(Boolean).includes('admin'),
      `sitemap loc ${loc} should not include an /admin segment`,
    );
  }
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

test('admin SEO editor exposes the shared store API, exact page keys, and six-locale title and description controls', async () => {
  const [editorSource, hookSource, adminIndexSource] = await Promise.all([
    readSource('src/components/admin/EditableSeoSettings.tsx'),
    readSource('src/components/admin/useAdminStore.ts'),
    readSource('src/pages/admin/index.astro'),
  ]);

  assert.deepEqual(SUPPORTED_LANGS, ['es', 'en', 'fr', 'de', 'it', 'ca']);
  assert.match(editorSource, /const SEO_PAGE_KEYS = \['home', 'translationSeo', 'ugc', 'contact'\] as const;/);
  assert.match(editorSource, /SEO_PAGE_KEYS\.map\(\(page\) => \(/);
  assert.match(editorSource, /<fieldset key=\{page\}/);
  assert.match(editorSource, /SUPPORTED_LANGS\.map\(\(locale\) => \(/);
  assert.match(editorSource, /store\.setSeoText\(page,\s*field,\s*locale,\s*event\.target\.value\)/);
  assert.match(editorSource, /onBlur=\{\(\)\s*=>\s*store\.normalizeSeoText\(page,\s*field,\s*locale\)\}/);
  assert.match(editorSource, /field === 'title' \? \(/);
  assert.match(editorSource, /useAdminStore\(\)/);
  assert.match(hookSource, /getSeoText:\s*adminStore\.getSeoText\.bind\(adminStore\)/);
  assert.match(hookSource, /setSeoText:\s*adminStore\.setSeoText\.bind\(adminStore\)/);
  assert.match(hookSource, /normalizeSeoText:\s*adminStore\.normalizeSeoText\.bind\(adminStore\)/);
  assert.match(adminIndexSource, /import EditableSeoSettings from '\.\.\/\.\.\/components\/admin\/EditableSeoSettings';/);
  assert.match(adminIndexSource, /<EditableSeoSettings client:load \/>/);
});

test('AdminStore preserves raw SEO text while typing, normalizes on blur, and rejects invalid page field locale and value writes', () => {
  const store = new AdminStore();
  store.init(createAdminI18n(), createAdminSiteData(), 'es', '');

  store.setSeoText('home', 'title', 'es', 'SEO');
  store.setSeoText('home', 'title', 'es', 'SEO ');
  store.setSeoText('home', 'title', 'es', '  SEO title  ');
  store.setSeoText('home', 'description', 'de', '   ');

  assert.equal(store.getSeoText('home', 'title', 'es'), '  SEO title  ');
  assert.equal(store.getSeoText('home', 'description', 'de'), '   ');

  store.normalizeSeoText('home', 'title', 'es');
  store.normalizeSeoText('home', 'description', 'de');

  assert.equal(store.getSeoText('home', 'title', 'es'), 'SEO title');
  assert.equal(store.getSeoText('home', 'description', 'de'), '');
  assert.equal(store.getSnapshot().isDirty, true);

  const pendingCountAfterValidWrites = store.getSnapshot().pendingCount;

  assert.throws(() => store.getSeoText('landing', 'title', 'es'), /Página SEO no válida/);
  assert.throws(() => store.setSeoText('landing', 'title', 'es', 'Hola'), /Página SEO no válida/);
  assert.throws(() => store.setSeoText('home', 'summary', 'es', 'Hola'), /Campo SEO no válido/);
  assert.throws(() => store.setSeoText('home', 'title', 'pt', 'Olá'), /Idioma SEO no válido/);
  assert.throws(() => store.setSeoText('home', 'title', 'es', 42), /El valor SEO debe ser un texto/);
  assert.throws(() => store.normalizeSeoText('landing', 'title', 'es'), /Página SEO no válida/);
  assert.throws(() => store.normalizeSeoText('home', 'summary', 'es'), /Campo SEO no válido/);
  assert.throws(() => store.normalizeSeoText('home', 'title', 'pt'), /Idioma SEO no válido/);

  assert.equal(store.getSnapshot().pendingCount, pendingCountAfterValidWrites);
  assert.equal(store.images?.seo?.landing, undefined);
  assert.equal(store.images?.seo?.home?.summary, undefined);
  assert.equal(store.images?.seo?.home?.title?.pt, undefined);
  assert.equal(store.getSeoText('home', 'title', 'es'), 'SEO title');
});

test('AdminStore repairs malformed persisted SEO branches when writing a valid localized value', () => {
  const store = new AdminStore();
  store.init(createAdminI18n(), createAdminSiteData({
    seo: {
      home: {
        title: 'broken branch',
        description: createSeoLocales('Home description'),
      },
      translationSeo: {
        title: createSeoLocales('Translation title'),
        description: createSeoLocales('Translation description'),
      },
      ugc: {
        title: createSeoLocales('UGC title'),
        description: createSeoLocales('UGC description'),
      },
      contact: {
        title: createSeoLocales('Contact title'),
        description: createSeoLocales('Contact description'),
      },
    },
  }), 'es', '');

  store.setSeoText('home', 'title', 'es', '  Reparado  ');

  assert.equal(store.getSeoText('home', 'title', 'es'), '  Reparado  ');
  store.normalizeSeoText('home', 'title', 'es');
  assert.equal(store.getSeoText('home', 'title', 'es'), 'Reparado');
  assert.equal(store.images?.seo?.home?.title?.es, 'Reparado');
  assert.equal(store.getSnapshot().isDirty, true);
});

test('AdminStore saves and publishes normalized SEO while preserving raw in-memory edits until blur', async () => {
  const store = new AdminStore();
  store.init(createAdminI18n(), createAdminSiteData(), 'es', 'publish-token');
  store.setSeoText('home', 'title', 'es', '  SEO title  ');
  store.setSeoText('contact', 'description', 'ca', '  Text de contacte  ');
  store.setSeoText('ugc', 'description', 'fr', '   ');

  let savedDraft = '';
  const restoreWindow = installWindow({
    localStorage: {
      getItem: () => null,
      setItem: (_key, value) => {
        savedDraft = value;
      },
      removeItem: () => {},
    },
  });

  try {
    store.saveDraft();
  } finally {
    restoreWindow();
  }

  assert.equal(store.getSeoText('home', 'title', 'es'), '  SEO title  ');
  assert.equal(store.getSeoText('ugc', 'description', 'fr'), '   ');
  assert.ok(savedDraft, 'draft should be written to localStorage');
  const parsedDraft = JSON.parse(savedDraft);
  assert.equal(parsedDraft.images.seo.home.title.es, 'SEO title');
  assert.equal(parsedDraft.images.seo.contact.description.ca, 'Text de contacte');
  assert.equal(parsedDraft.images.seo.ugc.description.fr, '');

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    fetchCalls.push({ input: String(input), init });

    if (!init.method || init.method === 'GET') {
      return new Response(JSON.stringify({ sha: 'file-sha-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ content: { sha: 'next-sha' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await store.publish();
  } finally {
    globalThis.fetch = originalFetch;
  }

  const putCalls = fetchCalls.filter((call) => call.init?.method === 'PUT');
  assert.deepEqual(
    putCalls.map((call) => call.input),
    ['/.netlify/git/github/contents/src/data/site.json'],
    'SEO-only admin edits should publish through the existing site data document',
  );

  const published = decodePublishedJsonBody(putCalls[0].init?.body);
  assert.equal(published.seo.home.title.es, 'SEO title');
  assert.equal(published.seo.contact.description.ca, 'Text de contacte');
  assert.equal(published.seo.ugc.description.fr, '');
  assert.equal(store.getSnapshot().publishSuccess, true);
  assert.equal(store.getSnapshot().publishError, '');
  assert.equal(store.getSeoText('home', 'title', 'es'), 'SEO title');
  assert.equal(store.getSeoText('contact', 'description', 'ca'), 'Text de contacte');
  assert.equal(store.getSeoText('ugc', 'description', 'fr'), '');
  assert.equal(store.getSnapshot().isDirty, false);
});
