import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';
import { resolveSkillReorderIndices } from '../src/lib/adminCollections.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

function createLocalizedText(es, en, fr) {
  return { es, en, fr, de: '', it: '', ca: '' };
}

function createI18n() {
  return {
    es: { translationPage: { arsenal: { languagesTitle: 'Idiomas', toolsTitle: 'Herramientas', skillsTitle: 'Habilidades' }, skillGroups: { translation: 'Traducción y localización', seo: 'SEO y contenido web' } } },
    en: { translationPage: { arsenal: { languagesTitle: 'Languages', toolsTitle: 'Tools', skillsTitle: 'Skills' }, skillGroups: { translation: 'Translation & localization', seo: 'SEO & web content' } } },
    fr: { translationPage: { arsenal: { languagesTitle: 'Langues', toolsTitle: 'Outils', skillsTitle: 'Compétences' }, skillGroups: { translation: 'Traduction & localisation', seo: 'SEO et contenu web' } } },
  };
}

function createSiteData(overrides = {}) {
  return {
    heroMainPhoto: '',
    galleryCutouts: {},
    videoPlaceholderOrEmbedUrl: '',
    ugcHeaderImage: '',
    instagramScreenshot: '',
    socialLinks: { linkedin: '', instagram: '' },
    nicheBackgrounds: {},
    ugcVideos: {},
    ugcPhotos: {},
    nicheIcons: {},
    aboutPhotos: [],
    brandVideo: '',
    toolLogos: {},
    videoStickers: {},
    orbitMedia: [],
    ugcPortfolio: [],
    arsenal: {
      languages: [
        { id: 'language-spanish', code: 'es', label: createLocalizedText('Español', 'Spanish', 'Espagnol'), level: createLocalizedText('Nativo', 'Native', 'Natif') },
        { id: 'language-english', code: 'en', label: createLocalizedText('Inglés', 'English', 'Anglais'), level: createLocalizedText('C2', 'C2', 'C2') },
        { id: 'language-french', code: 'fr', label: createLocalizedText('Francés', 'French', 'Français'), level: createLocalizedText('C1', 'C1', 'C1') },
      ],
      tools: [
        { id: 'notion', logo: '/images/tools/notion.svg', label: createLocalizedText('Notion', 'Notion', 'Notion') },
        { id: 'trados', logo: '/images/tools/trados.svg', label: createLocalizedText('Trados', 'Trados', 'Trados') },
      ],
      skills: [
        { id: 'website-localization', group: 'translation', label: createLocalizedText('Localización web', 'Website localization', 'Localisation web') },
        { id: 'transcreation', group: 'translation', label: createLocalizedText('Transcreación', 'Transcreation', 'Transcréation') },
        { id: 'local-seo', group: 'seo', label: createLocalizedText('SEO local', 'Local SEO', 'SEO local') },
        { id: 'keyword-research', group: 'seo', label: createLocalizedText('Investigación de palabras clave', 'Keyword research', 'Recherche de mots-clés') },
      ],
    },
    person: { name: 'Marta', location: 'Elche', socialProfiles: { linkedin: '', instagram: '' } },
    ...overrides,
  };
}

test('admin translation-seo page mounts only the integrated arsenal editor and no detached EditableCollection cards or preview island', async () => {
  const source = await readSource('src/pages/admin/translation-seo.astro');

  assert.match(
    source,
    /import\s+AdminTranslationArsenalEditor\s+from\s+['"]\.\.\/\.\.\/components\/admin\/AdminTranslationArsenalEditor['"]/,
    'admin translation page should import the integrated arsenal editor',
  );

  const editorMatches = source.match(/<AdminTranslationArsenalEditor\s+client:load\s*\/>/g) ?? [];
  assert.equal(editorMatches.length, 1, 'admin translation page should mount the integrated arsenal editor exactly once');

  assert.doesNotMatch(source, /EditableCollection/, 'admin translation page should stop rendering the generic EditableCollection cards');
  assert.doesNotMatch(source, /AdminTranslationArsenalPreview/, 'admin translation page should stop mounting the separate display-only preview island');

  assert.equal(
    existsSync(path.join(rootDir, 'src/components/admin/EditableCollection.tsx')),
    false,
    'the generic EditableCollection component should be removed once it has no remaining usages',
  );
  assert.equal(
    existsSync(path.join(rootDir, 'src/components/admin/AdminTranslationArsenalPreview.tsx')),
    false,
    'the separate display-only arsenal preview component should be removed once it has no remaining usages',
  );
});

test('AdminTranslationArsenalEditor renders the approved compact three-panel arsenal layout with baseline public classes', async () => {
  const source = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');

  assert.match(source, /className="border border-ink"\s+data-admin-arsenal-editor/, 'outer wrapper should keep the exact compact border chrome');
  assert.match(source, /<div className="grid gap-0 lg:grid-cols-3">/, 'panel grid should keep the approved equal-third desktop layout');

  assert.match(source, /data-admin-arsenal-panel="languages"/);
  assert.match(source, /data-admin-arsenal-panel="tools"/);
  assert.match(source, /data-admin-arsenal-panel="skills"/);

  assert.match(source, /border-b border-ink p-5 lg:border-b-0 lg:border-r/, 'languages\/tools panels should keep the approved divider chrome');

  assert.match(
    source,
    /flex items-center justify-between gap-4 border-b border-ink\/10 py-3 last:border-b-0/,
    'language rows should keep the exact compact flex row baseline classes',
  );
  assert.match(
    source,
    /flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-3 bg-ink px-3 py-4 text-center text-paper transition hover:bg-amaranth hover:text-ink/,
    'tool tiles should keep the exact dark square tile baseline classes',
  );
  assert.match(source, /grid grid-cols-3 gap-2/, 'tools panel should keep the approved three-column equal-cell grid');
  assert.match(source, /grid gap-6 md:grid-cols-2/, 'skills panel should keep the approved two-column group grid');
  assert.match(
    source,
    /border border-ink\/12 px-3 py-2 text-\[0\.68rem\] uppercase tracking-\[0\.08em\] text-ink/,
    'skill chips should keep the exact baseline chip classes',
  );
});

test('AdminTranslationArsenalEditor keeps add controls scoped inside their own panels', async () => {
  const source = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');

  assert.match(source, /data-collection-add="languages"/);
  assert.match(source, /data-collection-add="tools"/);
  assert.match(source, /data-collection-add="skills-translation"/);
  assert.match(source, /data-collection-add="skills-seo"/);

  const translationGroupBlock = source.slice(source.indexOf('data-skill-group="translation"'), source.indexOf('data-skill-group="seo"'));
  assert.match(translationGroupBlock, /data-collection-add="skills-translation"/, 'the translation add marker should live inside the translation group column');

  const seoGroupBlock = source.slice(source.indexOf('data-skill-group="seo"'));
  assert.match(seoGroupBlock, /data-collection-add="skills-seo"/, 'the seo add marker should live inside the seo group column');

  assert.match(
    source,
    /aspect-square w-full min-w-0[\s\S]{0,80}border border-dashed/,
    'the dashed add-tool tile should keep the same square footprint as the live tool tiles',
  );
});

test('AdminTranslationArsenalEditor implements native HTML5 drag-and-drop reorder with data hooks for every item kind', async () => {
  const source = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');

  assert.match(source, /data-language-row/);
  assert.match(source, /data-tool-tile/);
  assert.match(source, /data-skill-chip/);

  assert.match(source, /draggable/);
  assert.match(source, /onDragStart=/);
  assert.match(source, /onDragOver=/);
  assert.match(source, /onDrop=/);
  assert.match(source, /onDragEnd=/);

  assert.match(source, /data-item-id=/);
  assert.match(source, /data-item-index=/);

  assert.match(source, /reorderEditableCollectionItem/, 'drop handling should call the typed reorder store method');
  assert.match(source, /resolveSkillReorderIndices/, 'skill drop handling should reuse the pure same-group gate helper');
});

test('AdminTranslationArsenalEditor keeps ES\/EN\/FR label fields, language levels, tool logo upload, and a skill group selector inside inline item editors', async () => {
  const source = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');

  assert.match(source, /EDITABLE_COLLECTION_LOCALES/, 'editors should reuse the shared ES\/EN\/FR locale list');
  assert.match(source, /level/i, 'language item editor should expose editable levels');
  assert.match(source, /setEditableToolLogo/, 'tool item editor should reuse the existing validated logo upload store method');
  assert.match(source, /<select[\s\S]*translation[\s\S]*seo/s, 'skill item editor should expose a translation-vs-seo group selector');
  assert.match(source, /updateEditableCollectionSkillGroup/, 'skill item editor group selector should call the existing store mutation');
});

test('tool logo replacement surfaces validation and upload errors in its item editor', async () => {
  const source = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');

  assert.match(source, /setItemError\(/, 'tool replacement failures should update visible item-editor error state');
  assert.match(source, /data-item-editor-error/, 'the active item editor should render its error state');
  assert.match(source, /role="alert"/, 'tool replacement errors should be announced');
  assert.doesNotMatch(source, /catch\s*\{\s*\/\*[\s\S]*?\*\/\s*\}/, 'tool replacement must not silently swallow errors');
});

test('AdminTranslationArsenalEditor keeps remove and up\/down reorder fallback inside the active item editor drawer', async () => {
  const source = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');

  assert.match(source, /data-item-editor=/, 'item editor drawer should expose a stable data hook');
  assert.match(source, /data-remove-item/);
  assert.match(source, /data-move-item="up"/);
  assert.match(source, /data-move-item="down"/);
  assert.match(source, /removeEditableCollectionItem/);
  assert.match(source, /moveEditableCollectionItem/);
});

test('resolveSkillReorderIndices only allows drops within the same skill group', () => {
  const skills = createSiteData().arsenal.skills;

  assert.deepEqual(resolveSkillReorderIndices(skills, 0, 1), { fromIndex: 0, targetIndex: 1 }, 'same-group reorder should pass through the requested indices');
  assert.equal(resolveSkillReorderIndices(skills, 0, 2), null, 'cross-group drop (translation onto seo) should be rejected');
  assert.equal(resolveSkillReorderIndices(skills, 3, 1), null, 'cross-group drop (seo onto translation) should be rejected');
  assert.deepEqual(resolveSkillReorderIndices(skills, 2, 3), { fromIndex: 2, targetIndex: 3 }, 'same-group (seo) reorder should pass through the requested indices');
  assert.equal(resolveSkillReorderIndices(skills, -1, 1), null, 'out-of-range source index should be rejected');
  assert.equal(resolveSkillReorderIndices(skills, 0, 99), null, 'out-of-range target index should be rejected');
});

test('AdminStore.reorderEditableCollectionItem moves items forward and backward and ignores invalid or same-index calls', () => {
  const store = new AdminStore();
  store.init(createI18n(), createSiteData(), 'en', '');

  let emitCount = 0;
  const unsubscribe = store.subscribe(() => { emitCount += 1; });

  store.reorderEditableCollectionItem('languages', 0, 2);
  assert.equal(emitCount, 1, 'a valid forward reorder should emit exactly once');
  assert.deepEqual(
    store.getSnapshot().getEditableCollection('languages').map((item) => item.id),
    ['language-english', 'language-french', 'language-spanish'],
    'forward reorder should move the item to the requested target index',
  );

  store.reorderEditableCollectionItem('languages', 2, 0);
  assert.equal(emitCount, 2, 'a valid backward reorder should emit exactly once');
  assert.deepEqual(
    store.getSnapshot().getEditableCollection('languages').map((item) => item.id),
    ['language-spanish', 'language-english', 'language-french'],
    'backward reorder should move the item back to the requested target index',
  );

  store.reorderEditableCollectionItem('languages', 1, 1);
  assert.equal(emitCount, 2, 'a same-index reorder should no-op without emitting');

  store.reorderEditableCollectionItem('languages', -1, 1);
  store.reorderEditableCollectionItem('languages', 0, 99);
  store.reorderEditableCollectionItem('languages', 99, 0);
  assert.equal(emitCount, 2, 'out-of-range indices should no-op without emitting');
  assert.deepEqual(
    store.getSnapshot().getEditableCollection('languages').map((item) => item.id),
    ['language-spanish', 'language-english', 'language-french'],
    'invalid reorder attempts should leave the collection untouched',
  );

  unsubscribe();
});

test('AdminStore.reorderEditableCollectionItem marks the draft dirty and clears publish success/error state', () => {
  const store = new AdminStore();
  store.init(createI18n(), createSiteData(), 'en', '');

  assert.equal(store.getSnapshot().isDirty, false, 'a freshly initialized store should not be dirty');

  store.reorderEditableCollectionItem('tools', 0, 1);

  const snapshot = store.getSnapshot();
  assert.equal(snapshot.isDirty, true, 'a valid reorder should mark the draft dirty');
  assert.equal(snapshot.publishSuccess, false, 'a valid reorder should clear publish success state');
  assert.equal(snapshot.publishError, '', 'a valid reorder should clear publish error state');
});

test('AdminStore.moveEditableCollectionItem stays compatible by delegating delta moves to reorderEditableCollectionItem', () => {
  const store = new AdminStore();
  store.init(createI18n(), createSiteData(), 'en', '');

  store.moveEditableCollectionItem('skills', 2, -1);

  assert.deepEqual(
    store.getSnapshot().getEditableCollection('skills').map((item) => item.id),
    ['website-localization', 'local-seo', 'transcreation', 'keyword-research'],
    'delta-based move should still splice the item to index + delta like the direct reorder call',
  );

  store.moveEditableCollectionItem('skills', 0, 0);
  assert.deepEqual(
    store.getSnapshot().getEditableCollection('skills').map((item) => item.id),
    ['website-localization', 'local-seo', 'transcreation', 'keyword-research'],
    'a zero delta should remain a no-op',
  );
});
