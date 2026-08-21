import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';
import {
  createLocalizedText,
  validateOrbitMediaItem,
} from '../src/lib/orbitMedia.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

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

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

test('pending orbit upload previews stay display-only for validation and publish readiness', async () => {
  const restoreFileReader = installMockFileReader();
  const store = createStore();

  try {
    await store.setOrbitMediaFile(
      0,
      'src',
      new File([Buffer.from('image-binary')], 'tile.webp', { type: 'image/webp' }),
      '/images/site/pending-image.webp',
    );
    await store.setOrbitMediaFile(
      1,
      'src',
      new File([Buffer.from('video-binary')], 'tile.mp4', { type: 'video/mp4' }),
      '/images/site/pending-video.mp4',
    );
    await store.setOrbitMediaFile(
      1,
      'poster',
      new File([Buffer.from('poster-binary')], 'tile-poster.jpg', { type: 'image/jpeg' }),
      '/images/site/pending-video-poster.jpg',
    );

    const snapshot = store.getSnapshot();
    assert.deepEqual(snapshot.orbitValidationErrors, []);
    assert.match(snapshot.getOrbitMedia()[0].src, /^data:image\/webp;base64,/);
    assert.match(snapshot.getOrbitMedia()[1].src, /^data:video\/mp4;base64,/);
    assert.match(snapshot.getOrbitMedia()[1].poster ?? '', /^data:image\/jpeg;base64,/);

    const fetchCalls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init = {}) => {
      fetchCalls.push({ input: String(input), init });
      if (!init.method || init.method === 'GET') {
        return new Response(JSON.stringify({ sha: 'sha' }), {
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

    assert.equal(store.getSnapshot().publishError, '');
    assert.equal(store.getSnapshot().publishSuccess, true);
    assert.ok(fetchCalls.length > 0, 'valid pending uploads should allow publish to proceed');
  } finally {
    restoreFileReader();
  }
});

test('saving a draft strips pending upload binaries but preserves text and site metadata', async () => {
  const restoreFileReader = installMockFileReader();
  const store = createStore();
  let savedPayload = '';
  const restoreWindow = installWindow(createWindowStorage({
    setItem: (_key, value) => {
      savedPayload = value;
    },
  }));

  try {
    store.setText('home.hero.kicker', 'nuevo titular');
    store.updateOrbitMediaHref(0, '/ugc');
    store.updateOrbitMediaText(0, 'label', 'es', 'Etiqueta actualizada');

    await store.setImage(
      'heroMainPhoto',
      new File([Buffer.from('hero-binary')], 'hero.png', { type: 'image/png' }),
      'public/images/site/pending-hero.png',
    );
    await store.setOrbitMediaFile(
      0,
      'src',
      new File([Buffer.from('orbit-binary')], 'orbit.png', { type: 'image/png' }),
      '/images/site/pending-orbit.png',
    );

    store.saveDraft();

    assert.ok(savedPayload, 'draft should be written to localStorage');
    assert.doesNotMatch(savedPayload, /data:image\//);
    assert.doesNotMatch(savedPayload, /base64Content/);
    assert.doesNotMatch(savedPayload, /previewSrc/);

    const parsed = JSON.parse(savedPayload);
    assert.equal(parsed.i18n.es.home.hero.kicker, 'nuevo titular');
    assert.equal(parsed.images.orbitMedia[0].href, '/ugc');
    assert.equal(parsed.images.orbitMedia[0].label.es, 'Etiqueta actualizada');
    assert.equal(parsed.images.heroMainPhoto, '/images/site/original-hero.jpg');
    assert.equal(parsed.images.orbitMedia[0].src, '/images/site/original-image.jpg');
    assert.equal(parsed.pendingUploads.length, 2);
  } finally {
    restoreWindow();
    restoreFileReader();
  }
});

test('draft save and restore warn when pending uploads must be reselected', async () => {
  const restoreFileReader = installMockFileReader();
  const savingStore = createStore();
  let savedPayload = '';
  const restoreSavingWindow = installWindow(createWindowStorage({
    setItem: (_key, value) => {
      savedPayload = value;
    },
  }));

  try {
    await savingStore.setOrbitMediaFile(
      1,
      'poster',
      new File([Buffer.from('poster-binary')], 'poster.jpg', { type: 'image/jpeg' }),
      '/images/site/pending-video-poster.jpg',
    );
    savingStore.saveDraft();
    assert.match(savingStore.getSnapshot().draftMessage ?? '', /reselected after reload/i);
  } finally {
    restoreSavingWindow();
    restoreFileReader();
  }

  const restoreLoadingWindow = installWindow(createWindowStorage({
    getItem: () => savedPayload,
  }));
  const loadingStore = createStore();

  try {
    loadingStore.loadDraft();
    const snapshot = loadingStore.getSnapshot();
    assert.match(snapshot.draftMessage ?? '', /reselected before publishing/i);
    assert.equal(snapshot.getOrbitMedia()[1].poster, '/images/site/original-video-poster.jpg');
  } finally {
    restoreLoadingWindow();
  }
});

test('legacy drafts with persisted pending paths are scrubbed back to original assets on load', async () => {
  const legacyDraft = JSON.stringify({
    i18n: {
      es: { home: { hero: { kicker: 'borrador heredado' } } },
      en: { home: { hero: { kicker: 'hello' } } },
      fr: { home: { hero: { kicker: 'salut' } } },
    },
    images: {
      heroMainPhoto: '/images/site/pending-hero.png',
      orbitMedia: [
        {
          id: 'orbit-image',
          type: 'image',
          src: '/images/site/pending-orbit.png',
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
          poster: '/images/site/pending-video-poster.jpg',
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
    currentLang: 'es',
    pendingImages: {
      heroMainPhoto: {
        path: 'public/images/site/pending-hero.png',
        sitePath: '/images/site/pending-hero.png',
        previewSrc: 'data:image/png;base64,abc',
        base64Content: 'abc',
      },
      'orbit.orbit-image.src': {
        path: 'public/images/site/pending-orbit.png',
        sitePath: '/images/site/pending-orbit.png',
        previewSrc: 'data:image/png;base64,def',
        base64Content: 'def',
      },
      'orbit.orbit-video.poster': {
        path: 'public/images/site/pending-video-poster.jpg',
        sitePath: '/images/site/pending-video-poster.jpg',
        previewSrc: 'data:image/jpeg;base64,ghi',
        base64Content: 'ghi',
      },
    },
  });

  const restoreWindow = installWindow(createWindowStorage({
    getItem: () => legacyDraft,
  }));
  const store = createStore();

  try {
    store.loadDraft();
    const snapshot = store.getSnapshot();
    assert.equal(store.getText('home.hero.kicker'), 'borrador heredado');
    assert.equal(snapshot.getImageSrc('heroMainPhoto'), '/images/site/original-hero.jpg');
    assert.equal(snapshot.getOrbitMedia()[0].src, '/images/site/original-image.jpg');
    assert.equal(snapshot.getOrbitMedia()[1].poster, '/images/site/original-video-poster.jpg');
    assert.match(snapshot.draftMessage ?? '', /reselected before publishing/i);
  } finally {
    restoreWindow();
  }
});

test('draft save storage failures surface a clear error without dropping in-memory text changes', () => {
  const store = createStore();
  const quotaError = new Error('Quota exceeded');
  quotaError.name = 'QuotaExceededError';
  const restoreWindow = installWindow(createWindowStorage({
    setItem: () => {
      throw quotaError;
    },
  }));

  try {
    store.setText('home.hero.kicker', 'texto pendiente');
    assert.doesNotThrow(() => store.saveDraft());
    assert.equal(store.getText('home.hero.kicker'), 'texto pendiente');
    assert.match(store.getSnapshot().draftMessage ?? '', /copy.*before reloading/i);
  } finally {
    restoreWindow();
  }
});

test('localized orbit copy trims and falls back to Spanish while validation still requires ES EN and FR', async () => {
  const orbit = await import('../src/lib/orbitMedia.ts');

  assert.equal(
    orbit.getLocalizedOrbitText({ es: 'Etiqueta española', en: '   ', fr: 'Étiquette FR', de: '', it: '', ca: '' }, 'en'),
    'Etiqueta española',
  );
  assert.equal(
    orbit.getLocalizedOrbitText({ es: 'Alt español', en: 'Alt EN', fr: '   ', de: '   ', it: '', ca: '' }, 'de'),
    'Alt español',
  );
  assert.equal(
    orbit.getLocalizedOrbitText({ es: 'Etiqueta española', en: 'Alt EN', fr: ' Étiquette FR ', de: '', it: '', ca: '' }, 'fr'),
    'Étiquette FR',
  );

  assert.deepEqual(
    validateOrbitMediaItem({
      id: 'orbit-a11y',
      type: 'image',
      src: '/images/site/orbit-a11y.jpg',
      href: null,
      label: { es: 'Etiqueta', en: ' ', fr: '', de: ' ', it: ' ', ca: ' ' },
      alt: { es: 'Texto alternativo', en: '', fr: '   ', de: '', it: '', ca: '' },
      poster: null,
    }),
    [
      'Orbit label needs Spanish, English, and French values.',
      'Orbit alt needs Spanish, English, and French values.',
    ],
  );

  const orbitSource = await readSource('src/components/OvalMediaOrbit.tsx');
  assert.match(orbitSource, /const label = getLocalizedOrbitText\(item\.label, lang\);/);
  assert.match(orbitSource, /const alt = getLocalizedOrbitText\(item\.alt, lang\);/);
});
