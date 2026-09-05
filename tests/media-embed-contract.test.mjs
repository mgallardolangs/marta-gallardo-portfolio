import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

function createStore() {
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
    },
    'es',
    'token',
  );

  return store;
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

test('media embed setters trim values, clear empty input, and ignore image items', () => {
  const store = createStore();

  store.setOrbitMediaEmbedUrl(0, '  https://player.example.com/orbit  ');
  store.setOrbitMediaEmbedUrl(1, '  https://example.com/ignored  ');
  store.setUgcPortfolioEmbedUrl('ugc-video', '  https://player.example.com/ugc  ');
  store.setUgcPortfolioEmbedUrl('ugc-image', '  https://example.com/ignored  ');

  let snapshot = store.getSnapshot();
  let [orbitVideo, orbitImage] = snapshot.getOrbitMedia();
  let [ugcVideo, ugcImage] = snapshot.getUgcPortfolio();

  assert.equal(orbitVideo.embedUrl, 'https://player.example.com/orbit');
  assert.equal(orbitImage.embedUrl, undefined);
  assert.equal(ugcVideo.embedUrl, 'https://player.example.com/ugc');
  assert.equal(ugcImage.embedUrl, null);

  store.setOrbitMediaEmbedUrl(0, '   ');
  store.setUgcPortfolioEmbedUrl('ugc-video', '   ');

  snapshot = store.getSnapshot();
  [orbitVideo, orbitImage] = snapshot.getOrbitMedia();
  [ugcVideo, ugcImage] = snapshot.getUgcPortfolio();

  assert.equal(orbitVideo.embedUrl, null);
  assert.equal(orbitImage.embedUrl, undefined);
  assert.equal(ugcVideo.embedUrl, null);
  assert.equal(ugcImage.embedUrl, null);
  assert.equal(snapshot.isDirty, true);
  assert.equal(snapshot.publishSuccess, false);
  assert.equal(snapshot.publishError, '');
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
