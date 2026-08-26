import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];

const wrapperSpecs = [
  ['src/pages/index.astro', '../views/HomePage.astro', 'HomePage'],
  ['src/pages/en/index.astro', '../../views/HomePage.astro', 'HomePage'],
  ['src/pages/fr/index.astro', '../../views/HomePage.astro', 'HomePage'],
  ['src/pages/de/index.astro', '../../views/HomePage.astro', 'HomePage'],
  ['src/pages/it/index.astro', '../../views/HomePage.astro', 'HomePage'],
  ['src/pages/ca/index.astro', '../../views/HomePage.astro', 'HomePage'],
  ['src/pages/ugc.astro', '../views/UgcPage.astro', 'UgcPage'],
  ['src/pages/en/ugc.astro', '../../views/UgcPage.astro', 'UgcPage'],
  ['src/pages/fr/ugc.astro', '../../views/UgcPage.astro', 'UgcPage'],
  ['src/pages/de/ugc.astro', '../../views/UgcPage.astro', 'UgcPage'],
  ['src/pages/it/ugc.astro', '../../views/UgcPage.astro', 'UgcPage'],
  ['src/pages/ca/ugc.astro', '../../views/UgcPage.astro', 'UgcPage'],
  ['src/pages/translation-seo.astro', '../views/TranslationSeoPage.astro', 'TranslationSeoPage'],
  ['src/pages/en/translation-seo.astro', '../../views/TranslationSeoPage.astro', 'TranslationSeoPage'],
  ['src/pages/fr/translation-seo.astro', '../../views/TranslationSeoPage.astro', 'TranslationSeoPage'],
  ['src/pages/de/translation-seo.astro', '../../views/TranslationSeoPage.astro', 'TranslationSeoPage'],
  ['src/pages/it/translation-seo.astro', '../../views/TranslationSeoPage.astro', 'TranslationSeoPage'],
  ['src/pages/ca/translation-seo.astro', '../../views/TranslationSeoPage.astro', 'TranslationSeoPage'],
  ['src/pages/contact.astro', '../views/ContactPage.astro', 'ContactPage'],
  ['src/pages/en/contact.astro', '../../views/ContactPage.astro', 'ContactPage'],
  ['src/pages/fr/contact.astro', '../../views/ContactPage.astro', 'ContactPage'],
  ['src/pages/de/contact.astro', '../../views/ContactPage.astro', 'ContactPage'],
  ['src/pages/it/contact.astro', '../../views/ContactPage.astro', 'ContactPage'],
  ['src/pages/ca/contact.astro', '../../views/ContactPage.astro', 'ContactPage'],
  ['src/pages/blog/index.astro', '../../views/BlogIndexPage.astro', 'BlogIndexPage'],
  ['src/pages/en/blog/index.astro', '../../../views/BlogIndexPage.astro', 'BlogIndexPage'],
  ['src/pages/fr/blog/index.astro', '../../../views/BlogIndexPage.astro', 'BlogIndexPage'],
  ['src/pages/de/blog/index.astro', '../../../views/BlogIndexPage.astro', 'BlogIndexPage'],
  ['src/pages/it/blog/index.astro', '../../../views/BlogIndexPage.astro', 'BlogIndexPage'],
  ['src/pages/ca/blog/index.astro', '../../../views/BlogIndexPage.astro', 'BlogIndexPage'],
];

const sharedViews = [
  'src/views/HomePage.astro',
  'src/views/UgcPage.astro',
  'src/views/TranslationSeoPage.astro',
  'src/views/BlogIndexPage.astro',
  'src/views/ContactPage.astro',
];

const typedViewSpecs = [
  ['src/views/HomePage.astro', /text=\{i\.hero\.name\}/, 1],
  ['src/views/UgcPage.astro', /text=\{i\.ugcPage\.hero\.headline\}/, 1],
  ['src/views/TranslationSeoPage.astro', /text=\{page\.hero\.title\}/, 6],
  ['src/views/BlogIndexPage.astro', /text=\{i\.blog\.title\}/, 1],
  ['src/views/ContactPage.astro', /text=\{i\.contact\.title\}/, 1],
];

const articlePages = [
  'src/pages/blog/[slug].astro',
  'src/pages/en/blog/[slug].astro',
  'src/pages/fr/blog/[slug].astro',
  'src/pages/de/blog/[slug].astro',
  'src/pages/it/blog/[slug].astro',
  'src/pages/ca/blog/[slug].astro',
];

const noSpacerShells = [
  ...sharedViews,
  'src/pages/admin/index.astro',
  'src/pages/admin/ugc.astro',
  'src/pages/admin/translation-seo.astro',
  'src/pages/admin/contact.astro',
];

const requiredLocalePaths = [
  'home.hero.kicker',
  'home.hero.description',
  'about.title',
  'about.text',
  'home.video.description',
  'ugcPage.hero.description',
  'ugcPage.hero.nicheIntroText',
  'ugcPage.contactSheet.eyebrow',
  'ugcPage.contactSheet.headline',
  'ugcPage.niches.travel.intro',
  'ugcPage.niches.languages.intro',
  'ugcPage.niches.art.intro',
  'contact.subtitle',
  'translationPage.hero.title',
  'translationPage.hero.text',
  'translationPage.experience.cards.0.text',
  'translationPage.experience.cards.1.text',
  'translationPage.experience.cards.2.text',
  'translationPage.education.studies.0',
  'translationPage.education.studies.1',
  'translationPage.education.studies.2',
  'translationPage.education.studies.3',
  'blog.emptyState',
  'ugcPage.backToTop',
  'footer.eyebrow',
  'footer.headline',
  'footer.support',
  'footer.cta',
  'nav.home',
  'nav.ugc',
  'nav.translationSeo',
  'nav.blog',
  'nav.contact',
];

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

function deepGet(source, keyPath) {
  return keyPath.split('.').reduce((current, segment) => current?.[segment], source);
}

test('Phase 2 shared public views exist', async () => {
  await Promise.all(
    sharedViews.map(async (relativePath) => {
      await access(path.join(rootDir, relativePath));
    }),
  );
});

test('Phase 2 public route files are thin wrappers around shared views', async () => {
  const sources = await Promise.all(
    wrapperSpecs.map(async ([relativePath]) => [relativePath, await readSource(relativePath)]),
  );

  for (const [relativePath, source] of sources) {
    const [, importPath, componentName] = wrapperSpecs.find(([candidate]) => candidate === relativePath);
    const normalized = source.trim();

    assert.match(
      normalized,
      new RegExp(`^---\\s*import ${componentName} from ['"]${importPath.replaceAll('/', '\\/')}['"];\\s*---\\s*<${componentName}\\s*\\/?>$`),
      `${relativePath} should stay a thin wrapper around ${componentName}`,
    );
    assert.doesNotMatch(normalized, /BaseLayout|PageTransition|ScrollReveal|getCollection|TypedTitle/);
  }
});

test('TypedTitle component keeps the reduced-motion and Astro lifecycle contract', async () => {
  const source = await readSource('src/components/TypedTitle.astro');

  assert.match(source, /typed\.js/);
  assert.match(source, /trigger\?:\s*['"]load['"]\s*\|\s*['"]visible['"]/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /prefers-reduced-motion: reduce|prefersReducedMotion/);
  assert.match(source, /astro:page-load/);
  assert.match(source, /astro:before-preparation|astro:before-swap/);
  assert.match(source, /disconnect|destroy/);
});

test('Phase 2 public destination views keep TypedTitle scoped to approved hero and section headings', async () => {
  const sources = await Promise.all(
    typedViewSpecs.map(async ([relativePath]) => [relativePath, await readSource(relativePath)]),
  );

  for (const [relativePath, expectedTextPattern, expectedCount] of typedViewSpecs) {
    const source = sources.find(([candidate]) => candidate === relativePath)[1];
    assert.equal((source.match(/<TypedTitle\b/g) ?? []).length, expectedCount, `${relativePath} should render the approved TypedTitle count`);
    assert.match(source, expectedTextPattern, `${relativePath} should type the expected H1 text`);
  }
});

test('Phase 2 article detail pages stay static and preserve locale-aware blog navigation', async () => {
  const sources = await Promise.all(
    articlePages.map(async (relativePath) => [relativePath, await readSource(relativePath)]),
  );

  for (const [relativePath, source] of sources) {
    assert.doesNotMatch(source, /TypedTitle/, `${relativePath} should not type article titles`);
    assert.match(source, /import\s+BlogArticleLayout\s+from\s+['"].+BlogArticleLayout\.astro['"]/,
      `${relativePath} should render the shared BlogArticleLayout shell`);
    assert.match(source, /const\s+\{\s*Content\s*,\s*headings\s*\}\s*=\s*await\s+render\(post\)/,
      `${relativePath} should keep render\\(post\\) heading data available`);
    assert.match(source, /<BlogArticleLayout\b[\s\S]*headings=\{headings\}[\s\S]*>\s*<Content\s*\/>\s*<\/BlogArticleLayout>/,
      `${relativePath} should pass Content through BlogArticleLayout instead of inlining the article shell`);
  }
});

test('Phase 2 blog index keeps locale-aware hrefs and the editorial empty-archive shell', async () => {
  const [viewSource, ...localeFiles] = await Promise.all([
    readSource('src/views/BlogIndexPage.astro'),
    ...locales.map((locale) => readJson(`src/i18n/${locale}.json`)),
  ]);

  assert.match(viewSource, /import\s+\{\s*getLangFromUrl,\s*getLocalizedPath,\s*t\s*\}\s+from\s+['"]..\/i18n['"]/);
  assert.match(viewSource, /href=\{getLocalizedPath\(`\/blog\/\$\{post\.data\.slug\}`,\s*lang\)\}/);
  assert.match(viewSource, /data-blog-archive/);
  assert.match(viewSource, /i\.blog\.comingSoonTitle/);
  assert.match(viewSource, /i\.blog\.comingSoonMeta/);
  assert.match(viewSource, /String\(latest\s*\?\s*2\s*:\s*1\)\.padStart\(2,\s*['"]0['"]\)/);
  assert.doesNotMatch(viewSource, /const\s+emptyBlogState\s*=\s*i\.blog\['emptyState'\]/);
  assert.doesNotMatch(viewSource, /\{emptyBlogState\}/);

  localeFiles.forEach((dictionary, index) => {
    assert.equal(typeof dictionary.blog.comingSoonTitle, 'string', `${locales[index]} blog.comingSoonTitle should exist`);
    assert.notEqual(dictionary.blog.comingSoonTitle.trim(), '', `${locales[index]} blog.comingSoonTitle should not be empty`);
    assert.equal(typeof dictionary.blog.comingSoonMeta, 'string', `${locales[index]} blog.comingSoonMeta should exist`);
    assert.notEqual(dictionary.blog.comingSoonMeta.trim(), '', `${locales[index]} blog.comingSoonMeta should not be empty`);
  });
});

test('Phase 2 removes top-level pt-24 spacers from shared and admin destination shells', async () => {
  const sources = await Promise.all(
    noSpacerShells.map(async (relativePath) => [relativePath, await readSource(relativePath)]),
  );

  for (const [relativePath, source] of sources) {
    if (
      relativePath === 'src/views/HomePage.astro'
      || relativePath === 'src/pages/admin/index.astro'
      || relativePath === 'src/views/UgcPage.astro'
      || relativePath === 'src/pages/admin/ugc.astro'
      || relativePath === 'src/views/ContactPage.astro'
      || relativePath === 'src/pages/admin/contact.astro'
    ) {
      assert.match(source, /\bmd:pt-24\b/, `${relativePath} should keep the approved tighter hero top padding`);
      continue;
    }

    assert.doesNotMatch(source, /\bpt-24\b/, `${relativePath} should not keep a top-level pt-24 spacer`);
  }
});

test('Phase 2 locale files keep required public copy filled in for every locale', async () => {
  const dictionaries = await Promise.all(locales.map((locale) => readJson(`src/i18n/${locale}.json`)));

  dictionaries.forEach((dictionary, index) => {
    requiredLocalePaths.forEach((keyPath) => {
      const value = deepGet(dictionary, keyPath);
      assert.equal(typeof value, 'string', `${locales[index]} ${keyPath} should be a string`);
      assert.notEqual(value.trim(), '', `${locales[index]} ${keyPath} should not be empty`);
    });
  });
});

test('Phase 2 Spanish and translation hero copy match the approved content set', async () => {
  const [es, en, fr, de, it, ca] = await Promise.all(locales.map((locale) => readJson(`src/i18n/${locale}.json`)));

  assert.equal(es.home.hero.kicker, 'Creatividad, idiomas y estrategia');
  assert.equal(es.home.hero.description, 'Creo contenido y adapto mensajes para que las marcas conecten con personas reales, en cualquier idioma y mercado. Combino creatividad, traducción y estrategia digital con una mirada internacional.');
  assert.equal(es.about.title, 'Encantada, soy Marta.');
  assert.equal(es.about.text, 'Soy traductora y creadora de contenido. Trabajo entre idiomas, culturas y formatos para que cada mensaje conserve su intención y conecte de forma natural.\\n\\nCombino traducción, localización, SEO multilingüe y contenido UGC para ayudar a las marcas a comunicar con claridad, coherencia y sensibilidad cultural.');
  assert.equal(es.home.video.description, 'En @marttelier comparto contenido sobre arte, viajes, idiomas y procesos creativos. Un espacio personal donde convierto curiosidad, observación y experiencias reales en historias visuales.');
  assert.equal(es.ugcPage.hero.description, 'Creo vídeos e imágenes que se integran de forma natural en redes y campañas. Contenido cercano, cuidado y creíble, pensado para captar atención sin perder la identidad de la marca.');
  assert.equal(es.ugcPage.hero.nicheIntroText, 'Entiendo qué hace única a cada marca y lo traduzco en contenido natural, relevante y listo para conectar con su audiencia.');
  assert.equal(es.ugcPage.niches.travel.intro, 'Creo contenido para turismo, alojamientos y productos de viaje que transmite la experiencia con naturalidad: recorridos, recomendaciones, integraciones y piezas que ayudan a imaginar el destino antes de reservar.');
  assert.equal(es.ugcPage.niches.languages.intro, 'Creo contenido claro y cercano para apps, plataformas educativas y servicios internacionales. Adapto el mensaje al idioma, al contexto cultural y a la forma en que cada audiencia decide y conecta.');
  assert.equal(es.ugcPage.niches.art.intro, 'Creo piezas editoriales para marcas de arte, diseño y lifestyle. Cuido composición, ritmo y narrativa para que cada plano refuerce la identidad del producto.');
  assert.equal(es.contact.subtitle, 'Cuéntame qué quieres crear, adaptar o posicionar. Te responderé con una propuesta clara para dar forma al proyecto.');
  assert.equal(es.translationPage.hero.title, 'Servicios de Traducción, SEO y Localización');
  assert.equal(es.translationPage.hero.text, 'Adapto contenidos para que suenen naturales, conecten con cada mercado y tengan más oportunidades de encontrarse. Traducción, localización y SEO multilingüe con una misma intención: que tu mensaje funcione, esté donde esté tu audiencia.');
  assert.equal(es.translationPage.experience.cards[0].text, 'Traducción diaria de fichas de producto (ES→FR/DE/IT), gestión de catálogos y atención a clientes francófonos, manteniendo precisión y tono de marca.');
  assert.equal(es.translationPage.experience.cards[1].text, 'Traducción FR⇄ES de textos legales y posedición, con foco en precisión terminológica y coherencia.');
  assert.equal(es.translationPage.experience.cards[2].text, 'Trabajo y convivencia en Suiza en un entorno multicultural, reforzando adaptabilidad, empatía y fluidez comunicativa.');
  assert.equal(es.translationPage.education.studies[0], 'Grado en Traducción e Interpretación, especializado en francés, redacción y adaptación de contenidos.');
  assert.equal(es.translationPage.education.studies[1], 'Erasmus+ de seis meses en París y práctica diaria en entornos francófonos.');
  assert.equal(es.translationPage.education.studies[2], 'Formación continua en escritura clara, terminología y optimización de contenidos digitales.');
  assert.equal(es.translationPage.education.studies[3], 'Prácticas de traducción jurídica FR→ES y posedición junto a una traductora especializada.');
  assert.equal(es.ugcPage.hero.headline, '@marttelier');
  assert.equal(en.ugcPage.hero.headline, '@marttelier');
  assert.equal(fr.ugcPage.hero.headline, '@marttelier');
  assert.equal(de.ugcPage.hero.headline, '@marttelier');
  assert.equal(it.ugcPage.hero.headline, '@marttelier');
  assert.equal(ca.ugcPage.hero.headline, '@marttelier');
  assert.equal(es.ugcPage.contactSheet.eyebrow, 'UGC · DIRECCIÓN CREATIVA');
  assert.equal(es.ugcPage.contactSheet.headline, 'CONTENIDO QUE CONVIERTE EXPERIENCIAS, IDIOMAS Y ARTE EN HISTORIAS VISUALES.');
  assert.equal(en.ugcPage.contactSheet.headline, 'CONTENT THAT TURNS EXPERIENCES, LANGUAGES, AND ART INTO VISUAL STORIES.');
  assert.equal(fr.ugcPage.contactSheet.headline, 'DU CONTENU QUI TRANSFORME LES EXPÉRIENCES, LES LANGUES ET L’ART EN HISTOIRES VISUELLES.');
  assert.equal(de.ugcPage.contactSheet.headline, 'INHALTE, DIE ERLEBNISSE, SPRACHEN UND KUNST IN VISUELLE GESCHICHTEN VERWANDELN.');
  assert.equal(it.ugcPage.contactSheet.headline, 'CONTENUTI CHE TRASFORMANO ESPERIENZE, LINGUE E ARTE IN STORIE VISIVE.');
  assert.equal(ca.ugcPage.contactSheet.headline, 'CONTINGUT QUE CONVERTEIX EXPERIÈNCIES, IDIOMES I ART EN HISTÒRIES VISUALS.');

  assert.equal(en.translationPage.hero.title, 'Translation, SEO & Localization Services');
  assert.equal(fr.translationPage.hero.title, 'Services de traduction, SEO et localisation');
  assert.equal(de.translationPage.hero.title, 'Übersetzungs-, SEO- und Lokalisierungsdienstleistungen');
  assert.equal(it.translationPage.hero.title, 'Servizi di traduzione, SEO e localizzazione');
  assert.equal(ca.translationPage.hero.title, 'Serveis de traducció, SEO i localització');
});

test('Phase 2 article back-link copy avoids duplicating arrow glyphs', async () => {
  const dictionaries = await Promise.all(locales.map((locale) => readJson(`src/i18n/${locale}.json`)));

  dictionaries.forEach((dictionary, index) => {
    assert.doesNotMatch(
      dictionary.blog.backToList,
      /^[←↩]/u,
      `${locales[index]} blog.backToList should leave the arrow to markup only`,
    );
  });
});
