# UGC Editorial Contact Sheet Design

## Goal

Replace the current card-and-chapter UGC page with the approved artistic Editorial Contact Sheet: an editorial hero followed by a fixed 12-slot mixed-media archive for Travel, Languages, and Art.

## Source of truth

- Direction mock: `ugc-editorial-contact-sheet-v2.html`
- Focus viewer mock: `ugc-focus-viewer-v3.html`
- Approved palette and shell:
  - Paper `#F4F5F1`
  - Ink `#060403`
  - Amaranth `#E83256`

Reference sites inform motion and editorial restraint only. Do not copy source code, assets, or brand identity.

## Scope

This checkpoint changes only:

- Public UGC page.
- Admin UGC page.
- UGC media data and editing controls.
- Temporary UGC media assets.
- UGC-specific components and localization.

Do not change the approved homepage, carousel, shared navbar, footer, Translation/SEO, Blog, or Contact layouts.

## Page structure

1. Editorial hero.
2. Four archive filters.
3. Fixed 12-slot contact-sheet grid.
4. Full-screen focus viewer.
5. Shared footer.

The current separate Travel/Languages/Art chapter sections, niche cards, generic hero carousel, back-to-top links, and final duplicate masonry section are removed from the public UGC composition.

## Hero

- Paper background with the seamless shared navbar above it.
- Small amaranth eyebrow: localized equivalent of `UGC · DIRECCIÓN CREATIVA`.
- Typed title: `@marttelier` with the permanent amaranth underscore.
- Large uppercase value line: localized equivalent of `CONTENIDO QUE CONVIERTE EXPERIENCIAS, IDIOMAS Y ARTE EN HISTORIAS VISUALES.`
- One ink-alpha horizontal rule draws from left to right on load.
- No image in the hero. The contact sheet begins immediately after the hero rule.
- Text enters with the approved clip/stagger language.

## Filters

Four localized filters:

1. All
2. Travel
3. Languages
4. Art

Behavior:

- `All` is selected initially.
- Active and hover states use the approved editorial brackets and amaranth.
- Filter changes never reorder, collapse, or resize the grid.
- A non-matching tile remains in its fixed position and becomes a plain paper-white cell.
- Matching tiles remain visible in their authored positions.
- Filter transition fades media opacity over about 300 ms.

## Contact-sheet grid

- Exactly 12 initial slots.
- Desktop: four columns by three rows.
- Mobile: two columns by six rows.
- Four items per category.
- Slot order is fixed and intentionally interleaves categories.
- Every tile is square and fills its cell.
- No rounded corners, cards, borders, captions, or persistent overlays.
- Hover:
  - Image scales to about `1.055`.
  - A compact ink label enters at bottom-left.
  - Video poster switches to a muted looping video preview.
- Pointer leave:
  - Video preview pauses and returns to time `0`.
  - Poster remains visible.
- A paper-white filtered cell has no hover or click behavior.
- Tile entrance staggers by diagonal groups without rearranging the grid.

## Mixed-media data

Create a fixed `ugcPortfolio` array with 12 entries:

```ts
type UgcPortfolioItem = {
  id: string;
  category: 'travel' | 'languages' | 'art';
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

Initial distribution:

- 4 Travel.
- 4 Languages.
- 4 Art.
- Each category starts with 2 images and 2 videos.

Temporary media:

- Download 12 artistic seeded placeholder images locally.
- Generate six short lightweight MP4 mock videos from six of those images using a subtle pan/zoom.
- Videos use their source images as posters.
- Runtime never depends on remote image or video URLs.
- All items remain replaceable from admin.

## Focus viewer

Opening:

- Clicking any visible image or video opens the viewer.
- The page background becomes ink at about 84% opacity with a subtle blur.
- The focused media enters with a short scale-and-rise transition.
- Existing body scroll is locked while open.

Layout:

- Desktop columns:
  1. Project context on the left.
  2. Centered 9:16 media frame.
  3. Vertical controls on the right.
- Mobile stacks project context above the centered media; controls remain at the right edge.

Left context:

- Localized category and format eyebrow.
- Localized short title.
- Localized description capped at two sentences.
- Format and item position metadata.
- Copy changes with the focused item.

Media:

- Images use `object-fit: cover` inside the 9:16 frame.
- Videos autoplay with sound after the click that opens them.
- Videos loop.
- Clicking the focused video toggles play/pause.
- Moving to another item pauses and resets the previous video.

Controls:

- Close control at top-right.
- Up arrow and down arrow on the right.
- Counter below arrows.
- Arrows navigate only items in the active filter.
- When All is active, arrows navigate all 12.
- Navigation wraps from first to last and last to first.
- Keyboard Escape closes; Up/Down follows the visible arrows.

## Admin

The admin UGC page mirrors the public hero, filters, grid, and focus viewer.

Each of the 12 fixed slots can edit:

- Category.
- Type.
- Image or video file.
- Video poster.
- ES/EN/FR label.
- ES/EN/FR title.
- ES/EN/FR description.
- ES/EN/FR format.
- ES/EN/FR alt text.

DE/IT/CA remain code-managed and receive Spanish fallback for newly edited fields.

Admin rules:

- No add/remove/reorder controls; 12 fixed slots preserve the designed contact sheet.
- Image limit: 2 MB.
- Video limit: 8 MB.
- Accepted image types: JPEG, PNG, WebP, GIF.
- Accepted video types: MP4, WebM, QuickTime.
- Videos require a poster.
- Upload assets before writing `site.json`.
- Pending binary data remains memory-only and is not stored in localStorage.

## Existing content

- Preserve existing UGC text and niche details in locale files for future use.
- The new page uses the approved hero copy and per-item project copy.
- Do not invent clients, performance metrics, paid campaign results, or brand partnerships.
- Temporary item descriptions describe conceptual mock content, not completed client work.

## Motion

- Hero eyebrow/title/value line: clip/stagger once.
- Hero rule: left-to-right draw.
- Grid: diagonal stagger on first entrance.
- Filter: 300 ms media fade to paper-white cells.
- Tile hover: image scale and label reveal.
- Viewer: overlay fade plus frame scale/rise.
- Viewer item navigation: current media exits vertically and next enters from the arrow direction.

No new dependencies are needed. Use existing Framer Motion for the interactive grid/viewer and existing TypedTitle/ScrollReveal for page entrance.

## Verification

1. Exactly 12 slots exist and category counts are 4/4/4.
2. Grid stays 4×3 desktop and 2×6 mobile.
3. Filters do not change item positions.
4. Filtered cells become paper-white.
5. Video previews play muted only on hover.
6. Clicking visible media opens the viewer.
7. Viewer media is 9:16.
8. Context appears left with no description longer than two sentences.
9. Arrows navigate only the active filter and wrap.
10. Focused videos autoplay with sound, loop, and toggle play/pause on click.
11. Admin edits all approved ES/EN/FR fields and media.
12. Public/admin use only the strict three-color system.
13. Tests, build, and live visual review pass before the next page begins.
