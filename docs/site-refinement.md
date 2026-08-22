# Site refinement reference

## 1. Visual system

### Palette
- Strict opaque palette only: Paper `#F4F5F1`, Ink `#060403`, Amaranth `#E83256`
- Softer borders, fills, shadows, and overlays must be transparent variants of those three colors only
- Do not introduce extra opaque blush, mist, rose-gold, or alternate amaranth tones

### Contrast rules
- Paper vs ink: `18.68`
- Ink text on amaranth: `4.89`
- Amaranth on paper is for large text, icons, borders, cursor, and decoration, not small body copy
- Avoid small paper text on amaranth fills
- Do not solve contrast with new opaque support colors

### Typography
- Heading/body: Instrument Sans
- Accent: Instrument Serif
- Fonts are loaded from Google Fonts in `BaseLayout.astro` and `AdminLayout.astro`
- `TypedTitle` keeps a reserved cursor gap and uses a permanently blinking amaranth `_` cursor

### Shared shell
- The public header stays visually seamless with the first section; no rounded shell, separate band, or resting icon chrome
- Social, language, and menu icon controls stay flat/transparent at rest and only lift with an amaranth bottom shadow on hover/focus

## 2. Route and component ownership

### Layouts
- `src/layouts/BaseLayout.astro` — public shell, SEO head, header/footer, Lenis runtime, Astro router
- `src/layouts/AdminLayout.astro` — admin shell, noindex meta, identity bootstrap, toolbar

### Shared public views
- `src/views/HomePage.astro` — Checkpoint 1 hero, GSAP-only home orbit carousel, about, proof section
- `src/views/UgcPage.astro` — editorial hero, fixed 12-slot UGC contact sheet, mixed-media focus viewer
- `src/views/TranslationSeoPage.astro` — typed hero, service switcher, arsenal, tabs, methodology, why section
- `src/views/BlogIndexPage.astro` — locale-scoped blog index
- `src/views/ContactPage.astro` — twin contact forms

### Public interactive components
- `TypedTitle.astro` — Typed.js SSR-safe headings
- `OvalMediaOrbit.tsx` — home orbit only
- `UgcContactSheet.tsx` — fixed UGC contact sheet grid, hover previews, and filter-scoped focus viewer
- `ServiceSwitcher.tsx` — translation route only
- `ExperienceTabs.tsx` — translation route only
- `Header.astro`, `Footer.astro` — shared chrome

### Admin components
- `AdminInit.tsx` — Netlify Identity bootstrap + tokenless preview fallback
- `AdminToolbar.tsx` — draft/publish controls and ES/EN/FR switcher
- `EditableText.tsx`, `EditableImage.tsx`, `EditableMedia.tsx` — inline editing primitives
- `EditableOrbitCollection.tsx` — orbit schema editing
- `EditableCollection.tsx` — translation arsenal editing
- `EditableUgcPortfolio.tsx` — fixed-slot UGC portfolio editor with per-slot media and ES/EN/FR fields
- `AdminOrbitPreview.tsx` — static orbit preview without autoplay runtime or visible controls

## 3. Library ownership

- CSS / Tailwind: spacing, colors, layout, focus, typography
- Framer Motion: scroll reveal, stagger, parallax, hover lift, UGC contact-sheet grid/viewer transitions
- GSAP + ScrollTrigger: public Home and Translation routes only; the Home orbit carousel is GSAP-only
- Lenis: global smooth-scroll runtime in public layout only; stops under reduced motion
- Typed.js: `TypedTitle.astro` only
- Astro transitions `ClientRouter`: public layout only

No route should pull legacy Embla bundles, and no non-Home route should pull the Home orbit runtime.

## 4. Orbit contract

### Data source
`src/data/site.json > orbitMedia`

Each item keeps:
- `id`
- `type` (`image` | `video`)
- `src`
- `poster` for videos
- `href`
- localized `label`
- localized `alt`

The initial 15 slots currently point at local `public/images/orbit/mock-*.webp` mock assets. Admin users can replace those temporary images, posters, and optional links without code changes.

### Geometry
From `src/lib/orbitMedia.ts`:
- canvas `720 x 440`
- `radiusX: 324`
- `radiusY: 145`
- `tiltDeg: -18`
- `ORBIT_REVOLUTION_SECONDS: 76`

### Behavior
- entrance animation uses GSAP only when reduced motion is off
- continuous drift is GSAP-only and completes one revolution every 76 seconds
- there are no visible previous/next buttons, dots, drag/swipe gestures, wheel handlers, or keyboard carousel controls
- pointer hover pauses the full orbit, enlarges the active tile, and dims the rest
- visible orbit videos autoplay muted when reduced motion is off
- pointer hover is allowed to attempt audible playback; if the browser blocks it, the video falls back to muted playback and the sound button exposes the blocked state
- touch interaction keeps muted playback until the user taps the explicit sound toggle
- reduced motion keeps the orbit static and pauses videos
- admin preview is static and poster-first

## 5. UGC editorial contact sheet contract

### Data source
`src/data/site.json > ugcPortfolio`

Each item keeps:
- `id`
- `category` (`travel` | `languages` | `art`)
- `type` (`image` | `video`)
- `src`
- `poster` (`null` for images, required for videos)
- localized `label`
- localized `title`
- localized `description`
- localized `format`
- localized `alt`

The authored grid is fixed at 12 interleaved slots:
- slot order stays authored; filters never reflow, reorder, add, or remove cells
- categories stay balanced at `4 / 4 / 4` for Travel, Languages, and Art
- each category stays balanced at `2 image + 2 video`
- the initial temporary media live at local `/images/ugc/mock-01.webp` … `/images/ugc/mock-12.webp` and `/images/ugc/mock-02.mp4` … `/images/ugc/mock-12.mp4`
- admin replacement keeps those paths local and updates the fixed slot in place instead of generating new layout entries

### Filters and grid
- `UgcContactSheet.tsx` owns the public and admin-preview UGC interaction
- desktop grid stays `4 x 3`; mobile stays `2 x 6`
- `All`, `Travel`, `Languages`, and `Art` are the only filters
- non-matching items white out to plain paper cells with no hover/click affordance
- matching items stay in their exact cells; the contact sheet never collapses gaps
- image hover scales to about `1.055` and reveals the compact ink label
- video hover swaps the poster for a muted looping preview and resets to time `0` on leave

### Focus viewer
- clicking a visible tile opens the full-screen ink overlay viewer and locks body scroll
- desktop layout uses left project copy, centered `9:16` media, and right-side vertical arrows/counter
- mobile stacks the copy above the same `9:16` frame while keeping the controls at the right edge
- up/down arrows and keyboard `ArrowUp`/`ArrowDown` navigate only within the active filter; `All` navigates all 12 items
- navigation wraps, `Escape` closes, and focus returns to the originating tile
- images stay `object-fit: cover`
- viewer videos autoplay audibly, loop, and clicking the focused video toggles play/pause
- navigating away pauses, resets, and remutes the previous video before the next item mounts

### Admin editing
- `/admin/ugc` mirrors the public hero, filters, grid, and focus viewer as a preview above the editor
- `EditableUgcPortfolio.tsx` exposes 12 fixed slot forms only; there are no add/remove/reorder controls
- each slot can edit category, type, primary media, poster, and ES/EN/FR `label`, `title`, `description`, `format`, and `alt`
- Spanish edits still backfill DE/IT/CA until code-managed locales are updated explicitly
- image uploads stay <= `2 MB`; video uploads stay <= `8 MB`
- accepted images: JPEG, PNG, WebP, GIF; accepted videos: MP4, WebM, QuickTime/MOV
- pending binary uploads stay memory-only and must be reselected after reload

## 6. Translation page behavior

- Typed hero title remains SSR-readable
- `ServiceSwitcher` is the only rotating service control; hover/focus/document-hidden/reduced-motion all pause its timer
- arsenal cards render from shared site data helpers, not duplicated translation-only arrays
- `ExperienceTabs` owns the two-panel education/experience browser tab UI
- `translationPageMotion.ts` owns GSAP section lines/cards/connectors and must revert cleanly on Astro navigation

## 7. Admin collection semantics

### Inline locales
Editable in admin:
- ES
- EN
- FR

Code-managed:
- DE
- IT
- CA

When an admin adds new orbit/tool/skill/language copy, Spanish is the fallback source for code-managed locales until code updates those values explicitly.

### Drafts and publish
- Drafts live in local storage under the admin store
- Pending binary uploads are not stored fully in local storage; they must be reselected after reload
- Publish writes changed locale JSON, changed `src/data/site.json`, uploaded assets, and blog markdown files
- Blog creation is restricted to ES/EN/FR

## 8. Locale scope and fallback

Astro config:
- default locale: `es`
- prefixed locales: `en`, `fr`, `de`, `it`, `ca`
- Spanish stays unprefixed

Header language controls must expose all six locales.

## 9. Astro lifecycle cleanup rules

- `TypedTitle.astro` destroys Typed instances on `astro:before-preparation` and re-inits on `astro:page-load`
- `Header.astro` cleans listeners before swaps and restores focus when overlays close
- `ContactPage.astro` and `UgcPage.astro` re-run their client initializers on `astro:page-load`
- `GsapPageRuntime.astro` kills ScrollTriggers on route cleanup
- `translationPageMotion.ts` must be cancellable across async imports and revisits

## 10. Performance and reduced-motion rules

### Performance
- referenced raster assets should stay in WebP unless SVG/video behavior requires otherwise
- referenced non-video raster assets should stay <= 500KB
- first meaningful hero media may use `loading="eager"` + `fetchpriority="high"`
- below-fold images use `loading="lazy"` + `decoding="async"`
- videos use `preload="metadata"` and posters where required
- admin should not ship Home orbit motion libraries

### Reduced motion
- Lenis stops
- TypedTitle resolves instantly
- orbit stops moving and pauses video playback
- service switcher timer pauses
- experience tab panel changes become immediate
- translation GSAP sections render their final state directly
- footer has no continuous animation loop

## 11. Tests and commands

Run from repository root:

```bash
npm install
npm test
npm run build
CHECK_DIST=1 npm test
```

Development server startup follows `AGENTS.md` (`astro dev --background`).

Important contracts live in:
- `tests/site-contract.test.mjs`
- `tests/runtime-contract.test.mjs`
- `tests/phase3-orbit-contract.test.mjs`
- `tests/phase4-translation-contract.test.mjs`
- `tests/phase5-refinement-contract.test.mjs`

## 12. External references

Use as references only:
- Astro routing: https://docs.astro.build/en/guides/routing/
- Astro components: https://docs.astro.build/en/basics/astro-components/
- Astro styling: https://docs.astro.build/en/guides/styling/
- Astro i18n: https://docs.astro.build/en/guides/internationalization/

## 13. No-copy boundary

Do not copy external code, templates, or third-party assets into this repository. External URLs above are implementation references only; design, copy, and assets in this project must stay original and repository-owned.
