# Mock-Faithful Shell and Homepage Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inherited pink/pastel shell and broken homepage orbit with the exact approved Checkpoint 1 and Checkpoint 2 design.

**Architecture:** Keep Astro for the shell and homepage composition. Keep Typed.js for title typing and GSAP for the orbit entrance and continuous ellipse movement. Remove Embla from the orbit because the approved interaction has no drag, swipe, wheel, buttons, or keyboard carousel controls; one GSAP progress tween is the smallest correct implementation.

**Tech Stack:** Astro 7, React 19, Tailwind CSS 4, GSAP 3, Typed.js 2.1, Node built-in test runner.

---

## File ownership

- `src/styles/global.css`: strict three-color aliases and affected shared styling primitives.
- `src/components/Header.astro`: seamless desktop/mobile header and hover interactions.
- `src/components/TypedTitle.astro`: amaranth cursor spacing and permanent blink.
- `src/views/HomePage.astro`: exact Checkpoint 1 hero and full-width Checkpoint 2 carousel section.
- `src/components/OvalMediaOrbit.tsx`: GSAP-only automatic orbit, fan-out entrance, and tile hover focus.
- `src/lib/orbitMedia.ts`: approved geometry, timing, and interaction helpers.
- `src/pages/admin/index.astro`: homepage admin mirror.
- `src/components/admin/AdminOrbitPreview.tsx`: strict-palette static orbit preview.
- `src/data/site.json`: 15 local temporary mock images.
- `src/i18n/*.json`: localized carousel title, kicker, and supporting copy.
- `public/images/orbit/mock-*.webp`: locally stored Checkpoint 2 temporary imagery.
- `public/favicon.svg`: transparent black `MG`.
- `tests/mock-faithful-home-contract.test.mjs`: regression contract for the approved checkpoints.

### Task 1: Lock the visual contract with failing tests

**Files:**

- Create: `tests/mock-faithful-home-contract.test.mjs`
- Modify: `tests/phase3-orbit-contract.test.mjs`

- [ ] **Step 1: Add strict-palette tests**

Test the affected source files:

```js
const affectedSources = [
  'src/styles/global.css',
  'src/components/Header.astro',
  'src/components/TypedTitle.astro',
  'src/views/HomePage.astro',
  'src/components/OvalMediaOrbit.tsx',
  'src/pages/admin/index.astro',
  'src/components/admin/AdminOrbitPreview.tsx',
];

const disallowedTokens = [
  /amaranth-soft/,
  /amaranth-mist/,
  /amaranth-ink/,
  /blush-/,
  /rose-gold/,
  /#(?:fff|ffffff)\b/i,
];

test('approved shell and homepage use only paper, ink, amaranth, and their transparency', async () => {
  for (const file of affectedSources) {
    const source = await readSource(file);
    for (const pattern of disallowedTokens) {
      assert.doesNotMatch(source, pattern, `${file} contains ${pattern}`);
    }
  }
});
```

- [ ] **Step 2: Add seamless-header tests**

Assert that:

```js
assert.doesNotMatch(header, /site-header__shell[^]*rounded-/);
assert.doesNotMatch(header, /site-header__shell[^]*(?:border|shadow|backdrop-blur|bg-)/);
assert.match(header, /\.social-control\s*\{[^}]*box-shadow:\s*none/s);
assert.match(header, /\.social-control:(?:hover|focus-visible)[^}]*box-shadow:[^}]*#E83256/s);
```

- [ ] **Step 3: Add Typed.js cursor tests**

Assert that `TypedTitle.astro`:

```js
assert.match(source, /cursorChar:\s*'_'/);
assert.match(source, /:global\(\.typed-cursor\)/);
assert.match(source, /color:\s*var\(--color-amaranth\)/);
assert.match(source, /margin-inline-start:/);
assert.match(source, /animation:[^;]*typed-cursor-blink[^;]*infinite/);
```

- [ ] **Step 4: Add orbit behavior tests**

Replace old Embla expectations with:

```js
assert.doesNotMatch(orbitSource, /embla-carousel|AutoScroll|scrollPrev|scrollNext|onWheel/);
assert.doesNotMatch(orbitSource, /aria-label=\{ui\.(?:previous|next)\}/);
assert.match(orbitSource, /ORBIT_REVOLUTION_SECONDS\s*=\s*76/);
assert.match(orbitSource, /gsap\.to\([^]*repeat:\s*-1[^]*ease:\s*'none'/s);
assert.match(orbitSource, /onPointerEnter/);
assert.match(orbitSource, /pause\(\)/);
assert.match(orbitSource, /grayscale\(1\) brightness\(0\.42\)/);
assert.match(homeSource, /bg-ink/);
assert.doesNotMatch(homeSource, /grid-cols-\[1\.1fr_0\.9fr\]/);
```

- [ ] **Step 5: Add favicon and mock-media tests**

```js
assert.doesNotMatch(favicon, /<rect|fill="#E83256"|fill="#B76E79"/i);
assert.match(favicon, />MG</);

assert.equal(site.orbitMedia.length, 15);
site.orbitMedia.forEach((item, index) => {
  assert.equal(item.src, `/images/orbit/mock-${String(index + 1).padStart(2, '0')}.webp`);
  assert.equal(item.href, null);
});
```

- [ ] **Step 6: Run tests and verify red state**

Run:

```bash
node --test tests/mock-faithful-home-contract.test.mjs tests/phase3-orbit-contract.test.mjs
```

Expected: failures for legacy color aliases, rounded header shell, black Typed cursor, Embla controls, current orbit media, and old favicon.

### Task 2: Enforce the strict palette and seamless shell

**Files:**

- Modify: `src/styles/global.css`
- Modify: `src/components/Header.astro`
- Modify: `src/components/TypedTitle.astro`
- Modify: `public/favicon.svg`

- [ ] **Step 1: Collapse legacy theme aliases to the three approved colors**

Use only:

```css
--color-paper: #F4F5F1;
--color-ink: #060403;
--color-amaranth: #E83256;

--color-cream: var(--color-paper);
--color-charcoal: var(--color-ink);
--color-warm-gray: rgb(6 4 3 / 0.68);
--color-rose-gold: var(--color-amaranth);
--color-blush-50: var(--color-paper);
--color-blush-100: var(--color-paper);
--color-blush-200: var(--color-paper);
--color-blush-300: var(--color-amaranth);
--color-blush-400: var(--color-amaranth);
--color-white: var(--color-paper);
```

Use transparent ink/amaranth inline where needed. Remove named soft/mist/ink variants.

- [ ] **Step 2: Remove the navbar shell styling**

Change the structural wrapper to:

```astro
<div class="site-header__shell flex w-full items-center justify-between px-2 py-1 text-ink md:px-0">
```

The CSS must not add radius, border, shadow, backdrop blur, or background at top or compact state.

- [ ] **Step 3: Keep compact/hide behavior without visual chrome**

Compact state changes only vertical padding:

```css
.site-header[data-compact='true'] {
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}
```

- [ ] **Step 4: Correct icon resting and hover states**

```css
.social-control {
  background: transparent;
  border: 1px solid rgb(6 4 3 / 0.34);
  box-shadow: none;
}

.social-control:hover,
.social-control:focus-visible {
  transform: translateY(-3px);
  border-color: var(--color-ink);
  color: var(--color-ink);
  box-shadow: 0 4px 0 var(--color-amaranth);
}
```

- [ ] **Step 5: Make the Typed cursor amaranth and non-overlapping**

In `TypedTitle.astro`, reserve cursor space and style Typed.js's injected node globally:

```css
.typed-title {
  padding-inline-end: 0.34em;
}

:global(.typed-cursor) {
  margin-inline-start: 0.12em;
  color: var(--color-amaranth);
  animation: typed-cursor-blink 1s steps(1) infinite;
}

@keyframes typed-cursor-blink {
  50% { opacity: 0; }
}
```

Disable Typed.js's own cursor fade and ensure the reserve span includes the final line height.

- [ ] **Step 6: Replace the favicon**

Use:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <text x="32" y="43" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="-2" fill="#060403">MG</text>
</svg>
```

- [ ] **Step 7: Run the targeted shell tests**

Run:

```bash
node --test tests/mock-faithful-home-contract.test.mjs
```

Expected: palette, navbar, cursor, and favicon assertions pass; homepage/carousel assertions remain red.

- [ ] **Step 8: Commit**

```bash
git add src/styles/global.css src/components/Header.astro src/components/TypedTitle.astro public/favicon.svg tests/mock-faithful-home-contract.test.mjs
git commit -m "fix: restore mock-faithful shared shell" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Add the approved temporary carousel imagery and copy

**Files:**

- Create: `public/images/orbit/mock-01.webp` through `mock-15.webp`
- Modify: `src/data/site.json`
- Modify: `src/i18n/es.json`
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/fr.json`
- Modify: `src/i18n/de.json`
- Modify: `src/i18n/it.json`
- Modify: `src/i18n/ca.json`

- [ ] **Step 1: Download the exact seeded mock set locally**

Run:

```bash
mkdir -p public/images/orbit
for i in $(seq 81 95); do
  n=$(printf '%02d' $((i - 80)))
  curl -L --fail --silent --show-error "https://picsum.photos/seed/mg${i}/440/560.webp" \
    -o "public/images/orbit/mock-${n}.webp"
done
```

Verify:

```bash
file public/images/orbit/mock-*.webp
du -h public/images/orbit/mock-*.webp
```

Expected: 15 valid WebP files, each below 500 KB.

- [ ] **Step 2: Point initial orbit data at the temporary mock set**

Keep stable IDs and localized alt/labels, but set:

```json
{
  "src": "/images/orbit/mock-01.webp",
  "href": null
}
```

through `mock-15.webp`.

- [ ] **Step 3: Add localized carousel chrome**

Add this structure to every locale:

```json
"orbit": {
  "kicker": "TRABAJO SELECCIONADO / 01—15",
  "title": "HISTORIAS EN MOVIMIENTO.",
  "description": "IMÁGENES Y VÍDEOS EDITABLES. LOS DESTINOS SE AÑADIRÁN CUANDO SE DEFINAN LOS PROYECTOS.",
  "index": "MARTA GALLARDO · 2026"
}
```

Translations:

- EN title: `STORIES IN MOTION.`
- FR title: `HISTOIRES EN MOUVEMENT.`
- DE title: `GESCHICHTEN IN BEWEGUNG.`
- IT title: `STORIE IN MOVIMENTO.`
- CA title: `HISTÒRIES EN MOVIMENT.`

Translate kicker and description naturally in all five non-Spanish locales.

- [ ] **Step 4: Run data contracts**

Run:

```bash
node --test tests/site-contract.test.mjs tests/mock-faithful-home-contract.test.mjs
```

Expected: locale shape and local mock-media assertions pass.

- [ ] **Step 5: Commit**

```bash
git add public/images/orbit src/data/site.json src/i18n tests/mock-faithful-home-contract.test.mjs
git commit -m "feat: add approved temporary orbit media" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Rebuild the homepage hero from Checkpoint 1

**Files:**

- Modify: `src/views/HomePage.astro`
- Modify: `src/pages/admin/index.astro`
- Modify: `tests/correction-task4-hero-contract.test.mjs`

- [ ] **Step 1: Replace the current hero decoration**

Delete from the affected hero:

- Radial pink gradient.
- Pink glow blobs.
- Floating UGC/SEO cards.
- Large framed portrait.
- Rounded button styling.

- [ ] **Step 2: Implement the Checkpoint 1 hierarchy**

Public hero:

```astro
<section class="home-hero bg-paper px-6 pb-10 pt-28 md:pt-32">
  <div class="site-container home-hero__stage">
    <div class="home-hero__copy">
      <p class="home-hero__eyebrow">{i.home.hero.kicker}</p>
      <TypedTitle as="h1" text={i.hero.name} trigger="load" class="home-hero__title" />
      <div class="home-hero__meta">...</div>
      <RichText text={i.home.hero.description} class="home-hero__description" />
      <div class="home-hero__actions">...</div>
    </div>
    <div class="home-hero__visual" aria-hidden="true">
      <i class="home-hero__frame home-hero__frame--one"></i>
      <i class="home-hero__frame home-hero__frame--two"></i>
      <i class="home-hero__frame home-hero__frame--three"></i>
      <div class="home-hero__mark">MG<span></span></div>
    </div>
  </div>
</section>
```

Use the exact relative positions, ellipse tilt, typography, and CTA treatment from Checkpoint 1.

- [ ] **Step 3: Mirror the hero in admin**

Use `EditableText` for eyebrow, title, age, city, description, and CTA labels. The decorative three-frame oval stays code-owned.

- [ ] **Step 4: Add hero interaction**

- Hero copy enters with one clip/stagger sequence.
- Primary CTA uses a black-to-amaranth fill sweep.
- Secondary CTA underline grows and label shifts by 2 px.
- Abstract frames fan gently into place once.
- No glow, float loop, or pink background animation.

- [ ] **Step 5: Run targeted tests**

Run:

```bash
node --test tests/palette-contract.test.mjs tests/correction-task4-hero-contract.test.mjs tests/phase2-contract.test.mjs
```

Expected: Checkpoint 1 hero assertions pass.

- [ ] **Step 6: Commit**

```bash
git add src/views/HomePage.astro src/pages/admin/index.astro tests
git commit -m "feat: restore approved homepage hero" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 5: Replace the carousel implementation with Checkpoint 2

**Files:**

- Modify: `src/components/OvalMediaOrbit.tsx`
- Modify: `src/lib/orbitMedia.ts`
- Modify: `src/views/HomePage.astro`
- Modify: `src/components/admin/AdminOrbitPreview.tsx`
- Modify: `src/pages/admin/index.astro`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tests/phase3-orbit-contract.test.mjs`
- Modify: `tests/mock-faithful-home-contract.test.mjs`
- Modify: `tests/runtime-contract.test.mjs`

- [ ] **Step 1: Remove carousel controls and Embla**

Delete:

- `useEmblaCarousel`
- `AutoScroll`
- Ghost slide track
- Prev/next controls
- Wheel handler
- Region arrow-key carousel movement
- Drag/swipe behavior
- Explore hint

Remove unused packages:

```bash
npm uninstall embla-carousel-react embla-carousel-auto-scroll
```

- [ ] **Step 2: Set approved geometry and timing**

In `orbitMedia.ts`:

```ts
export const ORBIT_REVOLUTION_SECONDS = 76;

export const DESKTOP_ORBIT_GEOMETRY = {
  width: 720,
  height: 440,
  radiusX: 324,
  radiusY: 145,
  tiltDeg: -18,
} as const;
```

Return a fixed scale of `1` when idle so overlap remains visually consistent:

```ts
const baseScale = 1;
```

Active scale:

```ts
scale: 1.52
```

- [ ] **Step 3: Use one GSAP progress tween**

Create a mutable progress object:

```ts
const progressRef = useRef({ value: 0 });
const driftTweenRef = useRef<gsap.core.Tween | null>(null);
```

After entrance:

```ts
driftTweenRef.current = gsap.to(progressRef.current, {
  value: 1,
  duration: ORBIT_REVOLUTION_SECONDS,
  repeat: -1,
  ease: 'none',
  onUpdate: applyOrbitLayout,
});
```

`applyOrbitLayout()` must use `progressRef.current.value`.

- [ ] **Step 4: Implement entrance exactly**

1. Set all tiles at `left: 50%`, `top: 50%`, `scale: .58`, `opacity: 0`.
2. Animate to each final ellipse coordinate over `1.6s`.
3. Stagger `0.045s` from center.
4. Reveal MG clip, echo rings, and underline on the same timeline.
5. Start drift only in `onComplete`.

- [ ] **Step 5: Implement hover-only interaction**

Tile `onPointerEnter`:

```ts
setActiveId(item.id);
driftTweenRef.current?.pause();
```

Tile `onPointerLeave`:

```ts
setActiveId(null);
driftTweenRef.current?.resume();
```

Do not attach movement handlers to wheel, touch drag, region keydown, or buttons.

Keep video hover audio behavior and offscreen/document playback management.

- [ ] **Step 6: Build the full-width ink section**

`HomePage.astro`:

```astro
<section class="home-orbit bg-ink text-paper">
  <div class="home-orbit__chrome">
    <p>{i.home.orbit.kicker}</p>
    <h2>{i.home.orbit.title}</h2>
    <p>{i.home.orbit.description}</p>
    <span>{i.home.orbit.index}</span>
  </div>
  <OvalMediaOrbit client:visible items={siteData.orbitMedia} lang={lang} />
</section>
```

The orbit is not inside a paper card and has no adjacent About column. Move About to its own later paper section without changing its text.

- [ ] **Step 7: Mirror the section in admin**

- Ink section and same static orbit geometry.
- `EditableText` for kicker, title, description, and index.
- `AdminOrbitPreview` uses paper-colored center mark and approved mock media.
- Collection editor remains below the preview, visually separated from the public composition.

- [ ] **Step 8: Run carousel tests**

Run:

```bash
node --test tests/mock-faithful-home-contract.test.mjs tests/phase3-orbit-contract.test.mjs tests/runtime-contract.test.mjs
```

Expected: no Embla/control assertions remain; geometry, timing, entrance, hover-only behavior, and route-scoped GSAP pass.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/components/OvalMediaOrbit.tsx src/lib/orbitMedia.ts src/views/HomePage.astro src/components/admin/AdminOrbitPreview.tsx src/pages/admin/index.astro tests
git commit -m "feat: restore approved homepage orbit" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 6: Verify and present the live checkpoint

**Files:**

- Modify: `docs/site-refinement.md`
- Modify: `/Users/berengueragulloadrian/.copilot/session-state/441ad769-1603-42cd-8a3d-b1fba6b5c1d2/plan.md`

- [ ] **Step 1: Update documentation**

Document:

- Strict three-color rule.
- Flat navbar icons until hover.
- Amaranth typed cursor.
- GSAP-only autoplay + hover carousel.
- Temporary mock images and replacement workflow.
- No visible carousel controls.

- [ ] **Step 2: Run targeted verification**

```bash
npm test
npm run build
CHECK_DIST=1 npm test
git diff --check
```

- [ ] **Step 3: Run source audits**

```bash
rg -n "amaranth-soft|amaranth-mist|amaranth-ink|blush-|rose-gold|#fff\\b|#ffffff\\b" \
  src/styles/global.css src/components/Header.astro src/components/TypedTitle.astro \
  src/views/HomePage.astro src/components/OvalMediaOrbit.tsx \
  src/pages/admin/index.astro src/components/admin/AdminOrbitPreview.tsx

rg -n "embla|AutoScroll|scrollPrev|scrollNext|onWheel|Explore" \
  src/components/OvalMediaOrbit.tsx
```

Expected: no matches.

- [ ] **Step 4: Restart the approved branch server**

```bash
./node_modules/.bin/astro dev stop
./node_modules/.bin/astro dev --background
./node_modules/.bin/astro dev status
```

- [ ] **Step 5: Verify local routes**

```bash
curl --fail http://localhost:4322/
curl --fail http://localhost:4322/admin/
```

- [ ] **Step 6: Stop for visual approval**

Present the local URL and request review of:

1. Navbar resting and hover states.
2. Typed title cursor.
3. Homepage hero layout.
4. Carousel entrance after hard reload.
5. Slow automatic movement.
6. Hover pause, enlargement, and grey-out.
7. Favicon.

Do not change UGC, Translation/SEO, Blog, Contact, or footer design until the user approves this live checkpoint.
