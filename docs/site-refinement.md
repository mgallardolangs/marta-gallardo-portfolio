# Site refinement reference

## 1. Visual system

### Palette
- Paper: `#F4F5F1`
- Ink: `#060403`
- Amaranth fill: `#E83256`
- Amaranth text on paper: `#C21F45`
- Soft amaranth: `#F5C4CD`
- Mist: `#F8E8EB`

### Contrast rules
- Paper vs ink: `18.68`
- Ink text on amaranth: `4.89`
- Small amaranth text on paper must use the darker text tone, not base amaranth
- Avoid small paper text on amaranth fills

### Typography
- Heading/body: Instrument Sans
- Accent: Instrument Serif
- Fonts are loaded from Google Fonts in `BaseLayout.astro` and `AdminLayout.astro`

## 2. Route and component ownership

### Layouts
- `src/layouts/BaseLayout.astro` — public shell, SEO head, header/footer, Lenis runtime, Astro router
- `src/layouts/AdminLayout.astro` — admin shell, noindex meta, identity bootstrap, toolbar

### Shared public views
- `src/views/HomePage.astro` — hero, orbit, about, proof section
- `src/views/UgcPage.astro` — hero carousel, niche cards, galleries
- `src/views/TranslationSeoPage.astro` — typed hero, service switcher, arsenal, tabs, methodology, why section
- `src/views/BlogIndexPage.astro` — locale-scoped blog index
- `src/views/ContactPage.astro` — twin contact forms

### Public interactive components
- `TypedTitle.astro` — Typed.js SSR-safe headings
- `OvalMediaOrbit.tsx` — home orbit only
- `ServiceSwitcher.tsx` — translation route only
- `ExperienceTabs.tsx` — translation route only
- `PhotoMasonry.tsx`, `VideoGallery.tsx`, `NicheCard.tsx` — UGC route
- `Header.astro`, `Footer.astro` — shared chrome

### Admin components
- `AdminInit.tsx` — Netlify Identity bootstrap + tokenless preview fallback
- `AdminToolbar.tsx` — draft/publish controls and ES/EN/FR switcher
- `EditableText.tsx`, `EditableImage.tsx`, `EditableMedia.tsx` — inline editing primitives
- `EditableOrbitCollection.tsx` — orbit schema editing
- `EditableCollection.tsx` — translation arsenal editing
- `AdminOrbitPreview.tsx` — static orbit preview without GSAP/Embla

## 3. Library ownership

- CSS / Tailwind: spacing, colors, layout, focus, typography
- Framer Motion: scroll reveal, stagger, parallax, hover lift, UGC gallery transitions
- GSAP + ScrollTrigger: public Home and Translation routes only
- Embla: public Home orbit only
- Lenis: global smooth-scroll runtime in public layout only; stops under reduced motion
- Typed.js: `TypedTitle.astro` only
- Astro transitions `ClientRouter`: public layout only

No other route should pull GSAP or Embla bundles.

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

### Geometry
From `src/lib/orbitMedia.ts`:
- canvas `690 x 430`
- `radiusX: 296`
- `radiusY: 154`
- `tiltDeg: -18`
- `ORBIT_REVOLUTION_SECONDS: 68`

### Behavior
- entrance animation uses GSAP only when reduced motion is off
- hover/focus expands the active tile and dims the rest
- videos stay muted unless the user explicitly enables sound
- browser autoplay failures are tolerated and surfaced through button state
- reduced motion keeps the orbit static and pauses videos
- admin preview is static and poster-first

## 5. Translation page behavior

- Typed hero title remains SSR-readable
- `ServiceSwitcher` is the only rotating service control; hover/focus/document-hidden/reduced-motion all pause its timer
- arsenal cards render from shared site data helpers, not duplicated translation-only arrays
- `ExperienceTabs` owns the two-panel education/experience browser tab UI
- `translationPageMotion.ts` owns GSAP section lines/cards/connectors and must revert cleanly on Astro navigation

## 6. Admin collection semantics

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

## 7. Locale scope and fallback

Astro config:
- default locale: `es`
- prefixed locales: `en`, `fr`, `de`, `it`, `ca`
- Spanish stays unprefixed

Header language controls must expose all six locales.

## 8. Astro lifecycle cleanup rules

- `TypedTitle.astro` destroys Typed instances on `astro:before-preparation` and re-inits on `astro:page-load`
- `Header.astro` cleans listeners before swaps and restores focus when overlays close
- `ContactPage.astro` and `UgcPage.astro` re-run their client initializers on `astro:page-load`
- `GsapPageRuntime.astro` kills ScrollTriggers on route cleanup
- `translationPageMotion.ts` must be cancellable across async imports and revisits

## 9. Performance and reduced-motion rules

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

## 10. Tests and commands

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

## 11. External references

Use as references only:
- Astro routing: https://docs.astro.build/en/guides/routing/
- Astro components: https://docs.astro.build/en/basics/astro-components/
- Astro styling: https://docs.astro.build/en/guides/styling/
- Astro i18n: https://docs.astro.build/en/guides/internationalization/

## 12. No-copy boundary

Do not copy external code, templates, or third-party assets into this repository. External URLs above are implementation references only; design, copy, and assets in this project must stay original and repository-owned.
