import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';
import {
  ORBIT_IMAGE_MAX_BYTES,
  ORBIT_VIDEO_MAX_BYTES,
  validateOrbitMediaItem,
  validateOrbitMediaUpload,
} from '../src/lib/orbitMedia.ts';
import {
  validateUgcMediaUpload,
  validateUgcPortfolioItem,
} from '../src/lib/ugcPortfolio.ts';
import { toEmbedUrl, toHttpsEmbedUrl } from '../src/lib/videoEmbed.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

function createStore(imageOverrides = {}) {
  const store = new AdminStore();
  store.init(
    { es: {}, en: {}, fr: {}, de: {}, it: {}, ca: {} },
    {
      heroMainPhoto: '',
      galleryCutouts: {},
      videoPlaceholderOrEmbedUrl: '',
      ugcHeaderImage: '',
      instagramScreenshot: '',
      socialLinks: { linkedin: '', instagram: '' },
      publicLanguagePicker: ['es', 'en', 'fr'],
      nicheBackgrounds: {},
      ugcVideos: { travel: [], languages: [], art: [] },
      ugcPhotos: { travel: [], languages: [], art: [], all: [] },
      nicheIcons: { travel: '', languages: '', art: '' },
      aboutPhotos: [],
      brandVideo: '',
      brandVideoEmbedUrl: '',
      orbitMedia: [
        {
          id: 'orbit-video',
          type: 'video',
          src: '/images/site/orbit-video.mp4',
          poster: '/images/site/orbit-video-poster.jpg',
          href: null,
          alt: { es: 'Alt ES', en: 'Alt EN', fr: 'Alt FR', de: 'Alt ES', it: 'Alt ES', ca: 'Alt ES' },
          label: { es: 'Label ES', en: 'Label EN', fr: 'Label FR', de: 'Label ES', it: 'Label ES', ca: 'Label ES' },
        },
        {
          id: 'orbit-image',
          type: 'image',
          src: '/images/site/orbit-image.jpg',
          poster: null,
          href: null,
          alt: { es: 'Image ES', en: 'Image EN', fr: 'Image FR', de: 'Image ES', it: 'Image ES', ca: 'Image ES' },
          label: { es: 'Image label ES', en: 'Image label EN', fr: 'Image label FR', de: 'Image label ES', it: 'Image label ES', ca: 'Image label ES' },
        },
      ],
      ugcPortfolio: [
        {
          id: 'ugc-video',
          category: 'travel',
          type: 'video',
          src: '/images/ugc/ugc-video.mp4',
          poster: '/images/ugc/ugc-video-poster.jpg',
          embedUrl: null,
          label: { es: 'UGC ES', en: 'UGC EN', fr: 'UGC FR', de: 'UGC ES', it: 'UGC ES', ca: 'UGC ES' },
          title: { es: 'Title ES', en: 'Title EN', fr: 'Title FR', de: 'Title ES', it: 'Title ES', ca: 'Title ES' },
          description: { es: 'Desc ES', en: 'Desc EN', fr: 'Desc FR', de: 'Desc ES', it: 'Desc ES', ca: 'Desc ES' },
          format: { es: 'Format ES', en: 'Format EN', fr: 'Format FR', de: 'Format ES', it: 'Format ES', ca: 'Format ES' },
          alt: { es: 'Alt ES', en: 'Alt EN', fr: 'Alt FR', de: 'Alt ES', it: 'Alt ES', ca: 'Alt ES' },
        },
        {
          id: 'ugc-image',
          category: 'art',
          type: 'image',
          src: '/images/ugc/ugc-image.jpg',
          poster: null,
          embedUrl: null,
          label: { es: 'UGC image ES', en: 'UGC image EN', fr: 'UGC image FR', de: 'UGC image ES', it: 'UGC image ES', ca: 'UGC image ES' },
          title: { es: 'Image title ES', en: 'Image title EN', fr: 'Image title FR', de: 'Image title ES', it: 'Image title ES', ca: 'Image title ES' },
          description: { es: 'Image desc ES', en: 'Image desc EN', fr: 'Image desc FR', de: 'Image desc ES', it: 'Image desc ES', ca: 'Image desc ES' },
          format: { es: 'Image format ES', en: 'Image format EN', fr: 'Image format FR', de: 'Image format ES', it: 'Image format ES', ca: 'Image format ES' },
          alt: { es: 'Image alt ES', en: 'Image alt EN', fr: 'Image alt FR', de: 'Image alt ES', it: 'Image alt ES', ca: 'Image alt ES' },
        },
      ],
      arsenal: { languages: [], tools: [], skills: [] },
      person: { name: 'Marta', location: 'Elche', socialProfiles: { linkedin: '', instagram: '' } },
      ...imageOverrides,
    },
    'es',
    'token',
  );

  return store;
}

function localized(seed) {
  return {
    es: `${seed} ES`,
    en: `${seed} EN`,
    fr: `${seed} FR`,
    de: `${seed} ES`,
    it: `${seed} ES`,
    ca: `${seed} ES`,
  };
}

function createUgcVideoItem(overrides = {}) {
  return {
    id: 'ugc-video',
    category: 'travel',
    type: 'video',
    src: '/images/ugc/ugc-video.mp4',
    poster: '/images/ugc/ugc-video-poster.jpg',
    embedUrl: null,
    label: localized('Label'),
    title: localized('Title'),
    description: localized('Description'),
    format: localized('Format'),
    alt: localized('Alt'),
    ...overrides,
  };
}

function createUgcImageItem(overrides = {}) {
  return {
    id: 'ugc-image',
    category: 'art',
    type: 'image',
    src: '/images/ugc/ugc-image.jpg',
    poster: null,
    embedUrl: null,
    label: localized('Image label'),
    title: localized('Image title'),
    description: localized('Image description'),
    format: localized('Image format'),
    alt: localized('Image alt'),
    ...overrides,
  };
}

function createOrbitVideoItem(overrides = {}) {
  return {
    id: 'orbit-video',
    type: 'video',
    src: '/images/site/orbit-video.mp4',
    poster: '/images/site/orbit-video-poster.jpg',
    href: null,
    embedUrl: null,
    label: localized('Orbit label'),
    alt: localized('Orbit alt'),
    ...overrides,
  };
}

test('media embed contracts expose optional embed URLs and admin bindings', async () => {
  const [siteSource, hookSource] = await Promise.all([
    readSource('src/lib/siteData.ts'),
    readSource('src/components/admin/useAdminStore.ts'),
  ]);

  assert.match(siteSource, /export type OrbitMedia = \{[\s\S]*embedUrl\?\: string \| null;[\s\S]*\}/);
  assert.match(siteSource, /export type UgcPortfolioItem = \{[\s\S]*embedUrl\?\: string \| null;[\s\S]*\}/);
  assert.match(hookSource, /setOrbitMediaEmbedUrl:\s*adminStore\.setOrbitMediaEmbedUrl\.bind\(adminStore\)/);
  assert.match(hookSource, /setUgcPortfolioEmbedUrl:\s*adminStore\.setUgcPortfolioEmbedUrl\.bind\(adminStore\)/);
});

test('video embed editors use the shared compact admin control for video items only', async () => {
  const [sharedSource, brandSource, ugcSource, orbitSource] = await Promise.all([
    readSource('src/components/admin/EditableVideoEmbed.tsx'),
    readSource('src/components/admin/AdminBrandVideo.tsx'),
    readSource('src/components/admin/EditableUgcPortfolio.tsx'),
    readSource('src/components/admin/EditableOrbitCollection.tsx'),
  ]);

  assert.match(sharedSource, /import \{ toEmbedUrl \} from '\.\.\/\.\.\/lib\/videoEmbed';/);
  assert.match(sharedSource, /export const VIDEO_EMBED_LABEL =\n  'Enlace o código para incrustar \(YouTube, Vimeo, Instagram, TikTok…\) para vídeos en alta calidad';/);
  assert.match(sharedSource, /label = VIDEO_EMBED_LABEL,/);
  assert.match(sharedSource, /value:\s*string \| null \| undefined;/);
  assert.match(sharedSource, /onChange:\s*\(value:\s*string\)\s*=>\s*void;/);
  assert.match(sharedSource, /placeholder="Pega el enlace del vídeo o el código <iframe>"/);
  assert.match(sharedSource, /onChange=\{\(event\) => onChange\(event\.target\.value\.trim\(\)\)\}/);
  assert.match(sharedSource, /title="Vista previa del vídeo incrustado"/);
  assert.match(sharedSource, /loading="lazy"/);
  assert.match(sharedSource, /accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share/);
  assert.match(sharedSource, /allowFullScreen/);
  assert.match(sharedSource, /Pega un enlace válido \(http o https\) o un código para incrustar\./);
  assert.match(sharedSource, /Quitar enlace y usar archivo subido/);
  assert.doesNotMatch(sharedSource, /absolute inset-0/);

  assert.match(brandSource, /import \{ VIDEO_EMBED_LABEL \} from '\.\/EditableVideoEmbed';/);
  assert.match(brandSource, /htmlFor="brand-video-embed-url"/);
  assert.match(brandSource, /id="brand-video-embed-url"/);
  assert.match(brandSource, /<label[\s\S]*htmlFor="brand-video-embed-url"[\s\S]*\{VIDEO_EMBED_LABEL\}[\s\S]*<\/label>/);
  assert.match(brandSource, /placeholder="Pega el enlace del vídeo o el código <iframe>"/);

  assert.match(ugcSource, /import EditableVideoEmbed, \{ VIDEO_EMBED_LABEL \} from '\.\/EditableVideoEmbed';/);
  assert.match(ugcSource, /item\.type === 'video' \?[\s\S]*<EditableVideoEmbed/);
  assert.match(ugcSource, /value=\{item\.embedUrl\}/);
  assert.match(ugcSource, /label=\{VIDEO_EMBED_LABEL\}/);
  assert.match(ugcSource, /onChange=\{\(value\) => store\.setUgcPortfolioEmbedUrl\(item\.id, value\)\}/);

  assert.match(orbitSource, /import EditableVideoEmbed, \{ VIDEO_EMBED_LABEL \} from '\.\/EditableVideoEmbed';/);
  assert.match(orbitSource, /item\.type === 'video' &&[\s\S]*<EditableVideoEmbed/);
  assert.match(orbitSource, /value=\{item\.embedUrl\}/);
  assert.match(orbitSource, /label=\{VIDEO_EMBED_LABEL\}/);
  assert.match(orbitSource, /onChange=\{\(value\) => store\.setOrbitMediaEmbedUrl\(index, value\)\}/);

  assert.match(ugcSource, /VIDEO_EMBED_LABEL/);
  assert.match(orbitSource, /VIDEO_EMBED_LABEL/);
  assert.match(
    sharedSource,
    /<label className="flex flex-col gap-2 text-sm text-ink">[\s\S]*<input[\s\S]*placeholder="Pega el enlace del vídeo o el código <iframe>"[\s\S]*<\/label>/,
  );
  assert.match(
    sharedSource,
    /<iframe[\s\S]*title="Vista previa del vídeo incrustado"[\s\S]*allowFullScreen/,
  );
  assert.match(
    sharedSource,
    /<button[\s\S]*Quitar enlace y usar archivo subido/,
  );
  assert.match(
    sharedSource,
    /<span className="text-\[0\.68rem\] font-semibold uppercase tracking-\[0\.28em\] text-ink\/52">\{label\}<\/span>/,
  );
});

test('ugc focused dialog prioritizes valid embeds and preserves local poster paths', async () => {
  const [ugcSource, orbitSource, adminPreviewSource] = await Promise.all([
    readSource('src/components/UgcContactSheet.tsx'),
    readSource('src/components/OvalMediaOrbit.tsx'),
    readSource('src/components/admin/AdminOrbitPreview.tsx'),
  ]);
  const focusedEmbedBlock = ugcSource.match(/\{activeItem\.type === 'video' && activeEmbedUrl \? \(\s*(<iframe[\s\S]*?\/>)\s*\)/)?.[1];

  assert.match(ugcSource, /import \{ toEmbedUrl, toHttpsEmbedUrl \} from '\.\.\/lib\/videoEmbed';/);
  assert.match(
    ugcSource,
    /const activeEmbedUrl = activeItem && activeItem\.type === 'video'\s*\?\s*\(adminPreview\s*\?\s*toEmbedUrl\(activeItem\.embedUrl\)\s*:\s*toHttpsEmbedUrl\(activeItem\.embedUrl\)\)\s*:\s*null;/,
  );
  assert.match(
    ugcSource,
    /className="aspect-\[9\/16\] w-full max-w-sm overflow-hidden bg-paper"/,
  );
  assert.ok(focusedEmbedBlock, 'UGC dialog should render an iframe block when a valid embed URL exists');
  assert.match(
    focusedEmbedBlock,
    /src=\{activeEmbedUrl\}[\s\S]*title=\{localize\(activeItem\.title, lang\)\}[\s\S]*loading="lazy"[\s\S]*allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"[\s\S]*allowFullScreen[\s\S]*className="h-full w-full border-0"/,
  );
  assert.doesNotMatch(
    focusedEmbedBlock,
    /tabIndex=\{-1\}/,
    'UGC dialog embeds should stay keyboard reachable for third-party player controls',
  );
  assert.ok(
    /tabIndex=\{0\}/.test(focusedEmbedBlock) || !/tabIndex=\{/.test(focusedEmbedBlock),
    'UGC dialog embeds should either opt into tabIndex={0} or omit tabIndex so iframe players remain focusable',
  );
  assert.match(
    ugcSource,
    /ref=\{closeButtonRef\}[\s\S]*\{copy\.close\}[\s\S]*<iframe[\s\S]*aria-label=\{copy\.previous\}[\s\S]*aria-label=\{copy\.next\}/,
    'UGC dialog should keep the close, previous, and next controls in the modal focus order around the focused iframe',
  );
  assert.match(
    ugcSource,
    /:\s*activeItem\.type === 'video' \? \(\s*<video[\s\S]*ref=\{focusedVideoRef\}[\s\S]*src=\{activeItem\.src\}[\s\S]*poster=\{activeItem\.poster \? netlifyImage\(activeItem\.poster, \{ width: 1200 \}\) : undefined\}[\s\S]*loop[\s\S]*playsInline[\s\S]*preload="metadata"[\s\S]*tabIndex=\{0\}[\s\S]*onClick=\{handleDialogVideoClick\}[\s\S]*className="h-full w-full cursor-pointer object-cover"/,
  );
  assert.match(
    ugcSource,
    /\{item\.type === 'video' \? \(\s*<video[\s\S]*src=\{item\.src\}[\s\S]*poster=\{item\.poster \? netlifyImage\(item\.poster, \{ width: 600 \}\) : undefined\}[\s\S]*preload="metadata"/,
  );

  assert.doesNotMatch(orbitSource, /toEmbedUrl|<iframe/);
  assert.match(
    orbitSource,
    /<video[\s\S]*src=\{item\.src\}[\s\S]*poster=\{item\.poster \?\? undefined\}/,
  );

  assert.match(
    adminPreviewSource,
    /function getPreviewSrc\(item: OrbitMedia\) \{\s*return item\.type === 'video' \? \(item\.poster \?\? ''\) : item\.src;\s*\}/,
  );
});

test('ugc validation accepts valid embeds without requiring a local video source', () => {
  const blankSourceItem = createUgcVideoItem({
    src: '',
    embedUrl: 'https://player.example.com/embed/video',
  });
  const httpSourceItem = createUgcVideoItem({
    src: '',
    embedUrl: 'http://player.example.com/embed/video',
  });
  const invalidExtensionItem = createUgcVideoItem({
    src: '/images/ugc/not-a-video.txt',
    embedUrl: '<iframe src="https://player.example.com/embed/video"></iframe>',
  });

  assert.equal(toEmbedUrl(blankSourceItem.embedUrl), 'https://player.example.com/embed/video');
  assert.equal(toEmbedUrl(httpSourceItem.embedUrl), 'http://player.example.com/embed/video');
  assert.deepEqual(validateUgcPortfolioItem(blankSourceItem), []);
  assert.deepEqual(validateUgcPortfolioItem(httpSourceItem), []);
  assert.deepEqual(validateUgcPortfolioItem(invalidExtensionItem), []);
});

test('ugc validation keeps poster and local source rules when embed input is missing or unsafe', () => {
  const unsafeEmbedItem = createUgcVideoItem({
    src: '/images/ugc/not-a-video.txt',
    embedUrl: 'javascript:alert(1)',
    poster: '',
  });
  const emptyEmbedItem = createUgcVideoItem({
    src: '',
    embedUrl: '   ',
  });
  const imagePosterItem = createUgcImageItem({
    poster: '/images/ugc/ugc-image-poster.jpg',
  });

  assert.equal(toEmbedUrl(unsafeEmbedItem.embedUrl), null);
  assert.equal(toHttpsEmbedUrl(unsafeEmbedItem.embedUrl), null);
  assert.deepEqual(validateUgcPortfolioItem(unsafeEmbedItem), [
    'Los vídeos UGC deben usar un archivo de origen MP4, WebM o MOV.',
    'Los vídeos UGC necesitan una imagen de póster.',
  ]);
  assert.deepEqual(validateUgcPortfolioItem(emptyEmbedItem), [
    'Los elementos UGC necesitan un archivo de origen.',
  ]);
  assert.deepEqual(validateUgcPortfolioItem(imagePosterItem), [
    'Las imágenes UGC no deben conservar un valor de póster.',
  ]);
});

test('orbit validation still accepts optional embed metadata when local media remains intact', () => {
  const orbitVideoItem = createOrbitVideoItem({
    embedUrl: 'https://player.example.com/embed/orbit',
  });

  assert.deepEqual(validateOrbitMediaItem(orbitVideoItem), []);
});

test('orbit validation accepts a valid embed without requiring a local video source', () => {
  const blankSourceItem = createOrbitVideoItem({
    src: '',
    embedUrl: 'https://player.example.com/embed/orbit',
  });
  const invalidExtensionItem = createOrbitVideoItem({
    src: '/images/site/not-a-video.txt',
    embedUrl: '<iframe src="https://player.example.com/embed/orbit"></iframe>',
  });

  assert.equal(toEmbedUrl(blankSourceItem.embedUrl), 'https://player.example.com/embed/orbit');
  assert.deepEqual(validateOrbitMediaItem(blankSourceItem), []);
  assert.deepEqual(validateOrbitMediaItem(invalidExtensionItem), []);
});

test('embed parsing keeps https public embeds and rejects http or unsafe schemes', () => {
  assert.equal(
    toEmbedUrl('<iframe src="https://player.example.com/embed/video"></iframe>'),
    'https://player.example.com/embed/video',
  );
  assert.equal(
    toHttpsEmbedUrl('<iframe src="https://player.example.com/embed/video"></iframe>'),
    'https://player.example.com/embed/video',
  );
  assert.equal(toEmbedUrl('http://player.example.com/embed/video'), 'http://player.example.com/embed/video');
  assert.equal(toHttpsEmbedUrl('http://player.example.com/embed/video'), null);
  assert.equal(toEmbedUrl('data:text/html,<iframe></iframe>'), null);
  assert.equal(toHttpsEmbedUrl('javascript:alert(1)'), null);
});

test('ugc and orbit uploads keep the existing 2MB image and 8MB video limits', () => {
  const oversizeImage = new File([new Uint8Array(ORBIT_IMAGE_MAX_BYTES + 1)], 'image.jpg', {
    type: 'image/jpeg',
  });
  const oversizeVideo = new File([new Uint8Array(ORBIT_VIDEO_MAX_BYTES + 1)], 'video.mp4', {
    type: 'video/mp4',
  });

  assert.equal(validateUgcMediaUpload(oversizeImage, 'image'), 'Las imágenes deben pesar 2MB o menos.');
  assert.equal(validateUgcMediaUpload(oversizeVideo, 'video'), 'Los vídeos deben pesar 8MB o menos.');
  assert.equal(validateOrbitMediaUpload(oversizeImage, 'image'), 'Las imágenes deben pesar 2MB o menos.');
  assert.equal(validateOrbitMediaUpload(oversizeVideo, 'video'), 'Los vídeos deben pesar 8MB o menos.');
});

test('media embed setters preserve missing embedUrl fields when a draft is cleared', () => {
  const store = createStore({
    orbitMedia: [
      {
        id: 'orbit-video',
        type: 'video',
        src: '/images/site/orbit-video.mp4',
        poster: '/images/site/orbit-video-poster.jpg',
        href: null,
        alt: { es: 'Alt ES', en: 'Alt EN', fr: 'Alt FR', de: 'Alt ES', it: 'Alt ES', ca: 'Alt ES' },
        label: { es: 'Label ES', en: 'Label EN', fr: 'Label FR', de: 'Label ES', it: 'Label ES', ca: 'Label ES' },
      },
      {
        id: 'orbit-image',
        type: 'image',
        src: '/images/site/orbit-image.jpg',
        poster: null,
        href: null,
        alt: { es: 'Image ES', en: 'Image EN', fr: 'Image FR', de: 'Image ES', it: 'Image ES', ca: 'Image ES' },
        label: { es: 'Image label ES', en: 'Image label EN', fr: 'Image label FR', de: 'Image label ES', it: 'Image label ES', ca: 'Image label ES' },
      },
    ],
    ugcPortfolio: [
      {
        id: 'ugc-video',
        category: 'travel',
        type: 'video',
        src: '/images/ugc/ugc-video.mp4',
        poster: '/images/ugc/ugc-video-poster.jpg',
        label: { es: 'UGC ES', en: 'UGC EN', fr: 'UGC FR', de: 'UGC ES', it: 'UGC ES', ca: 'UGC ES' },
        title: { es: 'Title ES', en: 'Title EN', fr: 'Title FR', de: 'Title ES', it: 'Title ES', ca: 'Title ES' },
        description: { es: 'Desc ES', en: 'Desc EN', fr: 'Desc FR', de: 'Desc ES', it: 'Desc ES', ca: 'Desc ES' },
        format: { es: 'Format ES', en: 'Format EN', fr: 'Format FR', de: 'Format ES', it: 'Format ES', ca: 'Format ES' },
        alt: { es: 'Alt ES', en: 'Alt EN', fr: 'Alt FR', de: 'Alt ES', it: 'Alt ES', ca: 'Alt ES' },
      },
      {
        id: 'ugc-image',
        category: 'art',
        type: 'image',
        src: '/images/ugc/ugc-image.jpg',
        poster: null,
        label: { es: 'UGC image ES', en: 'UGC image EN', fr: 'UGC image FR', de: 'UGC image ES', it: 'UGC image ES', ca: 'UGC image ES' },
        title: { es: 'Image title ES', en: 'Image title EN', fr: 'Image title FR', de: 'Image title ES', it: 'Image title ES', ca: 'Image title ES' },
        description: { es: 'Image desc ES', en: 'Image desc EN', fr: 'Image desc FR', de: 'Image desc ES', it: 'Image desc ES', ca: 'Image desc ES' },
        format: { es: 'Image format ES', en: 'Image format EN', fr: 'Image format FR', de: 'Image format ES', it: 'Image format ES', ca: 'Image format ES' },
        alt: { es: 'Image alt ES', en: 'Image alt EN', fr: 'Image alt FR', de: 'Image alt ES', it: 'Image alt ES', ca: 'Image alt ES' },
      },
    ],
  });
  let emissionCount = 0;
  store.subscribe(() => {
    emissionCount += 1;
  });

  store.setOrbitMediaEmbedUrl(0, '  https://player.example.com/orbit  ');
  store.setOrbitMediaEmbedUrl(1, '  https://example.com/ignored  ');
  store.setUgcPortfolioEmbedUrl('ugc-video', '  https://player.example.com/ugc  ');
  store.setUgcPortfolioEmbedUrl('ugc-image', '  https://example.com/ignored  ');

  let snapshot = store.getSnapshot();
  let [orbitVideo, orbitImage] = snapshot.getOrbitMedia();
  let [ugcVideo, ugcImage] = snapshot.getUgcPortfolio();

  assert.equal(orbitVideo.embedUrl, 'https://player.example.com/orbit');
  assert.equal(Object.hasOwn(orbitVideo, 'embedUrl'), true);
  assert.equal(orbitImage.embedUrl, undefined);
  assert.equal(Object.hasOwn(orbitImage, 'embedUrl'), false);
  assert.equal(ugcVideo.embedUrl, 'https://player.example.com/ugc');
  assert.equal(Object.hasOwn(ugcVideo, 'embedUrl'), true);
  assert.equal(ugcImage.embedUrl, undefined);
  assert.equal(Object.hasOwn(ugcImage, 'embedUrl'), false);
  assert.equal(emissionCount, 2);

  store.setOrbitMediaEmbedUrl(0, '   ');
  store.setUgcPortfolioEmbedUrl('ugc-video', '   ');

  snapshot = store.getSnapshot();
  [orbitVideo, orbitImage] = snapshot.getOrbitMedia();
  [ugcVideo, ugcImage] = snapshot.getUgcPortfolio();

  assert.equal(orbitVideo.embedUrl, undefined);
  assert.equal(Object.hasOwn(orbitVideo, 'embedUrl'), false);
  assert.equal(orbitImage.embedUrl, undefined);
  assert.equal(ugcVideo.embedUrl, undefined);
  assert.equal(Object.hasOwn(ugcVideo, 'embedUrl'), false);
  assert.equal(ugcImage.embedUrl, undefined);
  assert.equal(snapshot.isDirty, false);
  assert.equal(snapshot.pendingCount, 0);
  assert.equal(snapshot.publishSuccess, false);
  assert.equal(snapshot.publishError, '');
  assert.equal(emissionCount, 4);
});

test('media embed setters keep nullable embedUrl fields and reset publish state', async () => {
  const store = createStore({
    orbitMedia: [
      {
        id: 'orbit-video',
        type: 'video',
        src: '/images/site/orbit-video.mp4',
        poster: '/images/site/orbit-video-poster.jpg',
        embedUrl: null,
        href: null,
        alt: { es: 'Alt ES', en: 'Alt EN', fr: 'Alt FR', de: 'Alt ES', it: 'Alt ES', ca: 'Alt ES' },
        label: { es: 'Label ES', en: 'Label EN', fr: 'Label FR', de: 'Label ES', it: 'Label ES', ca: 'Label ES' },
      },
      {
        id: 'orbit-image',
        type: 'image',
        src: '/images/site/orbit-image.jpg',
        poster: null,
        href: null,
        alt: { es: 'Image ES', en: 'Image EN', fr: 'Image FR', de: 'Image ES', it: 'Image ES', ca: 'Image ES' },
        label: { es: 'Image label ES', en: 'Image label EN', fr: 'Image label FR', de: 'Image label ES', it: 'Image label ES', ca: 'Image label ES' },
      },
    ],
  });
  let emissionCount = 0;
  store.subscribe(() => {
    emissionCount += 1;
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init = {}) => {
    if (!init.method || init.method === 'GET') {
      return new Response(JSON.stringify({ sha: 'site-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ content: { sha: 'updated-site-sha' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await store.publish();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(store.getSnapshot().publishSuccess, true);

  emissionCount = 0;
  store.setOrbitMediaEmbedUrl(0, '  https://player.example.com/orbit  ');
  store.setOrbitMediaEmbedUrl(1, '  https://example.com/ignored  ');
  store.setUgcPortfolioEmbedUrl('ugc-video', '  https://player.example.com/ugc  ');
  store.setUgcPortfolioEmbedUrl('ugc-image', '  https://example.com/ignored  ');

  let snapshot = store.getSnapshot();
  let [orbitVideo, orbitImage] = snapshot.getOrbitMedia();
  let [ugcVideo, ugcImage] = snapshot.getUgcPortfolio();

  assert.equal(snapshot.publishSuccess, false);
  assert.equal(snapshot.publishError, '');
  assert.equal(orbitVideo.embedUrl, 'https://player.example.com/orbit');
  assert.equal(Object.hasOwn(orbitVideo, 'embedUrl'), true);
  assert.equal(orbitImage.embedUrl, undefined);
  assert.equal(ugcVideo.embedUrl, 'https://player.example.com/ugc');
  assert.equal(Object.hasOwn(ugcVideo, 'embedUrl'), true);
  assert.equal(ugcImage.embedUrl, null);
  assert.equal(emissionCount, 2);
  assert.equal(snapshot.isDirty, true);
  assert.ok(snapshot.pendingCount > 0);

  store.setOrbitMediaEmbedUrl(0, '   ');
  store.setUgcPortfolioEmbedUrl('ugc-video', '   ');

  snapshot = store.getSnapshot();
  [orbitVideo, orbitImage] = snapshot.getOrbitMedia();
  [ugcVideo, ugcImage] = snapshot.getUgcPortfolio();

  assert.equal(orbitVideo.embedUrl, null);
  assert.equal(Object.hasOwn(orbitVideo, 'embedUrl'), true);
  assert.equal(orbitImage.embedUrl, undefined);
  assert.equal(ugcVideo.embedUrl, null);
  assert.equal(Object.hasOwn(ugcVideo, 'embedUrl'), true);
  assert.equal(ugcImage.embedUrl, null);
  assert.equal(snapshot.isDirty, false);
  assert.equal(snapshot.pendingCount, 0);
  assert.equal(snapshot.publishSuccess, false);
  assert.equal(snapshot.publishError, '');
  assert.equal(emissionCount, 4);
});

test('publish preserves embed URLs in the serialized site payload', async () => {
  const store = createStore();
  store.setOrbitMediaEmbedUrl(0, '  https://player.example.com/orbit  ');
  store.setUgcPortfolioEmbedUrl('ugc-video', '  https://player.example.com/ugc  ');

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    fetchCalls.push({ input: String(input), init });

    if (!init.method || init.method === 'GET') {
      return new Response(JSON.stringify({ sha: 'site-sha' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ content: { sha: 'updated-site-sha' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await store.publish();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(store.getSnapshot().publishSuccess, true);
  assert.equal(store.getSnapshot().publishError, '');

  const siteWrite = fetchCalls.find(
    (call) => call.init?.method === 'PUT' && String(call.input).includes('src/data/site.json'),
  );
  assert.ok(siteWrite, 'publishing should write the site JSON payload');

  const writePayload = JSON.parse(String(siteWrite?.init?.body ?? '{}'));
  const publishedSite = JSON.parse(Buffer.from(writePayload.content, 'base64').toString('utf8'));

  assert.equal(publishedSite.orbitMedia[0].embedUrl, 'https://player.example.com/orbit');
  assert.equal(publishedSite.ugcPortfolio[0].embedUrl, 'https://player.example.com/ugc');
});
