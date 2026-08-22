# Mock-Faithful Shell and Homepage Correction

## Scope

This correction changes only:

1. Global palette tokens used by the shared shell and homepage.
2. Shared navbar.
3. Typed-title cursor.
4. Homepage hero.
5. Homepage carousel section.
6. Favicon.

All other pages remain unchanged until this checkpoint is implemented and approved in the live site.

## Source of truth

- Shell and hero: visual companion Checkpoint 1, `checkpoint-1-shell-hero.html`.
- Carousel: visual companion Checkpoint 2, `checkpoint-2-carousel.html`.
- Carousel references:
  - `/Users/berengueragulloadrian/Desktop/carousel-images.png`
  - `/Users/berengueragulloadrian/Desktop/carousel-video-effect.mov`
- Inspiration only:
  - https://www.awwwards.com/sites/cipher
  - https://www.awwwards.com/inspiration/transition-cipher

The implementation must reproduce the approved mock composition and behavior. It must not copy Cipher code, assets, or brand identity.

## Strict palette

The only opaque colors are:

- Paper: `#F4F5F1`
- Ink: `#060403`
- Amaranth: `#E83256`

Transparent variants of those three colors are allowed for borders, shadows, overlays, and muted text. No other pink, rose, blush, gray, or white hex values are permitted in this correction.

Remove from the affected surfaces:

- `--color-amaranth-soft`
- `--color-amaranth-mist`
- `--color-amaranth-ink`
- Legacy `blush-*` utilities or variables
- Pink radial gradients and glow blobs
- Solid `#FFFFFF`; use paper instead

## Navbar

- The header is visually part of the page.
- No rounded shell, border, shadow, floating pill, or separate fill.
- It may compact vertically and hide on scroll down.
- `MG` stays at the left.
- Uppercase navigation stays at the right.
- Navigation hover combines:
  - Amaranth editorial brackets.
  - Vertical text roll into an amaranth copy.
- Social and language icons are flat by default.
- Icons gain the amaranth bottom shadow and lift only on hover or focus.
- Mobile keeps the existing full-screen menu behavior, restyled to the strict palette.

## Typed title

- Typed titles continue to type once and keep the final text.
- Cursor is `_`.
- Cursor is amaranth.
- Cursor has a fixed visible gap from the title.
- Cursor continues blinking after typing completes.
- Cursor must not overlap the following line or surrounding content.
- The invisible reserve must include cursor spacing so layout does not shift.

## Homepage hero

- Match Checkpoint 1.
- Paper background; no pink gradient or glow.
- Seamless navbar above the hero.
- Small amaranth uppercase eyebrow.
- Large two-line `MARTA GALLARDO` typed title.
- Metadata row and concise description.
- Black primary CTA and underlined secondary CTA.
- Right visual uses the approved tilted outlined oval with three square placeholder frames and centered `MG` underline motif.
- No rounded cards or inherited pastel surfaces.
- Existing translatable text remains the data source.

## Carousel

### Section

- Full-width ink background.
- Localized equivalents of `Stories in Motion`.
- Localized kicker, supporting copy, and year/index.
- No outer white card, border, rounded wrapper, or side copy column.

### Media

- Use the same temporary mock-image set shown in Checkpoint 2.
- Store mock images locally; do not depend on runtime remote URLs.
- Items remain replaceable from admin with images or videos.
- Initial count remains 15.
- Portrait rectangles with square corners and no border.
- The chain uses visible adjacent-corner overlap.

### Geometry

- Centered ellipse approximately `720 × 440` on desktop.
- Tilt approximately `-18deg`.
- Clearly elongated, not circular or egg-shaped.
- Upper-right rises and lower-left falls.
- Cards remain visually upright.
- Center contains `MG`, two thin oval echoes, and an amaranth underline.

### Entrance

- On page load, all items begin stacked at the center.
- They fan into their ellipse positions over about 1.6 seconds.
- `MG`, oval echoes, and underline reveal during the fan-out.
- Automatic orbit movement starts only after the entrance completes.

### Movement and interaction

- Continuous automatic slow-motion drift: about 76 seconds per revolution.
- No arrows, buttons, dots, hint, drag, wheel, swipe, or keyboard carousel movement.
- Hovering one tile:
  - Stops the entire orbit.
  - Raises and scales the selected tile to about `1.52`.
  - Greys, darkens, and lowers opacity of all other tiles.
- Leaving the tile resumes movement.
- Video slots keep the existing muted autoplay and hover-audio policy.

### Non-default fallbacks

Existing accessibility and reduced-motion fallbacks may remain, but they must not affect the approved default layout, animation, controls, geometry, or timing.

## Favicon

- Transparent background.
- Black `MG` letters only.
- No rounded square, colored field, or border.

## Verification

Before presenting the live checkpoint:

1. Search affected source files for removed pink/blush tokens and disallowed opaque colors.
2. Confirm navbar shell has no radius, border, shadow, or fill.
3. Confirm the typed cursor is amaranth, separated, and blinking.
4. Confirm carousel has no visible controls and no wheel/drag handlers.
5. Confirm carousel section is ink and full-width.
6. Confirm entrance fan-out runs on a clean page load.
7. Confirm autoplay begins afterward and hover pauses the full chain.
8. Confirm favicon has transparent background.
9. Run targeted tests and the Astro build.
10. Start the background dev server and stop for user visual approval before changing any other page.
