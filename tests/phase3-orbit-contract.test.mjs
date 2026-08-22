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

function sliceEnclosedBlock(source, blockStartMarker) {
  const start = source.indexOf(blockStartMarker);
  assert.notEqual(start, -1, `Expected source marker: ${blockStartMarker}`);

  const openingBrace = source.indexOf('{', start);
  assert.notEqual(openingBrace, -1, `Expected opening brace after: ${blockStartMarker}`);

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  assert.fail(`Expected closing brace for: ${blockStartMarker}`);
}

function collectProgressTweenCalls(source) {
  return [...source.matchAll(/gsap\.to\(\s*progressRef\.current\s*,\s*\{[\s\S]*?\}\s*\)/g)].map((match) => ({
    source: match[0],
    index: match.index ?? -1,
  }));
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

  assert.equal(orbit.ORBIT_REVOLUTION_SECONDS, 76);

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

test('orbit activation helper distinguishes pointer hover audio from keyboard focus mute', async () => {
  const orbit = await loadOrbitModule();

  assert.equal(
    orbit.getOrbitActivatedVideoPlaybackMode({
      activationMode: 'pointer-hover',
      prefersReducedMotion: false,
      isDocumentVisible: true,
      isRegionVisible: true,
    }),
    'play-with-sound',
  );
  assert.equal(
    orbit.getOrbitActivatedVideoPlaybackMode({
      activationMode: 'focus',
      prefersReducedMotion: false,
      isDocumentVisible: true,
      isRegionVisible: true,
    }),
    'play-muted',
  );
  assert.equal(
    orbit.getOrbitActivatedVideoPlaybackMode({
      activationMode: 'pointer-hover',
      prefersReducedMotion: true,
      isDocumentVisible: true,
      isRegionVisible: true,
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

test('site orbit data stays fixed to the approved fifteen local mock placeholders', async () => {
  const site = await readJson('src/data/site.json');
  const orbitMedia = site.orbitMedia;

  assert.equal(orbitMedia.length, 15);

  for (const [index, item] of orbitMedia.entries()) {
    assert.equal(item.type, 'image', `orbit item ${item.id} should stay on the approved image placeholders`);
    assert.match(item.src, /^\/images\/orbit\/mock-\d{2}\.webp$/, `orbit item ${item.id} should use the approved mock placeholder path`);
    assert.doesNotMatch(item.src, /^https?:\/\//, `orbit item ${item.id} should not use remote assets`);
    assert.equal(item.href, null, `orbit item ${item.id} should keep href null until real destinations are approved`);
    assert.equal(
      item.src,
      `/images/orbit/mock-${String(index + 1).padStart(2, '0')}.webp`,
      `orbit item ${item.id} should follow the approved mock placeholder order`,
    );
  }
});

test('homepage and admin keep the approved orbit wiring while StoryMap files disappear', async () => {
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

  assert.match(orbitSource, /from ['"]gsap['"]/);
  assert.doesNotMatch(orbitSource, /embla-carousel-react/);
  assert.doesNotMatch(orbitSource, /embla-carousel-auto-scroll|AutoScroll/);
  assert.doesNotMatch(orbitSource, /\b(?:useEmblaCarousel|emblaApi|emblaRef)\b/);
  assert.doesNotMatch(orbitSource, /\bdragFree\b|\bdraggable\s*=/);
  assert.doesNotMatch(orbitSource, /\bscrollPrev\b|\bscrollNext\b/);
  assert.doesNotMatch(orbitSource, /onWheel\s*=/);
  assert.doesNotMatch(orbitSource, /onKeyDown\s*=/);
  assert.doesNotMatch(orbitSource, /ArrowLeft|ArrowRight/);
  assert.doesNotMatch(orbitSource, /ui\.previous|ui\.next|aria-roledescription="carousel"|aria-label=\{ui\.(?:previous|next)\}/);
  assert.doesNotMatch(orbitSource, /\bprevious\s*:\s*['"]|\bnext\s*:\s*['"]/);
  assert.match(
    orbitSource,
    /gsap\.to\(\s*[A-Za-z_$][\w$]*progress[\w$]*Ref\.current\s*,\s*\{[\s\S]*?repeat:\s*-1[\s\S]*?ease:\s*['"]none['"][\s\S]*?duration:\s*ORBIT_REVOLUTION_SECONDS[\s\S]*?onUpdate:\s*applyOrbitLayout[\s\S]*?\}\s*\)/i,
    'orbit motion should run from a GSAP progress ref loop with an infinite linear revolution that reapplies layout on update',
  );
  assert.match(orbitSource, /prefers-reduced-motion: reduce/);
  assert.match(orbitSource, /getOrbitVideoPlaybackMode/);
  assert.match(orbitSource, /getOrbitActivatedVideoPlaybackMode/);
  assert.match(
    orbitSource,
    /useEffect\(\(\) => \{\s*syncVideoPlayback\(\);\s*\}, \[isDocumentVisible, isRegionVisible, items, prefersReducedMotion\]\);/,
    'orbit playback sync should rerun when reduced-motion changes at runtime',
  );
  const activateTileSource = sliceSourceSection(
    orbitSource,
    'const activateTile = (item: OrbitMedia, activationMode: OrbitActivationMode) => {',
    'const deactivateTile = (item: OrbitMedia) => {',
  );
  assert.match(activateTileSource, /getOrbitActivatedVideoPlaybackMode\(/);
  assert.match(activateTileSource, /activationMode/);
  assert.match(activateTileSource, /play-with-sound/);
  assert.match(activateTileSource, /play-muted/);
  assert.ok(
    activateTileSource.indexOf('play-muted') < activateTileSource.indexOf('video.muted = false'),
    'focus activation should stay muted before pointer-hover audio is attempted',
  );
  assert.match(orbitSource, /onPointerEnter=\{\(event\) => \{\s*if \(event\.pointerType === 'touch'\) return;\s*activateTile\(item, 'pointer-hover'\);/s);
  assert.match(orbitSource, /onPointerLeave=\{\(\) => deactivateTile\(item\)\}/);
  assert.match(orbitSource, /onFocusCapture=\{\(event\) => \{/);
  assert.match(orbitSource, /activateTile\(item, 'focus'\);/);
  assert.match(orbitHelperSource, /grayscale\(1\) brightness\(0\.42\)/);

  const toggleVideoSoundSource = sliceSourceSection(
    orbitSource,
    'const toggleVideoSound = async (item: OrbitMedia, event: React.MouseEvent<HTMLButtonElement>) => {',
    'useEffect(() => {',
  );
  assert.match(toggleVideoSoundSource, /getOrbitVideoPlaybackMode\(/);
  assert.match(toggleVideoSoundSource, /=== 'pause'/);
  assert.match(toggleVideoSoundSource, /pauseOrbitVideo\(item\.id, video\);/);
  assert.ok(
    toggleVideoSoundSource.indexOf("=== 'pause'") < toggleVideoSoundSource.indexOf('if (video.muted) {'),
    'sound toggle should bail out before trying to restart playback under reduced motion',
  );
  assert.match(orbitSource, /scale:\s*interactionState\.scale/);
  assert.match(orbitSource, /tabIndex=\{item\.href \? undefined : 0\}/);

  await assert.rejects(access(path.join(rootDir, 'src/components/StoryMap.tsx')));
  await assert.rejects(access(path.join(rootDir, 'src/components/admin/AdminStoryMap.tsx')));
});

test('orbit runtime uses a GSAP progress ref drift loop that starts only after the entrance timeline completes', async () => {
  const orbitSource = await readSource('src/components/OvalMediaOrbit.tsx');
  const applyOrbitLayoutSource = sliceSourceSection(
    orbitSource,
    'const applyOrbitLayout = () => {',
    'const syncVideoPlayback = () => {',
  );
  const entranceTimelineSource = sliceEnclosedBlock(
    orbitSource,
    'const timeline = gsap.timeline(',
  );
  const entranceOnCompleteSource = sliceEnclosedBlock(
    entranceTimelineSource,
    'onComplete: () =>',
  );
  const sourceBeforeEntranceOnComplete = orbitSource.slice(0, orbitSource.indexOf('onComplete: () =>'));
  const progressTweenCalls = collectProgressTweenCalls(orbitSource);
  const [driftTweenCall] = progressTweenCalls;

  assert.match(
    orbitSource,
    /const\s+progressRef\s*=\s*useRef\(\{\s*value:\s*0\s*\}\);/,
    'orbit motion should initialize a dedicated GSAP progress ref at { value: 0 }',
  );
  assert.match(
    applyOrbitLayoutSource,
    /progressRef\.current\.value/,
    'applyOrbitLayout should read progressRef.current.value as the single source of orbital progress',
  );
  assert.doesNotMatch(
    applyOrbitLayoutSource,
    /scrollProgress\(/,
    'applyOrbitLayout should not read Embla scroll progress once the drift ref contract lands',
  );
  assert.equal(progressTweenCalls.length, 1, 'orbit motion should define exactly one GSAP progress drift tween');
  assert.match(
    driftTweenCall?.source ?? '',
    /gsap\.to\(\s*progressRef\.current\s*,\s*\{[\s\S]*?\bvalue:\s*1\b[\s\S]*?\bduration:\s*ORBIT_REVOLUTION_SECONDS\b[\s\S]*?\brepeat:\s*-1\b[\s\S]*?\bease:\s*['"]none['"][\s\S]*?\bonUpdate:\s*applyOrbitLayout[\s\S]*?\}\s*\)/,
    'orbit motion should drift via gsap.to(progressRef.current, { value: 1, duration: ORBIT_REVOLUTION_SECONDS, repeat: -1, ease: "none", onUpdate: applyOrbitLayout })',
  );
  assert.match(
    entranceOnCompleteSource,
    /gsap\.to\(\s*progressRef\.current\s*,\s*\{[\s\S]*?\}\s*\)/,
    'the entrance timeline onComplete should create the drift tween inline',
  );
  assert.ok(
    entranceOnCompleteSource.includes(driftTweenCall?.source ?? ''),
    'the single drift tween source should occur lexically inside the entrance timeline onComplete hook',
  );
  assert.deepEqual(
    collectProgressTweenCalls(sourceBeforeEntranceOnComplete).filter(({ source }) => !/\bpaused\s*:\s*true\b/.test(source)),
    [],
    'orbit drift should not create an unpaused progress tween before the entrance timeline onComplete hook runs',
  );
});

test('orbit movement contract bans touch and pointer drag paths while preserving pointer hover entry and exit hooks', async () => {
  const orbitSource = await readSource('src/components/OvalMediaOrbit.tsx');

  assert.doesNotMatch(
    orbitSource,
    /\bonTouchStart\b|\bonTouchMove\b|\bonTouchEnd\b|\btouchstart\b|\btouchmove\b|\btouchend\b|\bswipe\b|setPointerCapture|releasePointerCapture|\bonPointerDown\b|\bonPointerMove\b|\bonPointerUp\b|\bpointerdown\b|\bpointermove\b|\bpointerup\b/,
    'orbit movement should not depend on touch/swipe or pointer drag handlers',
  );
  assert.match(
    orbitSource,
    /onPointerEnter=/,
    'pointerenter hover should remain available for video activation',
  );
  assert.match(
    orbitSource,
    /onPointerLeave=/,
    'pointerleave hover should remain available for deactivation',
  );
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
          src: '/images/site/img_5587.webp',
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
  const orbitAssets = allBuiltFiles.filter((filePath) => /OvalMediaOrbit|gsap/i.test(path.basename(filePath)));
  assert.ok(orbitAssets.length >= 1, 'build should emit at least one orbit-related client chunk');
  assert.ok(orbitAssets.every((filePath) => !/embla/i.test(path.basename(filePath))), 'build should not emit embla orbit chunks once the correction lands');
});
