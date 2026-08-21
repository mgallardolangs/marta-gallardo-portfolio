import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function assertApprox(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label} expected ${expected} ±${tolerance}, got ${actual}`,
  );
}

function sliceSourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected source marker: ${startMarker}`);

  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Expected source marker: ${endMarker}`);

  return source.slice(start, end);
}

async function loadOrbitModule() {
  try {
    return await import('../src/lib/orbitMedia.ts');
  } catch (error) {
    assert.fail(`Expected src/lib/orbitMedia.ts to exist and load: ${error instanceof Error ? error.message : String(error)}`);
  }
}

test('orbit geometry maps the approved ellipse checkpoints', async () => {
  const orbit = await loadOrbitModule();
  const geometry = orbit.DESKTOP_ORBIT_GEOMETRY;

  assert.equal(orbit.ORBIT_REVOLUTION_SECONDS, 68);

  const zero = orbit.getTiltedEllipsePoint(0, geometry);
  const quarter = orbit.getTiltedEllipsePoint(0.25, geometry);
  const half = orbit.getTiltedEllipsePoint(0.5, geometry);

  assertApprox(zero.x, 281.61, 0.2, 'phase 0 x');
  assertApprox(zero.y, -91.47, 0.2, 'phase 0 y');
  assertApprox(quarter.x, 47.59, 0.2, 'phase 0.25 x');
  assertApprox(quarter.y, 146.47, 0.2, 'phase 0.25 y');
  assertApprox(half.x, -281.61, 0.2, 'phase 0.5 x');
  assertApprox(half.y, 91.47, 0.2, 'phase 0.5 y');
});

test('orbit helpers keep hrefs locale-aware and interaction states consistent', async () => {
  const orbit = await loadOrbitModule();

  assert.equal(orbit.resolveOrbitHref('/contact', 'fr'), '/fr/contact');
  assert.equal(orbit.resolveOrbitHref('/blog', 'es'), '/blog');
  assert.equal(orbit.resolveOrbitHref(null, 'en'), null);

  assert.deepEqual(
    orbit.getOrbitInteractionState({ baseScale: 0.92, isActive: true, hasActiveTile: true }),
    {
      opacity: 1,
      filter: 'none',
      scale: 1.38,
      zIndexBoost: 1000,
    },
  );

  assert.deepEqual(
    orbit.getOrbitInteractionState({ baseScale: 0.92, isActive: false, hasActiveTile: true }),
    {
      opacity: 0.42,
      filter: 'grayscale(1) brightness(0.42)',
      scale: 0.92,
      zIndexBoost: 0,
    },
  );
});

test('orbit video playback helper pauses for reduced motion and only resumes muted when visible', async () => {
  const orbit = await loadOrbitModule();

  assert.equal(
    orbit.getOrbitVideoPlaybackMode({
      prefersReducedMotion: true,
      isDocumentVisible: true,
      isRegionVisible: true,
    }),
    'pause',
  );
  assert.equal(
    orbit.getOrbitVideoPlaybackMode({
      prefersReducedMotion: false,
      isDocumentVisible: true,
      isRegionVisible: true,
    }),
    'play-muted',
  );
  assert.equal(
    orbit.getOrbitVideoPlaybackMode({
      prefersReducedMotion: false,
      isDocumentVisible: false,
      isRegionVisible: true,
    }),
    'pause',
  );
  assert.equal(
    orbit.getOrbitVideoPlaybackMode({
      prefersReducedMotion: false,
      isDocumentVisible: true,
      isRegionVisible: false,
    }),
    'pause',
  );
});

test('orbit media helpers validate caps, video poster requirements, and stable IDs', async () => {
  const orbit = await loadOrbitModule();
  const existingIds = ['hero-editorial', 'hero-editorial-2'];

  assert.equal(
    orbit.createOrbitMediaDraft(existingIds).id,
    'orbit-item',
    'new orbit entries should start from a stable kebab-case base id',
  );
  assert.equal(
    orbit.createOrbitMediaDraft([...existingIds, 'orbit-item']).id,
    'orbit-item-2',
    'new orbit entries should avoid collisions with existing ids',
  );

  assert.equal(
    orbit.validateOrbitMediaUpload(new File([Buffer.alloc(1)], 'tile.jpg', { type: 'image/jpeg' }), 'image'),
    null,
  );
  assert.match(
    orbit.validateOrbitMediaUpload(new File([Buffer.alloc(2 * 1024 * 1024 + 1)], 'tile.jpg', { type: 'image/jpeg' }), 'image') ?? '',
    /2MB/,
  );
  assert.match(
    orbit.validateOrbitMediaUpload(new File([Buffer.alloc(8 * 1024 * 1024 + 1)], 'tile.mp4', { type: 'video/mp4' }), 'video') ?? '',
    /8MB/,
  );
  assert.match(
    orbit.validateOrbitMediaUpload(new File([Buffer.alloc(1)], 'tile.svg', { type: 'image/svg+xml' }), 'image') ?? '',
    /JPG, PNG, WebP, or GIF/,
  );
  assert.match(
    orbit.validateOrbitMediaUpload(new File([Buffer.alloc(1)], 'tile.svg', { type: 'image/svg+xml' }), 'video') ?? '',
    /MP4, WebM, or QuickTime/,
  );

  const videoErrors = orbit.validateOrbitMediaItem({
    id: 'video-tile',
    type: 'video',
    src: '/images/site/video-tile.mp4',
    poster: '',
    href: null,
    label: orbit.createLocalizedText('Vídeo'),
    alt: orbit.createLocalizedText('Vídeo sin póster'),
  });
  assert.deepEqual(videoErrors, ['Orbit videos require a poster image.']);

  assert.match(
    orbit.validateOrbitMediaItem({
      id: 'video-src-mismatch',
      type: 'video',
      src: '/images/site/orbit-placeholder-profile.svg',
      poster: '/images/site/orbit-item-poster.jpg',
      href: null,
      label: orbit.createLocalizedText('Vídeo'),
      alt: orbit.createLocalizedText('Vídeo con archivo incorrecto'),
    }).join(' '),
    /must use an MP4, WebM, or MOV source/,
  );
});

test('site orbit data stays local-only, exactly fifteen items, and reuses no more than two assets', async () => {
  const site = await readJson('src/data/site.json');
  const orbitMedia = site.orbitMedia;

  assert.equal(orbitMedia.length, 15);

  const repeatedCounts = new Map();
  for (const item of orbitMedia) {
    assert.match(item.src, /^\/images\/site\//, `orbit item ${item.id} should use a local site asset`);
    assert.doesNotMatch(item.src, /^https?:\/\//, `orbit item ${item.id} should not use remote assets`);
    repeatedCounts.set(item.src, (repeatedCounts.get(item.src) ?? 0) + 1);
  }

  for (const [src, count] of repeatedCounts) {
    assert.ok(count <= 2, `${src} should not be repeated more than twice in the initial orbit`);
  }
});

test('homepage and admin wire the new orbit components while StoryMap files disappear', async () => {
  const [homeSource, adminSource, orbitSource, orbitHelperSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/pages/admin/index.astro'),
    readSource('src/components/OvalMediaOrbit.tsx'),
    readSource('src/lib/orbitMedia.ts'),
  ]);

  assert.match(homeSource, /import OvalMediaOrbit from ['"]\.\.\/components\/OvalMediaOrbit['"]/);
  assert.match(homeSource, /<OvalMediaOrbit client:visible/);
  assert.doesNotMatch(homeSource, /StoryMap/);
  assert.match(homeSource, /bg-ink/, 'home page should add the approved black anchor section');

  assert.match(adminSource, /import EditableOrbitCollection from ['"]\.\.\/\.\.\/components\/admin\/EditableOrbitCollection['"]/);
  assert.match(adminSource, /import AdminOrbitPreview from ['"]\.\.\/\.\.\/components\/admin\/AdminOrbitPreview['"]/);
  assert.match(adminSource, /<AdminOrbitPreview client:load/);
  assert.doesNotMatch(adminSource, /AdminStoryMap/);

  assert.match(orbitSource, /embla-carousel-react/);
  assert.match(orbitSource, /embla-carousel-auto-scroll/);
  assert.match(orbitSource, /from ['"]gsap['"]/);
  assert.match(orbitSource, /prefers-reduced-motion: reduce/);
  assert.match(orbitSource, /getOrbitVideoPlaybackMode/);
  assert.match(
    orbitSource,
    /useEffect\(\(\) => \{\s*syncVideoPlayback\(\);\s*\}, \[isDocumentVisible, isRegionVisible, items, prefersReducedMotion\]\);/,
    'orbit playback sync should rerun when reduced-motion changes at runtime',
  );
  const activateTileSource = sliceSourceSection(
    orbitSource,
    'const activateTile = (item: OrbitMedia) => {',
    'const deactivateTile = (item: OrbitMedia) => {',
  );
  assert.match(activateTileSource, /getOrbitVideoPlaybackMode\(/);
  assert.match(activateTileSource, /=== 'pause'/);
  assert.match(activateTileSource, /video\.pause\(\);/);
  assert.ok(
    activateTileSource.indexOf("=== 'pause'") < activateTileSource.indexOf('video.muted = false'),
    'hover activation should guard reduced motion before attempting audible playback',
  );

  const toggleVideoSoundSource = sliceSourceSection(
    orbitSource,
    'const toggleVideoSound = async (item: OrbitMedia, event: React.MouseEvent<HTMLButtonElement>) => {',
    'useEffect(() => {',
  );
  assert.match(toggleVideoSoundSource, /getOrbitVideoPlaybackMode\(/);
  assert.match(toggleVideoSoundSource, /=== 'pause'/);
  assert.match(toggleVideoSoundSource, /video\.pause\(\);/);
  assert.ok(
    toggleVideoSoundSource.indexOf("=== 'pause'") < toggleVideoSoundSource.indexOf('if (video.muted) {'),
    'sound toggle should bail out before trying to restart playback under reduced motion',
  );
  assert.match(orbitSource, /ref=\{emblaRef\}[\s\S]*absolute inset-0/, 'drag viewport should cover the visible orbit box');
  assert.match(orbitSource, /scale:\s*interactionState\.scale/);
  assert.match(orbitSource, /tabIndex=\{item\.href \? undefined : 0\}/);
  assert.match(orbitSource, /aria-roledescription="carousel"/);
  assert.match(orbitHelperSource, /grayscale\(1\) brightness\(0\.42\)/);

  await assert.rejects(access(path.join(rootDir, 'src/components/StoryMap.tsx')));
  await assert.rejects(access(path.join(rootDir, 'src/components/admin/AdminStoryMap.tsx')));
});

test('admin store exposes orbit collection mutations and publishes site data updates', async () => {
  const store = new AdminStore();

  store.init(
    {
      es: { home: { hero: { kicker: 'hola' } } },
      en: { home: { hero: { kicker: 'hello' } } },
      fr: { home: { hero: { kicker: 'salut' } } },
    },
    {
      orbitMedia: [
        {
          id: 'hero-editorial',
          type: 'image',
          src: '/images/site/img_5587.jpg',
          href: '/',
          label: { es: 'Uno', en: 'One', fr: 'Un', de: 'Uno', it: 'Uno', ca: 'Uno' },
          alt: { es: 'Alt uno', en: 'Alt one', fr: 'Alt un', de: 'Alt uno', it: 'Alt uno', ca: 'Alt uno' },
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

  assert.equal(typeof store.getSnapshot().getOrbitMedia, 'function');
  assert.equal(typeof store.addOrbitMediaItem, 'function');
  assert.equal(typeof store.moveOrbitMediaItem, 'function');

  store.addOrbitMediaItem();
  store.updateOrbitMediaText(1, 'label', 'es', 'Nueva pieza');
  store.updateOrbitMediaText(1, 'alt', 'es', 'Nueva pieza alt');
  store.updateOrbitMediaHref(1, '/contact');
  store.updateOrbitMediaType(1, 'video');
  store.updateOrbitMediaPoster(1, '/images/site/orbit-item-poster.jpg');
  store.moveOrbitMediaItem(1, -1);

  const snapshot = store.getSnapshot();
  const publishedOrbit = snapshot.getOrbitMedia();
  assert.equal(publishedOrbit.length, 2);
  assert.equal(publishedOrbit[0].type, 'video');
  assert.equal(publishedOrbit[0].href, '/contact');
  assert.equal(publishedOrbit[0].poster, '/images/site/orbit-item-poster.jpg');
  assert.equal(publishedOrbit[0].src, '', 'switching from image to video should clear an incompatible image source');
  assert.equal(snapshot.isDirty, true);
  assert.ok(snapshot.pendingCount >= 1);

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

    return new Response(JSON.stringify({ content: { sha: 'next-site-sha' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await store.publish();
    assert.match(store.getSnapshot().publishError, /Orbit media requires a source file/);
    assert.equal(fetchCalls.length, 0, 'invalid orbit data should block publish before any repo writes');

    store.updateOrbitMediaType(0, 'image');
    await store.publish();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(store.getSnapshot().publishError, '');
  assert.equal(store.getSnapshot().publishSuccess, true);
  assert.equal(fetchCalls.length, 2);

  const writePayload = JSON.parse(String(fetchCalls[1].init.body));
  const publishedJson = Buffer.from(writePayload.content, 'base64').toString('utf8');
  assert.match(publishedJson, /"orbitMedia"/);
  assert.match(publishedJson, /"type": "image"/);
  assert.match(publishedJson, /"href": "\/contact"/);
});

test('built home route ships orbit motion chunks while contact and blog stay free of orbit runtime code', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built assets.');
    return;
  }

  const distRoot = path.join(rootDir, 'dist');
  const [homeHtml, contactHtml, blogHtml] = await Promise.all([
    readFile(path.join(distRoot, 'index.html'), 'utf8'),
    readFile(path.join(distRoot, 'contact', 'index.html'), 'utf8'),
    readFile(path.join(distRoot, 'blog', 'index.html'), 'utf8'),
  ]);

  const collectAssetPaths = (html) => [...html.matchAll(/\/_astro\/[^"'?#]+\.js/g)].map((match) => match[0]);

  const homeAssets = collectAssetPaths(homeHtml);
  const contactAssets = collectAssetPaths(contactHtml);
  const blogAssets = collectAssetPaths(blogHtml);

  assert.ok(homeAssets.some((assetPath) => /OvalMediaOrbit\./.test(assetPath)), 'home should reference the orbit client chunk');
  assert.ok(contactAssets.every((assetPath) => !/OvalMediaOrbit\./.test(assetPath)), 'contact should not reference the orbit client chunk');
  assert.ok(blogAssets.every((assetPath) => !/OvalMediaOrbit\./.test(assetPath)), 'blog should not reference the orbit client chunk');

  const allBuiltFiles = await collectFiles(path.join(distRoot, '_astro'));
  const orbitAssets = allBuiltFiles.filter((filePath) => /OvalMediaOrbit|embla|gsap/i.test(path.basename(filePath)));
  assert.ok(orbitAssets.length >= 1, 'build should emit at least one orbit-related client chunk');
});
