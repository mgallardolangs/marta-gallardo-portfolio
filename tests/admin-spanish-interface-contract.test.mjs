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

function assertEnglishUiStringsAbsent(source, checks) {
  for (const [pattern, message] of checks) {
    assert.doesNotMatch(source, pattern, message);
  }
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

  assertEnglishUiStringsAbsent(source, [
    [/>\s*Navigation labels\s*<\/p>/, 'old English nav labels heading should be gone'],
    [/>\s*Public language picker\s*<\/p>/, 'old English public picker heading should be gone'],
    [/>\s*(?:💾\s*)?Save draft\s*<\/button>/, 'old English save draft copy should be gone'],
    [/'🚀 Publish changes'/, 'old English publish button copy should be gone'],
    [/'⏳ Publishing\.\.\.'/, 'old English in-flight publish state should be gone'],
    [/>\s*←\s*Exit editor\s*<\/a>/, 'old English exit copy should be gone'],
    [/>\s*⚠️\s*Fix the orbit warnings before publishing\.\s*<\/p>/, 'old English orbit warning should be gone'],
    [/>\s*✅\s*Published! Rebuilds in ~2 min\.\s*<\/p>/, 'old English publish success copy should be gone'],
  ]);
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

  assertEnglishUiStringsAbsent(source, [
    [/Login required before publishing\./, 'publish auth error should no longer be English'],
    [/Login required before creating blog posts\./, 'blog auth error should no longer be English'],
    [/Blog posts can only be created in ES, EN, or FR\./, 'blog locale rule should no longer be English'],
    [/^A slug is required\.$/m, 'slug validation should no longer be English'],
    [/Featured image must be a JPEG, PNG, WebP, or GIF file\./, 'featured image validation should no longer be English'],
    [/Admin session expired\. Sign out/, 'session expiry guidance should no longer be English'],
    [/Draft (could not be )?saved locally/, 'draft save copy should no longer be English'],
    [/Draft restored\. \d/, 'draft restore copy should no longer be English'],
    [/Failed to create /, 'create-file failure prefix should no longer be English'],
    [/Failed to publish /, 'publish-file failure prefix should no longer be English'],
    [/Failed to load /, 'load-file failure prefix should no longer be English'],
  ]);
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

  assertEnglishUiStringsAbsent(source, [
    [/requires ES\/EN\/FR/, 'ES/EN/FR field requirements should no longer be English'],
    [/requires a logo/, 'logo requirement should no longer be English'],
    [/requires a translation or seo group/, 'skill group requirement should no longer be English'],
    [/Skill group is required and must be translation or seo\./, 'full English skill-group error should be gone'],
    [/Tool logos must use JPG, PNG, WebP, GIF, or SVG format\./, 'tool logo format validation should no longer be English'],
    [/Tool logos must be 2MB or smaller\./, 'tool logo size validation should no longer be English'],
  ]);
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
  }

  assert.match(orbitSource, /elemento del orbit necesita un archivo de origen/i);
  assert.match(orbitSource, /imágenes del orbit deben usar un archivo de origen JPG, PNG, WebP, GIF o SVG/i);
  assert.match(orbitSource, /vídeos del orbit deben usar un archivo de origen MP4, WebM o MOV/i);
  assertEnglishUiStringsAbsent(orbitSource, [
    [/Use MP4, WebM, or QuickTime format\./, 'orbit video format helper should no longer be English'],
    [/Use JPG, PNG, WebP, or GIF format\./, 'orbit image format helper should no longer be English'],
    [/Images must be 2MB or smaller\./, 'orbit image size helper should no longer be English'],
    [/Videos must be 8MB or smaller\./, 'orbit video size helper should no longer be English'],
    [/Orbit media requires a source file\./, 'orbit source-file validation should no longer be English'],
    [/Orbit videos require a poster image\./, 'orbit poster validation should no longer be English'],
    [/needs Spanish, English, and French values\./, 'orbit localized-value validation should no longer be English'],
    [/Orbit images must use/, 'orbit image source validation should no longer be English'],
    [/Orbit videos must use/, 'orbit video source validation should no longer be English'],
  ]);

  assert.match(ugcSource, /elementos UGC necesitan un archivo de origen/i);
  assert.match(ugcSource, /imágenes UGC deben usar un archivo de origen JPG, PNG, WebP o GIF/i);
  assert.match(ugcSource, /vídeos UGC deben usar un archivo de origen MP4, WebM o MOV/i);
  assert.match(ugcSource, /imágenes UGC no deben conservar un valor de póster/i);
  assert.match(ugcSource, /descripción(?: de)? UGC debe tener como máximo dos frases/i);
  assertEnglishUiStringsAbsent(ugcSource, [
    [/Use MP4, WebM, or QuickTime format\./, 'UGC video format helper should no longer be English'],
    [/Use JPG, PNG, WebP, or GIF format\./, 'UGC image format helper should no longer be English'],
    [/Images must be 2MB or smaller\./, 'UGC image size helper should no longer be English'],
    [/Videos must be 8MB or smaller\./, 'UGC video size helper should no longer be English'],
    [/UGC items require a source file\./, 'UGC source-file validation should no longer be English'],
    [/UGC videos require a poster image\./, 'UGC poster validation should no longer be English'],
    [/needs Spanish, English, and French values\./, 'UGC localized-value validation should no longer be English'],
    [/UGC images must use/, 'UGC image source validation should no longer be English'],
    [/UGC videos must use/, 'UGC video source validation should no longer be English'],
    [/UGC images should not keep a poster value\./, 'UGC poster-clearing validation should no longer be English'],
    [/UGC description must stay within two sentences/, 'UGC description validation should no longer be English'],
  ]);
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

  assertEnglishUiStringsAbsent(source, [
    [/>\s*Save\s*<\/button>/, 'save button should no longer be English'],
    [/>\s*Cancel\s*<\/button>/, 'cancel button should no longer be English'],
    [/>\s*Done\s*<\/button>/, 'done button should no longer be English'],
    [/>\s*Remove\s*<\/button>/, 'remove button should no longer be English'],
    [/\+ Add language/, 'add-language control should no longer be English'],
    [/\+ Add tool/, 'add-tool control should no longer be English'],
    [/\+ Add skill/, 'add-skill control should no longer be English'],
    [/Complete ES\/EN\/FR values before adding this item\./, 'item validation copy should no longer be English'],
    [/Complete ES\/EN\/FR levels before adding this language\./, 'language validation copy should no longer be English'],
    [/Select a logo before adding this tool\./, 'logo validation copy should no longer be English'],
    [/Could not add this item\./, 'add-item error should no longer be English'],
    [/Could not replace this logo\./, 'replace-logo error should no longer be English'],
  ]);

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
  assert.match(source, /getLocalizedOrbitText\(item\.alt, 'es'\)\} póster/);
  assert.match(source, /Cambiar póster/);
  assert.match(source, /Póster obligatorio/);
  assert.match(source, /Póster del vídeo/);
  assert.match(source, /necesitan una imagen de póster/i);
  assert.match(source, /Etiqueta \{language\.label\}/);

  assertEnglishUiStringsAbsent(source, [
    [/>Orbit collection<\/p>/, 'orbit section heading should no longer be English'],
    [/Add orbit item/, 'add-orbit action should no longer be English'],
    [/Change video/, 'change-video action should no longer be English'],
    [/Change image/, 'change-image action should no longer be English'],
    [/Upload MP4\/WebM\/MOV/, 'video upload hint should no longer be English'],
    [/Upload JPG\/PNG\/WebP\/GIF/, 'image upload hint should no longer be English'],
    [/Media type/, 'media type label should no longer be English'],
    [/Internal href/, 'internal link label should no longer be English'],
    [/Change poster/, 'change-poster action should no longer be English'],
    [/Poster required/, 'poster-required label should no longer be English'],
    [/getLocalizedOrbitText\(item\.alt, 'es'\)\} poster/, 'poster accessibility label should no longer be English'],
    [/Video poster/, 'video poster label should no longer be English'],
  ]);
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
  assert.match(source, /item\.alt\.es\} póster/);
  assert.match(source, /Quitar póster/);
  assert.match(source, /solo aparece cuando el espacio es de tipo vídeo/i);
  assert.match(source, /label: 'Etiqueta'/);
  assert.match(source, /label: 'Título'/);
  assert.match(source, /label: 'Descripción'/);
  assert.match(source, /label: 'Formato'/);

  assertEnglishUiStringsAbsent(source, [
    [/>UGC portfolio editor<\/p>/, 'UGC editor heading should no longer be English'],
    [/Slot \{index/, 'slot heading should no longer be English'],
    [/>Category<\/span>/, 'category label should no longer be English'],
    [/>Travel<\/option>/, 'travel category should no longer be English'],
    [/>Languages<\/option>/, 'languages category should no longer be English'],
    [/>Art<\/option>/, 'art category should no longer be English'],
    [/>Type<\/span>/, 'type label should no longer be English'],
    [/Fixed slot/, 'fixed-slot label should no longer be English'],
    [/>Clear poster<\/button>/, 'clear-poster action should no longer be English'],
    [/item\.alt\.es\} poster/, 'poster accessibility label should no longer be English'],
    [/Poster upload appears only/, 'poster helper copy should no longer be English'],
    [/label: 'Label'/, 'label metadata should no longer be English'],
    [/label: 'Title'/, 'title metadata should no longer be English'],
    [/label: 'Description'/, 'description metadata should no longer be English'],
    [/label: 'Format'/, 'format metadata should no longer be English'],
  ]);
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

  assertEnglishUiStringsAbsent(source, [
    [/>Title<\/label>/, 'title label should no longer be English'],
    [/>Description<\/label>/, 'description label should no longer be English'],
    [/>Date<\/label>/, 'date label should no longer be English'],
    [/>Language<\/label>/, 'language label should no longer be English'],
    [/Tags \(comma separated\)/, 'tags helper should no longer be English'],
    [/>Featured image<\/label>/, 'featured image label should no longer be English'],
    [/Remove image/, 'remove-image action should no longer be English'],
    [/>H2 Section<\/button>/, 'H2 toolbar label should no longer be English'],
    [/>H3 Subsection<\/button>/, 'H3 toolbar label should no longer be English'],
    [/>Markdown body<\/label>/, 'markdown body label should no longer be English'],
    [/Live outline/, 'outline panel label should no longer be English'],
    [/Complete title, description, and body before publishing\./, 'publish validation should no longer be English'],
    [/Could not create the post\./, 'create-post error should no longer be English'],
    [/Publish the site to rebuild the blog\./, 'rebuild helper should no longer be English'],
    [/>Create post<\/button>/, 'create-post action should no longer be English'],
  ]);
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
  assertEnglishUiStringsAbsent(mediaSource, [
    [/Could not save this media file\./, 'editable media save error should no longer be English'],
  ]);

  assert.match(brandVideoSource, /Cambiar vídeo/);
  assert.match(brandVideoSource, /Sube un MP4\/WebM\/MOV/);
  assertEnglishUiStringsAbsent(brandVideoSource, [
    [/Upload MP4\/WebM\/MOV/, 'brand video upload hint should no longer be English'],
  ]);
});

test('admin page headings and descriptions (ugc, blog/new) are in Spanish', async () => {
  const [ugcSource, blogNewSource] = await Promise.all([
    readSource('src/pages/admin/ugc.astro'),
    readSource('src/pages/admin/blog/new.astro'),
  ]);

  assert.match(ugcSource, /Portfolio UGC de 12 espacios fijos/);
  assert.match(ugcSource, /Actualiza el contenido multimedia y el texto en ES \/ EN \/ FR/);
  assertEnglishUiStringsAbsent(ugcSource, [
    [/Fixed 12-slot UGC portfolio/, 'UGC page heading should no longer be English'],
  ]);

  assert.match(blogNewSource, /description="Crear una nueva entrada de blog"/);
  assert.match(blogNewSource, />Admin — Nuevo post<\/h1>/);
  assert.match(blogNewSource, /Volver al archivo/);
  assertEnglishUiStringsAbsent(blogNewSource, [
    [/description="Create a new blog post"/, 'blog-new page description should no longer be English'],
    [/>Admin — New post<\/h1>/, 'blog-new page heading should no longer be English'],
    [/Back to archive/, 'blog-new back-link copy should no longer be English'],
  ]);
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
