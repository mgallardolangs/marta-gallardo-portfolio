import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';
import { createLocalizedText } from '../src/lib/orbitMedia.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Every path read through readSource() is tracked here so we can assert, at
// the end of the file, that this contract never depends on src/i18n/*.json
// (user-authored, editable public content) to pass.
const readSourcePaths = new Set();

async function readSource(relativePath) {
  readSourcePaths.add(relativePath);
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

const FIXED_ADMIN_SURFACE_FILES = [
  'src/components/admin/AdminToolbar.tsx',
  'src/components/admin/adminStore.ts',
  'src/components/admin/AdminTranslationArsenalEditor.tsx',
  'src/components/admin/AdminTranslationExperienceEditor.tsx',
  'src/components/admin/EditableOrbitCollection.tsx',
  'src/components/admin/EditableUgcPortfolio.tsx',
  'src/components/admin/BlogPostForm.tsx',
  'src/components/admin/EditableImage.tsx',
  'src/components/admin/EditableMedia.tsx',
  'src/components/admin/AdminBrandVideo.tsx',
  'src/components/admin/AdminOrbitPreview.tsx',
  'src/lib/adminCollections.ts',
  'src/lib/orbitMedia.ts',
  'src/lib/ugcPortfolio.ts',
  'src/pages/admin/index.astro',
  'src/pages/admin/ugc.astro',
  'src/pages/admin/blog/new.astro',
];

async function readFixedAdminSurfaceSources() {
  const entries = await Promise.all(
    FIXED_ADMIN_SURFACE_FILES.map(async (relativePath) => [relativePath, await readSource(relativePath)]),
  );
  return new Map(entries);
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

function createWindowStorage(overrides = {}) {
  return {
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      ...overrides,
    },
  };
}

function installMockFileReader() {
  const PreviousFileReader = globalThis.FileReader;

  class MockFileReader {
    readAsDataURL(file) {
      this.result = `data:${file.type};base64,${Buffer.from(`preview:${file.name}`).toString('base64')}`;
      queueMicrotask(() => this.onload?.());
    }
  }

  globalThis.FileReader = MockFileReader;
  return () => {
    if (PreviousFileReader === undefined) {
      delete globalThis.FileReader;
      return;
    }
    globalThis.FileReader = PreviousFileReader;
  };
}

function createStore() {
  const store = new AdminStore();
  store.init(
    {
      es: { home: { hero: { kicker: 'hola' } } },
      en: { home: { hero: { kicker: 'hello' } } },
      fr: { home: { hero: { kicker: 'salut' } } },
    },
    {
      heroMainPhoto: '/images/site/original-hero.jpg',
      orbitMedia: [
        {
          id: 'orbit-image',
          type: 'image',
          src: '/images/site/original-image.jpg',
          href: null,
          label: createLocalizedText('Imagen'),
          alt: createLocalizedText('Alt imagen'),
          poster: null,
        },
        {
          id: 'orbit-video',
          type: 'video',
          src: '/images/site/original-video.mp4',
          href: '/contact',
          label: createLocalizedText('Vídeo'),
          alt: createLocalizedText('Alt vídeo'),
          poster: '/images/site/original-video-poster.jpg',
        },
      ],
      socialLinks: { linkedin: '', instagram: '' },
      nicheBackgrounds: {},
      ugcVideos: {},
      ugcPhotos: {},
      nicheIcons: {},
      aboutPhotos: [],
      brandVideo: '',
      toolLogos: {},
      videoStickers: {},
      galleryCutouts: {},
      videoPlaceholderOrEmbedUrl: '',
      ugcHeaderImage: '',
      instagramScreenshot: '',
      arsenal: { languages: [], tools: [], skills: [] },
      person: { name: 'Marta', location: 'Barcelona', socialProfiles: { linkedin: '', instagram: '' } },
    },
    'es',
    'publish-token',
  );
  return store;
}

test('AdminToolbar exposes the required Spanish toolbar strings', async () => {
  const source = await readSource('src/components/admin/AdminToolbar.tsx');

  assert.match(source, /Editar/, 'toolbar toggle button should read "Editar"');
  assert.match(source, /Etiquetas de navegación/, 'nav labels section should be in Spanish');
  assert.match(source, /Idiomas visibles/, 'public picker section should be in Spanish');
  assert.match(source, /Guardar borrador/, 'save draft action should be in Spanish');
  assert.match(source, /Publicar cambios/, 'publish action should be in Spanish');
  assert.match(source, /Publicando/, 'in-flight publish state should be in Spanish');
  assert.match(source, /Salir del editor/, 'exit link should be in Spanish');
  assert.match(source, /Corrige los avisos del orbit antes de publicar/, 'orbit warning toast should be in Spanish');
  assert.match(source, /¡Publicado!/, 'publish success toast should be in Spanish');

  assert.doesNotMatch(source, /Navigation labels/, 'old English nav labels heading should be gone');
  assert.doesNotMatch(source, /Public language picker/, 'old English public picker heading should be gone');
  assert.doesNotMatch(source, /Save draft/, 'old English save draft copy should be gone');
  assert.doesNotMatch(source, /Publish changes/, 'old English publish copy should be gone');
  assert.doesNotMatch(source, /Exit editor/, 'old English exit copy should be gone');
  assert.doesNotMatch(source, /Fix the orbit warnings/, 'old English orbit warning should be gone');
  assert.doesNotMatch(source, /Published! Rebuilds/, 'old English publish success copy should be gone');
});

test('AdminStore draft save/restore messages use the exact required Spanish singular/plural wording', async () => {
  const restoreFileReader = installMockFileReader();

  try {
    // Saving a draft with exactly one pending (unsaved) upload must warn with
    // the singular wording, and make clear the file is still available in the
    // current tab — reselection is only needed if the page reloads first.
    const singularStore = createStore();
    let singularSavedPayload = '';
    const restoreSingularWindow = installWindow(createWindowStorage({
      setItem: (_key, value) => {
        singularSavedPayload = value;
      },
    }));

    try {
      await singularStore.setOrbitMediaFile(
        1,
        'poster',
        new File([Buffer.from('poster-binary')], 'poster.jpg', { type: 'image/jpeg' }),
        '/images/site/pending-video-poster.jpg',
      );
      singularStore.saveDraft();
      assert.equal(
        singularStore.getSnapshot().draftMessage,
        'Borrador guardado localmente. Si recargas antes de publicar, tendrás que volver a seleccionar 1 archivo pendiente.',
      );
    } finally {
      restoreSingularWindow();
    }

    // Saving a draft with several pending uploads must warn with the exact
    // plural wording, substituting the real pending count.
    const pluralStore = createStore();
    const restorePluralWindow = installWindow(createWindowStorage());

    try {
      await pluralStore.setOrbitMediaFile(
        0,
        'src',
        new File([Buffer.from('image-binary')], 'tile.webp', { type: 'image/webp' }),
        '/images/site/pending-image.webp',
      );
      await pluralStore.setOrbitMediaFile(
        1,
        'src',
        new File([Buffer.from('video-binary')], 'tile.mp4', { type: 'video/mp4' }),
        '/images/site/pending-video.mp4',
      );
      await pluralStore.setOrbitMediaFile(
        1,
        'poster',
        new File([Buffer.from('poster-binary')], 'tile-poster.jpg', { type: 'image/jpeg' }),
        '/images/site/pending-video-poster.jpg',
      );
      pluralStore.saveDraft();
      assert.equal(
        pluralStore.getSnapshot().draftMessage,
        'Borrador guardado localmente. Si recargas antes de publicar, tendrás que volver a seleccionar 3 archivos pendientes.',
      );
    } finally {
      restorePluralWindow();
    }

    // With no pending uploads, the confirmation should be a plain Spanish
    // sentence without any reselection warning.
    const cleanStore = createStore();
    const restoreCleanWindow = installWindow(createWindowStorage());

    try {
      cleanStore.setText('home.hero.kicker', 'nuevo titular');
      cleanStore.saveDraft();
      assert.equal(cleanStore.getSnapshot().draftMessage, 'Borrador guardado localmente.');
    } finally {
      restoreCleanWindow();
    }

    // Restoring a draft with one/many pending uploads should surface a clear
    // Spanish restored-draft message too (not required to match the save
    // wording verbatim, but must be Spanish and mention re-selection).
    const restoreSourceStore = createStore();
    let restoredPayload = '';
    const restoreRestoreSourceWindow = installWindow(createWindowStorage({
      setItem: (_key, value) => {
        restoredPayload = value;
      },
    }));

    try {
      await restoreSourceStore.setOrbitMediaFile(
        1,
        'poster',
        new File([Buffer.from('poster-binary')], 'poster.jpg', { type: 'image/jpeg' }),
        '/images/site/pending-video-poster.jpg',
      );
      restoreSourceStore.saveDraft();
    } finally {
      restoreRestoreSourceWindow();
    }

    const loadingStore = createStore();
    const restoreLoadingWindow = installWindow(createWindowStorage({
      getItem: () => restoredPayload,
    }));

    try {
      loadingStore.loadDraft();
      const message = loadingStore.getSnapshot().draftMessage ?? '';
      assert.match(message, /Borrador restaurado/, 'restored-draft message should be Spanish');
      assert.match(message, /volver a seleccionar/i, 'restored-draft message should mention reselecting the file');
      assert.doesNotMatch(message, /reselected/i, 'restored-draft message should not keep old English wording');
    } finally {
      restoreLoadingWindow();
    }
  } finally {
    restoreFileReader();
  }
});

test('AdminStore login/session/blog/publish operational errors are in Spanish', async () => {
  const source = await readSource('src/components/admin/adminStore.ts');

  assert.match(source, /Debes iniciar sesión antes de publicar\./);
  assert.match(source, /Debes iniciar sesión antes de crear entradas de blog\./);
  assert.match(source, /Las entradas de blog solo se pueden crear en ES, EN o FR\./);
  assert.match(source, /El slug es obligatorio\./);
  assert.match(source, /La imagen destacada debe ser un archivo JPEG, PNG, WebP o GIF\./);
  assert.match(source, /La imagen destacada debe pesar 2 ?MB o menos/i);
  assert.match(source, /La sesión de administrador ha expirado\./);
  assert.match(source, /No se pudo guardar el borrador localmente\./);
  assert.match(source, /No se pudo (crear|publicar|cargar) \$\{path\}/);

  assert.doesNotMatch(source, /Login required before publishing\./);
  assert.doesNotMatch(source, /Login required before creating blog posts\./);
  assert.doesNotMatch(source, /Blog posts can only be created in ES, EN, or FR\./);
  assert.doesNotMatch(source, /^A slug is required\.$/m);
  assert.doesNotMatch(source, /Featured image must be a JPEG, PNG, WebP, or GIF file\./);
  assert.doesNotMatch(source, /Admin session expired\. Sign out/);
  assert.doesNotMatch(source, /Draft (could not be )?saved locally/);
  assert.doesNotMatch(source, /Draft restored\. \d/);
});

test('adminCollections validation errors surfaced by the arsenal editor are in Spanish', async () => {
  const source = await readSource('src/lib/adminCollections.ts');

  assert.match(source, /necesita valores en ES\/EN\/FR/);
  assert.match(source, /necesita etiquetas en ES\/EN\/FR/);
  assert.match(source, /necesita niveles en ES\/EN\/FR/);
  assert.match(source, /necesita un logo/);
  assert.match(source, /necesita un grupo de traducción o seo/i);
  assert.match(source, /logos de herramientas deben usar formato JPG, PNG, WebP, GIF o SVG/i);
  assert.match(source, /logos de herramientas deben pesar 2 ?MB o menos/i);

  assert.doesNotMatch(source, /requires ES\/EN\/FR/);
  assert.doesNotMatch(source, /requires a logo/);
  assert.doesNotMatch(source, /requires a translation or seo group/);
  assert.doesNotMatch(source, /Tool logos must use JPG, PNG, WebP, GIF, or SVG format\./);
  assert.doesNotMatch(source, /Tool logos must be 2MB or smaller\./);
});

test('orbitMedia and ugcPortfolio upload/validation copy is in Spanish, keeping format acronyms intact', async () => {
  const [orbitSource, ugcSource] = await Promise.all([
    readSource('src/lib/orbitMedia.ts'),
    readSource('src/lib/ugcPortfolio.ts'),
  ]);

  for (const source of [orbitSource, ugcSource]) {
    assert.match(source, /Usa formato/);
    assert.match(source, /MP4, WebM o QuickTime/);
    assert.match(source, /JPG, PNG, WebP o GIF/);
    assert.match(source, /pesar 2 ?MB o menos/i);
    assert.match(source, /pesar 8 ?MB o menos/i);
    assert.match(source, /necesita(n)? una imagen de póster/i);
    assert.match(source, /necesita(n)? valores en español, inglés y francés/i);

    assert.doesNotMatch(source, /Use (JPG|MP4)/);
    assert.doesNotMatch(source, /Images must be 2MB or smaller\./);
    assert.doesNotMatch(source, /Videos must be 8MB or smaller\./);
    assert.doesNotMatch(source, /require a poster image\./);
    assert.doesNotMatch(source, /needs Spanish, English, and French values\./);
  }

  assert.match(orbitSource, /elemento del orbit necesita un archivo de origen/i);
  assert.match(orbitSource, /imágenes del orbit deben usar un archivo de origen JPG, PNG, WebP, GIF o SVG/i);
  assert.match(orbitSource, /vídeos del orbit deben usar un archivo de origen MP4, WebM o MOV/i);

  assert.match(ugcSource, /elementos UGC necesitan un archivo de origen/i);
  assert.match(ugcSource, /imágenes UGC deben usar un archivo de origen JPG, PNG, WebP o GIF/i);
  assert.match(ugcSource, /vídeos UGC deben usar un archivo de origen MP4, WebM o MOV/i);
  assert.match(ugcSource, /imágenes UGC no deben conservar un valor de póster/i);
  assert.match(ugcSource, /descripción(?: de)? UGC debe tener como máximo dos frases/i);

  assert.doesNotMatch(orbitSource, /Orbit media requires a source file\./);
  assert.doesNotMatch(orbitSource, /Orbit images must use/);
  assert.doesNotMatch(orbitSource, /Orbit videos must use/);
  assert.doesNotMatch(ugcSource, /UGC items require a source file\./);
  assert.doesNotMatch(ugcSource, /UGC images must use/);
  assert.doesNotMatch(ugcSource, /UGC videos must use/);
  assert.doesNotMatch(ugcSource, /UGC images should not keep a poster value\./);
  assert.doesNotMatch(ugcSource, /UGC description must stay within two sentences/);
});

test('AdminTranslationArsenalEditor collection controls and help copy are in Spanish', async () => {
  const source = await readSource('src/components/admin/AdminTranslationArsenalEditor.tsx');

  assert.match(source, /legend="Etiqueta"/);
  assert.match(source, /legend="Nivel"/);
  assert.match(source, />Grupo<\/span>/);
  assert.match(source, />\s*Guardar\s*<\/button>/);
  assert.match(source, />\s*Cancelar\s*<\/button>/);
  assert.match(source, /↑ Subir/);
  assert.match(source, /↓ Bajar/);
  assert.match(source, />Hecho<\/button>/);
  assert.match(source, />\s*Quitar\s*<\/button>/);
  assert.match(source, />Cambiar logo<\/span>/);
  assert.match(source, /\+ Añadir idioma/);
  assert.match(source, /Añadir herramienta/);
  assert.match(source, /\+ Añadir habilidad/);
  assert.match(source, /aria-label=\{`Editar /);
  assert.match(source, /Traducción \/ localización/);
  assert.match(source, /SEO \/ contenido/);
  assert.match(source, /Completa los valores en ES\/EN\/FR antes de añadir este elemento\./);
  assert.match(source, /Completa los niveles en ES\/EN\/FR antes de añadir este idioma\./);
  assert.match(source, /Selecciona un logo antes de añadir esta herramienta\./);
  assert.match(source, /No se pudo añadir este elemento\./);
  assert.match(source, /No se pudo cambiar este logo\./);

  assert.doesNotMatch(source, />\s*Save\s*<\/button>/);
  assert.doesNotMatch(source, />\s*Cancel\s*<\/button>/);
  assert.doesNotMatch(source, />\s*Done\s*<\/button>/);
  assert.doesNotMatch(source, />\s*Remove\s*<\/button>/);
  assert.doesNotMatch(source, /\+ Add language/);
  assert.doesNotMatch(source, /\+ Add tool/);
  assert.doesNotMatch(source, /\+ Add skill/);
  assert.doesNotMatch(source, /Complete ES\/EN\/FR values before adding this item\./);
  assert.doesNotMatch(source, /Complete ES\/EN\/FR levels before adding this language\./);
  assert.doesNotMatch(source, /Select a logo before adding this tool\./);
  assert.doesNotMatch(source, /Could not add this item\./);
  assert.doesNotMatch(source, /Could not replace this logo\./);

  // Level test: /level/i still matches via code identifiers (item.level,
  // addLevelFields) even though the visible legend text is translated — the
  // arsenal editor should not translate source-code identifiers.
  assert.match(source, /addLevelFields/);
});

test('EditableOrbitCollection chrome, help text, and media controls are in Spanish', async () => {
  const source = await readSource('src/components/admin/EditableOrbitCollection.tsx');

  assert.match(source, /Colección del orbit/);
  assert.match(source, /Añadir elemento al orbit/);
  assert.match(source, /Elemento \{index \+ 1\} de \{orbitMedia\.length\}/);
  assert.match(source, /Cambiar vídeo/);
  assert.match(source, /Cambiar imagen/);
  assert.match(source, /Sube un MP4\/WebM\/MOV/);
  assert.match(source, /Sube un JPG\/PNG\/WebP\/GIF/);
  assert.match(source, /Tipo de contenido/);
  assert.match(source, />Imagen<\/option>/);
  assert.match(source, />Vídeo<\/option>/);
  assert.match(source, /Enlace interno/);
  assert.match(source, /Cambiar póster/);
  assert.match(source, /Póster obligatorio/);
  assert.match(source, /Póster del vídeo/);
  assert.match(source, /necesitan una imagen de póster/i);
  assert.match(source, /Etiqueta \{language\.label\}/);

  assert.doesNotMatch(source, />Orbit collection<\/p>/);
  assert.doesNotMatch(source, /Add orbit item/);
  assert.doesNotMatch(source, /Change video/);
  assert.doesNotMatch(source, /Change image/);
  assert.doesNotMatch(source, /Upload MP4\/WebM\/MOV/);
  assert.doesNotMatch(source, /Upload JPG\/PNG\/WebP\/GIF/);
  assert.doesNotMatch(source, /Media type/);
  assert.doesNotMatch(source, /Internal href/);
  assert.doesNotMatch(source, /Change poster/);
  assert.doesNotMatch(source, /Poster required/);
  assert.doesNotMatch(source, /Video poster/);
});

test('EditableUgcPortfolio chrome, help text, and media controls are in Spanish', async () => {
  const source = await readSource('src/components/admin/EditableUgcPortfolio.tsx');

  assert.match(source, /Editor del portfolio UGC/);
  assert.match(source, /Espacio \{index \+ 1\} de \{items\.length\}/);
  assert.match(source, />Categoría<\/span>/);
  assert.match(source, />Viajes<\/option>/);
  assert.match(source, />Idiomas<\/option>/);
  assert.match(source, />Arte<\/option>/);
  assert.match(source, />Tipo<\/span>/);
  assert.match(source, /Espacio fijo/);
  assert.match(source, /Quitar póster/);
  assert.match(source, /solo aparece cuando el espacio es de tipo vídeo/i);
  assert.match(source, /label: 'Etiqueta'/);
  assert.match(source, /label: 'Título'/);
  assert.match(source, /label: 'Descripción'/);
  assert.match(source, /label: 'Formato'/);

  assert.doesNotMatch(source, />UGC portfolio editor<\/p>/);
  assert.doesNotMatch(source, /Slot \{index/);
  assert.doesNotMatch(source, />Category<\/span>/);
  assert.doesNotMatch(source, />Travel<\/option>/);
  assert.doesNotMatch(source, />Languages<\/option>/);
  assert.doesNotMatch(source, />Art<\/option>/);
  assert.doesNotMatch(source, />Type<\/span>/);
  assert.doesNotMatch(source, /Fixed slot/);
  assert.doesNotMatch(source, />Clear poster<\/button>/);
  assert.doesNotMatch(source, /Poster upload appears only/);
  assert.doesNotMatch(source, /label: 'Label'/);
  assert.doesNotMatch(source, /label: 'Title'/);
  assert.doesNotMatch(source, /label: 'Description'/);
  assert.doesNotMatch(source, /label: 'Format'/);
});

test('BlogPostForm field labels, help, validation, and actions are in Spanish', async () => {
  const source = await readSource('src/components/admin/BlogPostForm.tsx');

  assert.match(source, />Título<\/label>/);
  assert.match(source, />Descripción<\/label>/);
  assert.match(source, />Fecha<\/label>/);
  assert.match(source, />Idioma<\/label>/);
  assert.match(source, /Etiquetas \(separadas por comas\)/);
  assert.match(source, />Imagen destacada<\/label>/);
  assert.match(source, /JPEG, PNG, WebP o GIF/);
  assert.match(source, /Quitar imagen/);
  assert.match(source, /Sección H2/);
  assert.match(source, /Subsección H3/);
  assert.match(source, />Negrita<\/button>/);
  assert.match(source, />Enlace<\/button>/);
  assert.match(source, /Cuerpo en Markdown/);
  assert.match(source, /Índice en vivo/);
  assert.match(source, /Completa el título, la descripción y el cuerpo antes de publicar\./);
  assert.match(source, /Las entradas de blog solo se pueden crear en ES, EN o FR\./);
  assert.match(source, /No se pudo crear la entrada\./);
  assert.match(source, /Publica el sitio para reconstruir el blog\./);
  assert.match(source, /Netlify Git Gateway/);
  assert.match(source, /\{isSubmitting \? 'Creando…' : 'Crear entrada'\}/);

  assert.doesNotMatch(source, />Title<\/label>/);
  assert.doesNotMatch(source, />Description<\/label>/);
  assert.doesNotMatch(source, />Date<\/label>/);
  assert.doesNotMatch(source, />Language<\/label>/);
  assert.doesNotMatch(source, /Tags \(comma separated\)/);
  assert.doesNotMatch(source, />Featured image<\/label>/);
  assert.doesNotMatch(source, /Remove image/);
  assert.doesNotMatch(source, />H2 Section<\/button>/);
  assert.doesNotMatch(source, />H3 Subsection<\/button>/);
  assert.doesNotMatch(source, />Markdown body<\/label>/);
  assert.doesNotMatch(source, /Live outline/);
  assert.doesNotMatch(source, /Complete title, description, and body before publishing\./);
  assert.doesNotMatch(source, /Could not create the post\./);
  assert.doesNotMatch(source, /Publish the site to rebuild the blog\./);
  assert.doesNotMatch(source, />Create post<\/button>/);
});

test('media upload alerts on EditableImage/EditableMedia/AdminBrandVideo are in Spanish', async () => {
  const [imageSource, mediaSource, brandVideoSource] = await Promise.all([
    readSource('src/components/admin/EditableImage.tsx'),
    readSource('src/components/admin/EditableMedia.tsx'),
    readSource('src/components/admin/AdminBrandVideo.tsx'),
  ]);

  assert.match(imageSource, /Usa formato JPG, PNG, WebP, GIF o SVG/);
  assert.match(imageSource, /Cambiar imagen/);
  assert.doesNotMatch(imageSource, /Use JPG, PNG, WebP, GIF, or SVG format/);

  assert.match(mediaSource, /Cambiar contenido/);
  assert.match(mediaSource, /No se pudo guardar este archivo multimedia\./);
  assert.doesNotMatch(mediaSource, /Could not save this media file\./);

  assert.match(brandVideoSource, /Cambiar vídeo/);
  assert.match(brandVideoSource, /Sube un MP4\/WebM\/MOV/);
  assert.doesNotMatch(brandVideoSource, /Upload MP4\/WebM\/MOV/);
});

test('admin page headings and descriptions (ugc, blog/new, index) are in Spanish', async () => {
  const [ugcSource, blogNewSource, indexSource] = await Promise.all([
    readSource('src/pages/admin/ugc.astro'),
    readSource('src/pages/admin/blog/new.astro'),
    readSource('src/pages/admin/index.astro'),
  ]);

  assert.match(ugcSource, /Portfolio UGC de 12 espacios fijos/);
  assert.doesNotMatch(ugcSource, /Fixed 12-slot UGC portfolio/);

  assert.match(blogNewSource, /description="Crear una nueva entrada de blog"/);
  assert.doesNotMatch(blogNewSource, /description="Create a new blog post"/);

  assert.match(indexSource, /alt="Pegatina 1"/);
  assert.match(indexSource, /alt="Pegatina 4"/);
  assert.doesNotMatch(indexSource, /alt="Sticker 1"/);
});

test('the curated list of known English admin operational phrases is entirely absent from the fixed admin surface', async () => {
  const sources = await readFixedAdminSurfaceSources();
  const combined = Array.from(sources.values()).join('\n---FILE---\n');

  // Curated, non-arbitrary list of full operational phrases that existed in
  // English before this translation. This intentionally excludes ambiguous
  // single words, code identifiers, MIME types, brand names, and locale
  // language names (English/Français stay as native-name labels).
  const bannedEnglishPhrases = [
    'Save draft',
    'Publish changes',
    'Publishing...',
    'Exit editor',
    'Navigation labels',
    'Public language picker',
    'Fix the orbit warnings before publishing.',
    'Published! Rebuilds in ~2 min.',
    'Draft saved locally.',
    'Draft could not be saved locally',
    'Login required before publishing.',
    'Login required before creating blog posts.',
    'Blog posts can only be created in ES, EN, or FR.',
    'A slug is required.',
    'Featured image must be a JPEG, PNG, WebP, or GIF file.',
    'Admin session expired. Sign out',
    'Failed to create ',
    'Failed to publish ',
    'Failed to load ',
    'Tool logos must use JPG, PNG, WebP, GIF, or SVG format.',
    'Tool logos must be 2MB or smaller.',
    'Skill group is required and must be translation or seo.',
    'Use MP4, WebM, or QuickTime format.',
    'Use JPG, PNG, WebP, or GIF format.',
    'Images must be 2MB or smaller.',
    'Videos must be 8MB or smaller.',
    'Orbit media requires a source file.',
    'Orbit videos require a poster image.',
    'UGC items require a source file.',
    'UGC videos require a poster image.',
    'needs Spanish, English, and French values.',
    'Complete ES/EN/FR values before adding this item.',
    'Select a logo before adding this tool.',
    'Could not add this item.',
    'Could not replace this logo.',
    'Could not save this media file.',
    '+ Add language',
    '+ Add tool',
    '+ Add skill',
    'Change video',
    'Change image',
    'Change poster',
    'Upload MP4/WebM/MOV',
    'Upload JPG/PNG/WebP/GIF',
    'Poster required',
    'Orbit collection',
    'UGC portfolio editor',
    'Fixed slot',
    'Clear poster',
    'Media type',
    'Internal href',
    'Video poster',
    'Markdown body',
    'Live outline',
    'Create post',
    'Featured image',
    'Remove image',
    'Could not create the post.',
    'Fixed 12-slot UGC portfolio',
    'Create a new blog post',
  ];

  const foundPhrases = bannedEnglishPhrases.filter((phrase) => combined.includes(phrase));

  assert.deepEqual(
    foundPhrases,
    [],
    `Found old English operational phrases still present in the admin surface: ${foundPhrases.join(', ')}`,
  );
});

test('ES/EN/FR locale codes and recognizable language names are preserved', async () => {
  const [toolbarSource, blogFormSource] = await Promise.all([
    readSource('src/components/admin/AdminToolbar.tsx'),
    readSource('src/components/admin/BlogPostForm.tsx'),
  ]);

  assert.match(toolbarSource, /'es'/);
  assert.match(toolbarSource, /'en'/);
  assert.match(toolbarSource, /'fr'/);
  assert.match(toolbarSource, /'de'/);
  assert.match(toolbarSource, /'it'/);
  assert.match(toolbarSource, /'ca'/);

  // Native language names in the blog language picker must stay recognizable.
  assert.match(blogFormSource, /Español/);
  assert.match(blogFormSource, /English/);
  assert.match(blogFormSource, /Français/);
});

test('no admin i18n framework or dependency was introduced', async () => {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
  readSourcePaths.add('package.json');
  const dependencyNames = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ];
  const i18nLibraryNames = dependencyNames.filter((name) => /i18next|react-intl|formatjs|lingui|polyglot/i.test(name));

  assert.deepEqual(i18nLibraryNames, [], 'no i18n framework/library dependency should be introduced for the admin interface');
});

test('this contract does not require any src/i18n/*.json changes to pass', () => {
  const i18nJsonReads = Array.from(readSourcePaths).filter((relativePath) => relativePath.startsWith('src/i18n/') && relativePath.endsWith('.json'));

  assert.deepEqual(
    i18nJsonReads,
    [],
    'the Spanish admin interface contract must not depend on src/i18n/*.json (editable public content) to pass',
  );
});
