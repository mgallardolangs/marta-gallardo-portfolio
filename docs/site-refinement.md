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
- `src/views/ContactPage.astro` — editorial contact hero + tabbed inquiry desk
- `src/components/BlogArticleLayout.astro` — shared article shell for every locale blog detail route

### Public interactive components
- `TypedTitle.astro` — Typed.js SSR-safe headings
- `OvalMediaOrbit.tsx` — home orbit only
- `UgcContactSheet.tsx` — fixed UGC contact sheet grid, hover previews, and filter-scoped focus viewer
- `ServiceSwitcher.tsx` — translation route only
- `ExperienceTabs.tsx` — translation route only
- `BlogTableOfContents.tsx` — sticky desktop article navigation and mobile TOC chips for H2/H3 headings
- `Header.astro`, `Footer.astro` — shared chrome

### Admin components
- `AdminInit.tsx` — Netlify Identity bootstrap + tokenless preview fallback
- `AdminToolbar.tsx` — Spanish draft/publish controls and ES/EN/FR switcher
- `EditableText.tsx`, `EditableImage.tsx`, `EditableMedia.tsx` — inline editing primitives
- `EditableOrbitCollection.tsx` — orbit schema editing
- `AdminTranslationArsenalEditor.tsx` — integrated translation arsenal editing
- `AdminTranslationExperienceEditor.tsx` — expandable education/experience browser editor
- `EditableUgcPortfolio.tsx` — fixed-slot UGC portfolio editor with per-slot media and ES/EN/FR fields
- `BlogPostForm.tsx` — strict editorial blog composer with featured-image upload, Markdown toolbar, and live outline
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

## 6. Translation page checkpoints and behavior

### Checkpoint 1 — hero and services
- Hero stays flat on paper with no gradient, side card, or extra media
- Typed hero title remains SSR-readable and keeps the lower-right vertical `heroMark`
- CTAs stay rectangular with ink bottom-shadow lift on hover/focus
- `ServiceSwitcher` is the only rotating service control
- each service item carries a localized `headline` plus description
- the service switcher keeps the precise 6-second rAF timer and pauses on hover, focus, hidden document, and reduced motion

### Checkpoint 2 — compact arsenal
- arsenal content renders from shared site-data helpers, not duplicated translation-only arrays
- skills are stored with `group: 'translation' | 'seo'` and render as two in-column subgroups
- public and admin live-preview outer grids use exact `lg:grid-cols-3` equal thirds rather than weighted fractions
- public/admin tool tiles stay `aspect-square w-full min-w-0` with logos constrained to a 24px max footprint, and the dashed admin add-tool tile keeps the same square size
- admin collection editing keeps the add actions inside their owning column/group:
  - languages add below the authored rows
  - tools add from the dashed in-grid tile
  - skills add from separate translation and SEO group composers

### Checkpoint 3 — experience and education
- `ExperienceTabs` owns the two-panel education/experience browser-window tab UI
- the public shell keeps the ink browser chrome, amaranth dot, upper-left tabs, stable panel height, and keyboard tab semantics
- public experience cards wrap through one, two, and three responsive columns as entries grow
- `/admin/translation-seo` mirrors the browser-tab structure and can add Education bullets or Experience cards with required ES/EN/FR fields
- new DE/IT/CA entries inherit Spanish; later Spanish edits continue updating only parked fallback values, never distinct localized copy

### Checkpoint 4 — methodology
- methodology keeps the ink section, typed display title, four bordered steps, and connector that draws horizontally on desktop and vertically on mobile
- `translationPageMotion.ts` reveals the methodology connector first, then staggers the four steps
- methodology step wrappers stay overflow-visible and animate with only `autoAlpha`/`y` so the 4px hover lift never clips the numbered badge
- public and admin methodology cards use equal-height desktop steps with `md:min-h-[170px]`

### Checkpoint 5 — why choose me
- why cards stay in one flush three-column grid with inline bracket numbers `[ 01 ]`, `[ 02 ]`, `[ 03 ]`
- the cards keep the ink wipe hover/focus treatment and stagger upward on scroll
- `translationPageMotion.ts` owns the Arsenal line/item draws plus the methodology and why stagger motion, and must revert cleanly on Astro navigation

## 7. Blog editorial contract

### Index and archive
- `src/lib/blog.ts` scopes each index to the active locale, sorts descending by date, promotes exactly one latest story, and keeps the remaining archive newest-first
- the featured latest story never repeats inside the archive list
- `BlogIndexPage.astro` keeps the approved eyebrow, typed `Blog` title, one featured row, and the localized `Archive` rail
- the latest story uses the larger `1.05fr / 0.95fr` editorial split and eager hero-media loading when an image exists
- archive rows keep numbering from `02` onward when a latest story exists, and the localized empty placeholder row still renders when there is only one post or none
- one logical post is six locale Markdown files grouped by `translationKey` plus the shared slug, date, and image metadata
- the public coming-soon row appears only when the current locale has fewer than two posts

### Article layout and TOC
- every locale detail route renders through `src/components/BlogArticleLayout.astro`; locale wrappers only provide the scoped post, rendered headings, and alternate links
- article navigation is built from rendered headings, but only H2/H3 entries become outline items
- `src/lib/blogOutline.ts` generates deterministic Astro-compatible IDs and nested numbering (`01`, `01.1`, `01.2`, ...)
- `BlogTableOfContents.tsx` owns the sticky desktop rail, mobile horizontal chips, hash decoding, and IntersectionObserver-driven active state
- when there is no adjacent older locale post, the article footer falls back to the localized `/blog` archive instead of a dead next-story link

### Admin editorial workflow
- `/admin/blog` mirrors the grouped multilingual list with no rounded or pastel card chrome
- `/admin/blog/new` and edit use `BlogPostForm.tsx` for a strict-palette field grid, fixed slug, and publish-through-Git-Gateway flow
- create/edit require every locale currently exposed by `publicLanguagePicker`; hidden locales fall back to Spanish on create and preserve their stored localized text on edit
- toolbar actions are limited to `H2 Section`, `H3 Subsection`, `Bold`, and `Link`
- the live outline panel parses the current Markdown body and mirrors the same nested H2/H3 structure that the public TOC will render
- delete removes all six locale Markdown files before any owned-image cleanup, and partial failures return retryable `locale-delete-failed` / `image-cleanup-failed` status with remaining paths

### Featured image assets-first and retry behavior
- featured images accept JPEG, PNG, WebP, and GIF only, with a hard `2 MB` max
- duplicate slugs are rejected before any repository write
- `createBlogPost()` uploads the featured image to `public/images/blog/<slug>.<ext>` before creating `src/content/blog/<slug>.md`
- the generated Markdown frontmatter writes the public image path so the article and latest-story card can reuse the same asset
- featured-image retries upsert the existing asset by fetching its current SHA first, which lets a second publish attempt reuse an orphaned uploaded image instead of failing before the Markdown write

## 8. Contact inquiry desk contract

### Switcher, tabs, and forms
- `src/views/ContactPage.astro` renders the paper editorial hero plus one ink inquiry desk with a two-tab switcher.
- `src/pages/admin/contact.astro` mirrors the same public structure and keeps ES/EN/FR `EditableText` controls for hero copy, tabs, field labels, response note, send label, and success copy.
- `src/lib/contactSwitcher.ts` owns `CONTACT_TAB_IDS`, `getContactTabTargetIndex()`, `getContactPanelState()`, and the rerun-safe tab initializer/cleanup pair.
- `UGC` is always the initial active tab. Only one panel is visible at a time, and hidden panels use the `hidden` attribute rather than unmounting.
- The desk uses `tablist` / `tab` / `tabpanel` relationships, click switching, and keyboard switching for `ArrowLeft`, `ArrowRight`, `Home`, and `End`. Selection is per-visit only; there is no persisted storage.
- Both Netlify forms must remain in the server-rendered and built HTML so form detection still finds `ugc-contact` and `seo-contact`. Each form keeps its hidden `form-name` input.
- Each inquiry form contains exactly three authored fields: required email/contact, optional company, and required project-details textarea. There is no Budget field and no Name field.
- UGC uses the localized creative-project details label, while Translation/SEO uses the localized adaptation/localization details label.

### Submission lifecycle
- `src/lib/contactForms.js` re-exports the switcher helpers and keeps submission behavior separate from tab state.
- Successful AJAX submission hides only the submitted `.contact-form` and reveals that panel’s sibling `.contact-success` block, leaving the other tab usable.
- Non-OK responses or network errors fall back to native form submission so Netlify handling still works without JavaScript fetch success.
- Validation keeps required-field custom messages localized and preserves entered values on error.

## 9. Admin collection semantics

### Inline locales
Editable in admin:
- ES
- EN
- FR

Code-managed:
- DE
- IT
- CA

When an admin adds new orbit/tool/skill/language/education/experience copy, Spanish is the fallback source for code-managed locales until code updates those values explicitly.

Fixed admin controls, help text, validation errors, upload guidance, and publish
messages are written directly in Spanish. Editable multilingual website content
remains in the locale JSON files.

### Drafts and publish
- Drafts live in local storage under the admin store
- Pending binary uploads are not stored fully in local storage; they must be reselected after reload
- Spanish draft warnings clarify that files only need reselection if the page reloads before publishing
- Publish refreshes the Netlify Identity JWT before Git Gateway reads and writes, so editing sessions longer than one hour remain publishable
- If the Identity session cannot refresh, the editor keeps all in-memory changes and asks the user to sign in again
- Publish writes changed locale JSON, changed `src/data/site.json`, uploaded assets, and blog markdown files
- Blog post forms follow the current public-picker locales; hidden blog locales keep Spanish fallback on create and preserve their stored text on edit

## 10. Locale scope and fallback

Astro config:
- default locale: `es`
- prefixed locales: `en`, `fr`, `de`, `it`, `ca`
- Spanish stays unprefixed

Header language controls must expose all six locales.

## 11. Astro lifecycle cleanup rules

- `TypedTitle.astro` destroys Typed instances on `astro:before-preparation` and re-inits on `astro:page-load`
- `Header.astro` cleans listeners before swaps and restores focus when overlays close
- `ContactPage.astro`, `src/pages/admin/contact.astro`, and `UgcPage.astro` re-run their client initializers on `astro:page-load` and clean them up on `astro:before-preparation`
- `GsapPageRuntime.astro` kills ScrollTriggers on route cleanup
- `translationPageMotion.ts` must be cancellable across async imports and revisits

## 12. Performance and reduced-motion rules

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

## 13. Tests and commands

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
- `tests/blog-editorial-contract.test.mjs`
- `tests/blog-locale-contract.test.mjs`
- `tests/contact-inquiry-switcher.test.mjs`
- `tests/contact-forms.test.mjs`

## 14. External references

Use as references only:
- Astro routing: https://docs.astro.build/en/guides/routing/
- Astro components: https://docs.astro.build/en/basics/astro-components/
- Astro styling: https://docs.astro.build/en/guides/styling/
- Astro i18n: https://docs.astro.build/en/guides/internationalization/

## 15. No-copy boundary

Do not copy external code, templates, or third-party assets into this repository. External URLs above are implementation references only; design, copy, and assets in this project must stay original and repository-owned.
