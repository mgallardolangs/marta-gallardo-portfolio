import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';
import {
  playFocusedVideoPlayback,
  stopAllPreviewVideoPlayback,
  stopPreviewVideoPlayback,
} from '../src/lib/ugcPortfolio.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function createLocalizedText(seed) {
  return {
    es: `${seed} ES`,
    en: `${seed} EN`,
    fr: `${seed} FR`,
    de: `${seed} ES`,
    it: `${seed} ES`,
    ca: `${seed} ES`,
  };
}

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
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

function createUgcStore() {
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
      nicheBackgrounds: {},
      ugcVideos: { travel: [], languages: [], art: [] },
      ugcPhotos: { travel: [], languages: [], art: [], all: [] },
      nicheIcons: { travel: '', languages: '', art: '' },
      aboutPhotos: [],
      brandVideo: '',
      toolLogos: {},
      videoStickers: {},
      orbitMedia: [],
      ugcPortfolio: [
        {
          id: 'ugc-travel-01',
          category: 'travel',
          type: 'video',
          src: '/images/ugc/original-video.mp4',
          poster: '/images/ugc/original-video-poster.jpg',
          label: createLocalizedText('Label'),
          title: createLocalizedText('Title'),
          description: createLocalizedText('Short description.'),
          format: createLocalizedText('Vertical video'),
          alt: createLocalizedText('Alt'),
        },
      ],
      arsenal: { languages: [], tools: [], skills: [] },
      person: { name: 'Marta', location: 'Elche', socialProfiles: { linkedin: '', instagram: '' } },
    },
    'es',
    'publish-token',
  );

  return store;
}

test('UGC poster uploads reject image slots without mutating poster state or pending uploads', async () => {
  const restoreFileReader = installMockFileReader();
  const store = createUgcStore();

  try {
    store.updateUgcPortfolioField('ugc-travel-01', 'type', 'image');

    const beforeSnapshot = store.getSnapshot();
    const beforeItem = beforeSnapshot.getUgcPortfolio()[0];

    assert.equal(beforeItem.poster, '/images/ugc/original-video-poster.jpg');

    await assert.rejects(
      store.setUgcPortfolioPoster(
        'ugc-travel-01',
        new File([Buffer.from('poster-binary')], 'replacement-poster.jpg', { type: 'image/jpeg' }),
      ),
      /Poster uploads are only available for video UGC items\./,
    );

    const afterSnapshot = store.getSnapshot();
    const afterItem = afterSnapshot.getUgcPortfolio()[0];

    assert.equal(afterItem.poster, '/images/ugc/original-video-poster.jpg');
    assert.equal(afterSnapshot.pendingCount, beforeSnapshot.pendingCount);
    assert.deepEqual(
      afterSnapshot.getUgcPortfolioItemValidationErrors('ugc-travel-01'),
      [
        'UGC images must use a JPG, PNG, WebP, or GIF source.',
        'UGC images should not keep a poster value.',
      ],
      'rejecting the upload should preserve the same resolvable stale-poster validation state',
    );
  } finally {
    restoreFileReader();
  }
});

test('UGC poster uploads accept video slots and stage the replacement poster preview', async () => {
  const restoreFileReader = installMockFileReader();
  const store = createUgcStore();

  try {
    await store.setUgcPortfolioPoster(
      'ugc-travel-01',
      new File([Buffer.from('poster-binary')], 'replacement-poster.jpg', { type: 'image/jpeg' }),
    );

    const snapshot = store.getSnapshot();
    const item = snapshot.getUgcPortfolio()[0];

    assert.match(item.poster ?? '', /^data:image\/jpeg;base64,/);
    assert.ok(snapshot.pendingCount >= 1, 'accepted video poster uploads should create a pending change');
    assert.deepEqual(snapshot.getUgcPortfolioItemValidationErrors('ugc-travel-01'), []);
  } finally {
    restoreFileReader();
  }
});

test('UGC type switching stays non-destructive until poster is explicitly cleared', async () => {
  const restoreFileReader = installMockFileReader();
  const store = createUgcStore();

  try {
    await store.setUgcPortfolioPoster(
      'ugc-travel-01',
      new File([Buffer.from('poster-binary')], 'replacement-poster.jpg', { type: 'image/jpeg' }),
    );

    store.updateUgcPortfolioField('ugc-travel-01', 'type', 'image');

    const invalidImageSnapshot = store.getSnapshot().getUgcPortfolio()[0];
    assert.equal(invalidImageSnapshot.type, 'image');
    assert.equal(invalidImageSnapshot.src, '/images/ugc/original-video.mp4');
    assert.match(invalidImageSnapshot.poster ?? '', /^data:image\/jpeg;base64,/);
    assert.deepEqual(
      store.getSnapshot().getUgcPortfolioItemValidationErrors('ugc-travel-01'),
      [
        'UGC images must use a JPG, PNG, WebP, or GIF source.',
        'UGC images should not keep a poster value.',
      ],
      'switching video to image should preserve the current files but surface the exact resolvable validation errors',
    );

    await store.setUgcPortfolioMedia(
      'ugc-travel-01',
      new File([Buffer.from('image-binary')], 'replacement-image.webp', { type: 'image/webp' }),
    );
    store.clearUgcPortfolioPoster('ugc-travel-01');

    const repairedSnapshot = store.getSnapshot().getUgcPortfolio()[0];
    assert.match(repairedSnapshot.src, /^data:image\/webp;base64,/);
    assert.equal(repairedSnapshot.poster, null);
    assert.deepEqual(store.getSnapshot().getUgcPortfolioItemValidationErrors('ugc-travel-01'), []);

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
    } finally {
      globalThis.fetch = originalFetch;
    }

    const putCalls = fetchCalls.filter((call) => call.init?.method === 'PUT');
    assert.ok(
      putCalls.some((call) => call.input.includes('public/images/ugc/ugc-travel-01.webp')),
      'repaired image source should still upload before site.json',
    );
    assert.ok(
      putCalls.some((call) => call.input.includes('src/data/site.json')),
      'publishing the repaired slot should still write site data',
    );
    assert.ok(
      putCalls.every((call) => !call.input.includes('ugc-travel-01-poster')),
      'clearing the poster should discard any pending poster upload before publish',
    );
  } finally {
    restoreFileReader();
  }
});

test('focused playback helper flips to audible looping playback immediately and swallows rejections', async () => {
  let syncSnapshot = null;
  const playbackStates = [];
  const immediateVideo = {
    currentTime: 17,
    loop: false,
    muted: true,
    paused: true,
    play() {
      syncSnapshot = {
        currentTime: this.currentTime,
        loop: this.loop,
        muted: this.muted,
      };
      this.paused = false;
      return Promise.resolve();
    },
  };

  assert.equal(await playFocusedVideoPlayback(immediateVideo, (isPlaying) => playbackStates.push(isPlaying)), true);
  assert.deepEqual(syncSnapshot, {
    currentTime: 0,
    loop: true,
    muted: false,
  });
  assert.deepEqual(playbackStates, [true]);

  const rejectedStates = [];
  const rejectedVideo = {
    currentTime: 4,
    loop: false,
    muted: true,
    paused: true,
    play() {
      return Promise.reject(new Error('gesture rejected'));
    },
  };

  assert.equal(await playFocusedVideoPlayback(rejectedVideo, (isPlaying) => rejectedStates.push(isPlaying)), false);
  assert.equal(rejectedVideo.currentTime, 0);
  assert.equal(rejectedVideo.loop, true);
  assert.equal(rejectedVideo.muted, false);
  assert.deepEqual(rejectedStates, [false]);
});

test('preview stop helpers pause and reset all previews before focused playback starts', async () => {
  const playbackLog = [];
  const clickedPreview = {
    currentTime: 9,
    muted: false,
    pause() {
      playbackLog.push(`pause:clicked:${this.currentTime}`);
    },
  };
  const hiddenPreview = {
    currentTime: 4,
    muted: false,
    pause() {
      playbackLog.push(`pause:hidden:${this.currentTime}`);
    },
  };

  stopPreviewVideoPlayback(clickedPreview);
  assert.equal(clickedPreview.currentTime, 0);
  assert.equal(clickedPreview.muted, true);

  clickedPreview.currentTime = 12;
  clickedPreview.muted = false;

  const focusedVideo = {
    currentTime: 21,
    loop: false,
    muted: true,
    paused: true,
    play() {
      playbackLog.push(`play:focused:${clickedPreview.currentTime}:${hiddenPreview.currentTime}`);
      this.paused = false;
      return Promise.resolve();
    },
  };

  stopAllPreviewVideoPlayback({
    clicked: clickedPreview,
    hidden: hiddenPreview,
  });
  await playFocusedVideoPlayback(focusedVideo);

  assert.deepEqual(playbackLog, [
    'pause:clicked:9',
    'pause:clicked:12',
    'pause:hidden:4',
    'play:focused:0:0',
  ]);
  assert.equal(clickedPreview.currentTime, 0);
  assert.equal(clickedPreview.muted, true);
  assert.equal(hiddenPreview.currentTime, 0);
  assert.equal(hiddenPreview.muted, true);
});

test('UGC viewer and editor source expose flushSync playback, right-edge controls, and poster clearing', async () => {
  const [sheetSource, editorSource, storeSource] = await Promise.all([
    readSource('src/components/UgcContactSheet.tsx'),
    readSource('src/components/admin/EditableUgcPortfolio.tsx'),
    readSource('src/components/admin/adminStore.ts'),
  ]);

  assert.match(sheetSource, /from ['"]react-dom['"]/);
  assert.match(
    sheetSource,
    /onClick=\{\(event\) => \{[\s\S]*?stopAllPreviewVideoPlayback\(previewVideoRefs\.current\);[\s\S]*?flushSync\(\(\) => \{[\s\S]*?setActiveId\(item\.id\)[\s\S]*?\}\)[\s\S]*?playFocusedVideoPlayback\(/,
    'tile click should stop all preview playback before flushSync opens the viewer and starts focused playback within the same gesture path',
  );
  assert.match(
    sheetSource,
    /onKeyDown=\{\(event\) => \{[\s\S]*?(?:Enter|Space|NumpadEnter)[\s\S]*?stopAllPreviewVideoPlayback\(previewVideoRefs\.current\);[\s\S]*?flushSync\(\(\) => \{[\s\S]*?setActiveId\(item\.id\)[\s\S]*?\}\)[\s\S]*?playFocusedVideoPlayback\(/,
    'keyboard activation should stop all preview playback before synchronously mounting the viewer and starting focused playback',
  );
  assert.match(
    sheetSource,
    /const closeDialog = \(\) => \{[\s\S]{0,220}?stopAllPreviewVideoPlayback\(previewVideoRefs\.current\);[\s\S]{0,220}?resetFocusedVideoPlayback\(focusedVideoRef\.current\);[\s\S]{0,220}?setActiveId\(null\);[\s\S]{0,80}?\}/,
    'closing the viewer should leave every preview video paused and reset until the next hover',
  );
  assert.match(
    sheetSource,
    /className="absolute right-4 top-4 z-10[\s\S]*\{copy\.close\}/,
    'viewer close control should stay anchored at the top-right corner',
  );
  assert.match(
    sheetSource,
    /className="absolute right-4 top-1\/2 flex -translate-y-1\/2 flex-col items-center gap-3[\s\S]*aria-label=\{copy\.previous\}[\s\S]*aria-label=\{copy\.next\}[\s\S]*\{activeVisibleIndex \+ 1\} \/ \{visibleItems\.length\}/,
    'viewer arrows and counter should stay as a right-edge vertical stack with the counter below the arrows',
  );
  assert.doesNotMatch(
    editorSource,
    /item\.type === 'video' \|\| Boolean\(item\.poster\)/,
    'image items with stale posters should not keep the poster upload control visible',
  );
  assert.match(
    editorSource,
    /item\.type === 'video'\s*\?\s*\([\s\S]*label="🖼 Change poster"/,
    'video items should keep the poster upload control',
  );
  assert.match(
    editorSource,
    /(?:Boolean\(item\.poster\)|item\.poster)\s*\?\s*\([\s\S]*Clear poster/,
    'image items with stale posters should keep only the clear action',
  );
  assert.match(editorSource, /Clear poster/);
  assert.match(editorSource, /clearUgcPortfolioPoster\(item\.id\)/);
  assert.match(storeSource, /clearUgcPortfolioPoster\s*\(/);
  assert.match(
    storeSource,
    /if\s*\(\s*item\.type\s*!==\s*['"]video['"]\s*\)\s*\{\s*throw new Error\(['"]Poster uploads are only available for video UGC items\.['"]\);\s*\}/,
    'admin store should reject poster uploads unless the current UGC slot is a video',
  );
});
