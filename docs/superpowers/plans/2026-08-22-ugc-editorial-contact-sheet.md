# UGC Editorial Contact Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current UGC page with the approved artistic hero, fixed filtered 12-slot contact sheet, and reel-style mixed-media focus viewer.

**Architecture:** Store the 12 fixed portfolio slots in `site.json` with localized metadata. Render the public grid and viewer as one React island so filter state, hover previews, modal navigation, and video lifecycle stay coherent. Reuse the same component in admin preview mode, with one purpose-built fixed-slot editor for media and ES/EN/FR metadata.

**Tech Stack:** Astro 7, React 19, Tailwind CSS 4, Framer Motion, Typed.js, Node built-in tests, FFmpeg for generated temporary videos.

---

## Task 1: Define data and behavior contracts

**Files:**

- Create: `tests/ugc-contact-sheet-contract.test.mjs`
- Modify: `tests/site-contract.test.mjs`
- Modify: `tests/palette-contract.test.mjs`

- [ ] **Step 1: Add the UGC data contract**

Require:

```js
assert.equal(site.ugcPortfolio.length, 12);
assert.deepEqual(
  Object.fromEntries(['travel', 'languages', 'art'].map(category => [
    category,
    site.ugcPortfolio.filter(item => item.category === category).length,
  ])),
  { travel: 4, languages: 4, art: 4 },
);
```

For each item validate:

```js
assert.match(item.id, /^ugc-(travel|languages|art)-0[1-4]$/);
assert.ok(['image', 'video'].includes(item.type));
assert.ok(item.src.startsWith('/images/ugc/mock-'));
if (item.type === 'video') assert.ok(item.poster.startsWith('/images/ugc/mock-'));
for (const field of ['label', 'title', 'description', 'format', 'alt']) {
  for (const locale of locales) assert.ok(item[field][locale].trim());
}
assert.ok(item.description.es.split(/[.!?]+/).filter(Boolean).length <= 2);
```

- [ ] **Step 2: Add fixed-grid/filter contracts**

Require the future component to export pure helpers:

```ts
filterUgcPortfolio(items, 'all')
getUgcTileVisibility(item, filter)
getNextUgcIndex(visibleCount, currentIndex, direction)
```

Assertions:

```js
assert.equal(filterUgcPortfolio(items, 'all').length, 12);
assert.equal(filterUgcPortfolio(items, 'travel').length, 4);
assert.equal(getUgcTileVisibility(travelItem, 'art'), 'blank');
assert.equal(getUgcTileVisibility(travelItem, 'travel'), 'visible');
assert.equal(getNextUgcIndex(4, 0, 'previous'), 3);
assert.equal(getNextUgcIndex(4, 3, 'next'), 0);
```

- [ ] **Step 3: Add component contracts**

Require:

- Hero marker and exact approved copy keys.
- Filters All/Travel/Languages/Art.
- 12-cell CSS grid (`lg:grid-cols-4`, mobile two columns).
- Nonmatching paper-white class without conditional unmount.
- Hover video `play()`/pointer leave `pause()` and reset.
- Full-screen dialog, 9:16 frame, left copy, right up/down controls.
- Active-filter navigation.
- Video `autoPlay`, `loop`, sound enabled after click, and click play/pause.
- No old `NicheCard`, generic hero carousel, separate niche loops, duplicate masonry, or back-to-top links in `UgcPage.astro`.

- [ ] **Step 4: Add admin contracts**

Require:

- Exactly 12 fixed slots.
- No add/remove/reorder buttons.
- Category/type selectors.
- ES/EN/FR inputs for label/title/description/format/alt.
- Editable media and poster.
- `site.json` publish path.

- [ ] **Step 5: Run red tests**

```bash
node --test tests/ugc-contact-sheet-contract.test.mjs tests/site-contract.test.mjs
```

Expected: fail because `ugcPortfolio`, helper, and component do not exist.

- [ ] **Step 6: Commit**

```bash
git add tests
git commit -m "test: define artistic UGC contact sheet" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 2: Create temporary mixed media and localized data

**Files:**

- Create: `public/images/ugc/mock-01.webp` through `mock-12.webp`
- Create: `public/images/ugc/mock-02.mp4`, `mock-04.mp4`, `mock-06.mp4`, `mock-08.mp4`, `mock-10.mp4`, `mock-12.mp4`
- Modify: `src/data/site.json`
- Modify: `src/lib/siteData.ts`
- Modify: `src/i18n/es.json`, `en.json`, `fr.json`, `de.json`, `it.json`, `ca.json`

- [ ] **Step 1: Download 12 seeded square posters**

```bash
mkdir -p public/images/ugc
for i in $(seq 1 12); do
  n=$(printf '%02d' "$i")
  curl -L --fail --silent --show-error \
    "https://picsum.photos/seed/mg-ugc-${n}/720/720.webp" \
    -o "public/images/ugc/mock-${n}.webp"
done
```

- [ ] **Step 2: Generate six 9:16 mock videos**

For every even slot:

```bash
ffmpeg -loop 1 -i "public/images/ugc/mock-02.webp" \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,zoompan=z='min(zoom+0.0007,1.08)':d=120:s=720x1280:fps=30,format=yuv420p" \
  -t 4 -c:v libx264 -crf 28 -preset veryfast -movflags +faststart \
  "public/images/ugc/mock-02.mp4"
```

Repeat for `04`, `06`, `08`, `10`, and `12`.

- [ ] **Step 3: Add typed data**

In `siteData.ts`:

```ts
export type UgcCategory = 'travel' | 'languages' | 'art';

export type UgcPortfolioItem = {
  id: string;
  category: UgcCategory;
  type: 'image' | 'video';
  src: string;
  poster: string | null;
  label: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  format: LocalizedText;
  alt: LocalizedText;
};
```

- [ ] **Step 4: Add 12 interleaved records**

Order:

```text
travel-01, languages-01, art-01,
travel-02, languages-02, art-02,
travel-03, languages-03, art-03,
travel-04, languages-04, art-04
```

Even slots are videos. Descriptions are conceptual mock descriptions of no more than two sentences and make no client/result claims.

- [ ] **Step 5: Add localized page chrome**

Add:

```json
"contactSheet": {
  "eyebrow": "UGC · DIRECCIÓN CREATIVA",
  "headline": "CONTENIDO QUE CONVIERTE EXPERIENCIAS, IDIOMAS Y ARTE EN HISTORIAS VISUALES.",
  "filters": {
    "all": "TODO",
    "travel": "VIAJES",
    "languages": "IDIOMAS",
    "art": "ARTE"
  },
  "close": "Cerrar",
  "previous": "Anterior",
  "next": "Siguiente",
  "formatLabel": "FORMATO",
  "pieceLabel": "PIEZA"
}
```

Translate all keys naturally across six locales.

- [ ] **Step 6: Verify media**

```bash
file public/images/ugc/*
find public/images/ugc -type f -size +8M -print
```

Expected: 12 WebP and 6 MP4; no file above 8 MB.

- [ ] **Step 7: Run data tests and commit**

```bash
node --test tests/ugc-contact-sheet-contract.test.mjs tests/site-contract.test.mjs
git add public/images/ugc src/data/site.json src/lib/siteData.ts src/i18n tests
git commit -m "feat: add temporary UGC contact sheet media" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 3: Build the public contact sheet and viewer

**Files:**

- Create: `src/lib/ugcPortfolio.ts`
- Create: `src/components/UgcContactSheet.tsx`
- Rewrite: `src/views/UgcPage.astro`
- Delete if unused: `src/components/NicheCard.tsx`
- Delete if unused: `src/lib/heroCarousel.js`

- [ ] **Step 1: Implement pure helpers**

```ts
export type UgcFilter = 'all' | UgcCategory;

export function filterUgcPortfolio(items: UgcPortfolioItem[], filter: UgcFilter) {
  return filter === 'all' ? items : items.filter(item => item.category === filter);
}

export function getUgcTileVisibility(item: UgcPortfolioItem, filter: UgcFilter) {
  return filter === 'all' || item.category === filter ? 'visible' : 'blank';
}

export function getNextUgcIndex(count: number, index: number, direction: 'previous' | 'next') {
  if (count === 0) return 0;
  return direction === 'next'
    ? (index + 1) % count
    : (index - 1 + count) % count;
}
```

- [ ] **Step 2: Build fixed filters and grid**

`UgcContactSheet.tsx` owns:

```ts
const [filter, setFilter] = useState<UgcFilter>('all');
const [activeId, setActiveId] = useState<string | null>(null);
```

Render all 12 records for every filter. Apply:

```tsx
data-state={getUgcTileVisibility(item, filter)}
className={state === 'blank' ? 'bg-paper pointer-events-none' : 'bg-ink'}
```

Media stays mounted; opacity goes to zero for blank state.

- [ ] **Step 3: Implement hover video previews**

On pointer enter:

```ts
video.muted = true;
video.currentTime = 0;
await video.play();
```

On pointer leave:

```ts
video.pause();
video.currentTime = 0;
```

Show poster until playback begins.

- [ ] **Step 4: Implement focus viewer**

Viewer state derives from:

```ts
const visibleItems = filterUgcPortfolio(items, filter);
const activeIndex = visibleItems.findIndex(item => item.id === activeId);
```

Desktop layout:

```tsx
<div className="grid grid-cols-[minmax(220px,330px)_minmax(270px,390px)_46px]">
  <aside>{/* eyebrow, title, <=2 sentence description, metadata */}</aside>
  <div className="aspect-[9/16]">{/* image or video */}</div>
  <div>{/* ↑, ↓, counter */}</div>
</div>
```

Use `AnimatePresence` for overlay and vertical item changes.

- [ ] **Step 5: Implement viewer video policy**

- Open from click: video auto-plays with sound and loops.
- Click focused video: toggle play/pause.
- On item change/close: pause and reset previous video.
- Browser play rejection: keep viewer open and show poster; do not claim playback.

- [ ] **Step 6: Implement dialog behavior**

- Save previous focus.
- Lock body scroll.
- Focus close button.
- Escape closes.
- Up/Down navigate.
- Trap Tab inside dialog.
- Restore focus to the triggering tile.

- [ ] **Step 7: Rewrite UGC page**

Keep:

```astro
<TypedTitle as="h1" text={i.ugcPage.hero.headline} />
```

Replace current hero carousel, niche intro, niche cards, chapter loops, and final masonry with:

```astro
<section data-ugc-hero>...</section>
<UgcContactSheet client:visible items={siteData.ugcPortfolio} copy={i.ugcPage.contactSheet} lang={lang} />
```

- [ ] **Step 8: Run component tests**

```bash
node --test tests/ugc-contact-sheet-contract.test.mjs tests/phase2-contract.test.mjs
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/ugcPortfolio.ts src/components/UgcContactSheet.tsx src/views/UgcPage.astro tests
git commit -m "feat: build artistic UGC contact sheet" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 4: Build the fixed-slot admin editor

**Files:**

- Create: `src/components/admin/EditableUgcPortfolio.tsx`
- Modify: `src/components/admin/adminStore.ts`
- Rewrite: `src/pages/admin/ugc.astro`
- Modify: `src/components/admin/EditableMedia.tsx` only if a scoped UGC mode is required.

- [ ] **Step 1: Add typed fixed-slot mutations**

```ts
updateUgcPortfolioField(
  id: string,
  field: 'category' | 'type' | 'label' | 'title' | 'description' | 'format' | 'alt',
  value: string,
  lang?: 'es' | 'en' | 'fr',
): void
```

Media upload methods:

```ts
setUgcPortfolioMedia(id: string, file: File): Promise<void>
setUgcPortfolioPoster(id: string, file: File): Promise<void>
```

No insert/remove/reorder methods.

- [ ] **Step 2: Preserve non-destructive type changes**

Changing type does not erase `src` or `poster`. Existing validation requires an explicit compatible upload before publish.

- [ ] **Step 3: Build the 12-slot editor**

Each slot includes:

- Category selector.
- Type selector.
- Media editor.
- Poster editor for video.
- ES/EN/FR fields for label, title, description, format, alt.

Enforce:

```ts
if (description.split(/[.!?]+/).filter(Boolean).length > 2) {
  return 'Description must contain no more than two sentences.';
}
```

- [ ] **Step 4: Mirror public page**

Admin page uses the same hero and `UgcContactSheet` preview. The editor sits below in a plain admin-only section.

- [ ] **Step 5: Test and commit**

```bash
node --test tests/ugc-contact-sheet-contract.test.mjs tests/phase3-orbit-contract.test.mjs
npm run build
git add src/components/admin src/pages/admin/ugc.astro tests
git commit -m "feat: add fixed UGC portfolio editor" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 5: Verify and present UGC live checkpoint

**Files:**

- Modify: `docs/site-refinement.md`
- Modify session artifact: `/Users/berengueragulloadrian/.copilot/session-state/441ad769-1603-42cd-8a3d-b1fba6b5c1d2/plan.md`

- [ ] **Step 1: Document the UGC model**

Document fixed 12 slots, 4/4/4 categories, filter white-out, hover previews, viewer, admin fields, and temporary-media replacement.

- [ ] **Step 2: Run full verification**

```bash
npm test
npm run build
CHECK_DIST=1 npm test
git diff --check
```

- [ ] **Step 3: Audit route isolation and palette**

Verify:

- UGC loads its React island.
- Home orbit is unchanged.
- Contact/Blog remain free of UGC island assets.
- No disallowed opaque color or RGB triplet appears.
- No old UGC `NicheCard`/hero-carousel/chapter-loop markup remains.

- [ ] **Step 4: Restart dev server**

```bash
./node_modules/.bin/astro dev stop
./node_modules/.bin/astro dev --background
./node_modules/.bin/astro dev status
```

- [ ] **Step 5: Stop for user approval**

Review at `/ugc`:

1. Hero.
2. 4×3 grid.
3. All four filters and paper-white fixed cells.
4. Image hover.
5. Video hover preview.
6. Focus viewer layout and copy.
7. Up/down active-filter navigation.
8. Focus video sound/loop/play-pause.
9. Mobile 2-column grid and stacked viewer.
10. Admin editing at `/admin/ugc`.

Do not start the next page until this live checkpoint is approved.
