# DESIGN.md · marttelier.com

Direction chosen on 24/11/2026: **clay**. The 3D logo is matte and rounded, like something modelled by hand, and the rest of the site follows from it. Things on the page should look soft, warm and a little raised, never glossy. That fits the "atelier" idea: a small workshop where things are made by hand.

What we're aiming for: **more visual, same text.** Every word that helps SEO or wins clients stays in the HTML. What changes is how it's grouped. Big blocks of text get split into cards, steps, tabs and numbers you can scan, with clay objects and photos in between.

This direction comes from the brand kit (Centro Marttelier → Kit de marca) and the logo. It isn't based on a study of real reference sites.

## Color

The site has one theme, light (`color-scheme: light`), and no dark mode.

| Token | Value | Role |
|---|---|---|
| `--color-paper` | `#FBF4EF` | Page background (cream) |
| `--color-clay` | paper 90 % + hazel 10 % (≈ `#F5E9E3`) | Raised surfaces: cards, tabs, inputs. A tone darker than paper, like unglazed clay |
| `--color-ink` | `#4A1222` | Text, primary buttons, dark sections (burgundy). 13.8:1 on paper |
| `--color-hazel` | `#7D5A45` | Secondary text, eyebrows, focus ring. 5.6:1 on paper |
| `--color-amaranth` | `#F48FA1` | Brand accent (strawberry): shapes, lines, highlights, UGC backgrounds. **Never text on cream** (2.1:1) |
| `--color-raspberry` | strawberry 62 % + burgundy (≈ `#B5657A`) | Only the accent word in large headings (≥ 32px) and the «tt» of the logo. 3.8:1, large text only |
| `--color-ink-muted` | `rgb(74 18 34 / .68)` | Long body text and captions |
| `--color-ink-faint` | `rgb(74 18 34 / .52)` | Placeholders and meta (never essential text) |

Clay and raspberry are mixed in CSS (`color-mix`) from the four brand colours, so the site still uses only those four (the palette test checks this).

Services keep their colours from the brand kit: **SEO = burgundy, Translation = hazel, UGC = strawberry**. Each service page and card uses its colour for one thing only (a clay object, a strip or a tab), never for everything.

States: success `#2F6B3A`, warning `#9A5B00`, error `#B3261E`. They are used only on forms.

Avoid: gradients on text, glass effects, purple or blue, and gloss or chrome. Gloss belongs to the Puffy finish, which wasn't chosen.

## Typography

- **Instrument Sans** for everything (400 text, 500 UI, 600 headings).
- **Playfair Display italic** for **one word per heading** and short quotes. Never for paragraphs.
- Headings use letter-spacing −0.03em and `text-wrap: balance`.

| Name | Size (mobile → desktop) | Line height | Weight | Use |
|---|---|---|---|---|
| display | 44 → 88px | 0.95 | 600 | Home hero only |
| h1 | 36 → 64px | 1.0 | 600 | Page titles |
| h2 | 28 → 44px | 1.08 | 600 | Section titles |
| h3 | 20 → 24px | 1.2 | 600 | Cards, steps |
| lead | 18 → 21px | 1.5 | 400 | The first paragraph of a section |
| body | 16 → 17px | 1.65 | 400 | Running text, max 65 characters per line |
| small | 14px | 1.5 | 500 | Captions, chips, meta |
| eyebrow | 12px, uppercase, +0.14em | 1.2 | 600 | Label above a heading, in hazel |

## Spacing and layout

- 8px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Sections use `clamp(4rem, 7vw, 7rem)` top and bottom (already `.site-section`).
- Max width 86rem (`.site-container`). Text columns max 42rem (`.section-copy`).
- **Not everything centred.** Alternate text left with a visual right, and the other way round. Use centred text only for the final call to action.
- **The rhythm that replaces walls of text:** heading + one lead paragraph, then the details as cards, steps, tabs or an accordion. All of that text stays in the HTML. Accordions use `<details>`, so Google still reads them.

## Shape and depth (the clay)

Radii: `--radius-sm` 12px (chips, inputs) · `--radius-md` 20px (buttons, small cards) · `--radius-lg` 32px (cards, sections, photos) · `--radius-pill` 999px.

Use two shadows, and nothing else:

```css
/* Raised clay: cards, buttons, clay objects. Light from above, soft warm shadow below */
--shadow-clay: inset 0 1px 0 rgb(255 255 255 / .7), inset 0 -3px 0 rgb(74 18 34 / .06), 0 14px 28px -12px rgb(74 18 34 / .22);
/* Pressed clay: button :active, selected tab, input focus */
--shadow-clay-pressed: inset 0 3px 8px rgb(74 18 34 / .14);
```

These replace `--shadow-ink` and `--shadow-amaranth` as the rest of the site is redesigned. Not every block gets a shadow: a card is raised only when it's something you can click or a key piece of content.

## Components

- **Primary button:** burgundy background, cream text, `--radius-pill`, `--shadow-clay`. On hover it lifts 2px. On `:active` it sinks (`--shadow-clay-pressed`, no translate). Focus shows a 2px hazel ring with 3px offset. Disabled is 45% opacity with no shadow.
- **Secondary button:** clay background, burgundy text, the same radius and clay shadow.
- **Quiet button / text link:** burgundy text with a 1px strawberry underline (already `.site-text-cta`). On hover the underline gets thicker.
- **Card:** `--color-clay` background, `--radius-lg`, `--shadow-clay`, 24–32px padding. It can have a small 3D clay object or icon at the top left. Cards in a row share the same height and alignment.
- **Step / process:** a round clay number (64px, matte) + h3 + 1–2 lines. Use it only where there really is an order: how a SEO project works, how a UGC video is made.
- **Number chip:** a big number + a short label ("6 idiomas", "3 servicios"). Only real figures.
- **Tabs / accordion:** clay pill tabs. The selected one is pressed. Accordions use `<details>`.
- **Inputs:** clay background, `--radius-sm`, pressed shadow on focus, label always visible.
- **Navigation:** the MG monogram (flat PNG of the clay logo) + links. On dark sections it flips to cream (already does).
- **Footer:** burgundy background, the clay wordmark in cream and strawberry, links in cream.

## Imagery and motion

- **Clay 3D objects** as the site's illustration system: the same matte material and lighting as the logo (light from the top left, soft shadow), in brand colours. For example a magnifying glass (SEO), a speech bubble with a flag (translation), a phone (UGC) and a pin (Elche). They are exported as WebP/PNG, never as live 3D except the home hero logo.
- **Photos:** what's on the site today (editorial portraits among books, natural warm light) inside `--radius-lg` frames. Stickers with white borders are kept.
- **Icons:** one line set, 1.8px stroke, round caps, in burgundy (as in Centro Marttelier). No emoji.
- **Motion:** only the home hero logo moves (slow sway + tilt with the mouse). Sections fade and rise 16px when they come into view, starting visible. Everything respects `prefers-reduced-motion`.
- **Performance:** no WebGL outside the home page. Images in WebP with `width`/`height` and `loading="lazy"` below the fold.

## Still to do

1. Download from Centro → Logo 3D the clay PNGs (wordmark and monogram, with and without background) for the header, footer and home page.
2. Create the clay objects for each service (same tool, new shapes).
3. Put these tokens into `src/styles/global.css` (`@theme`) and redesign page by page, starting with the home page. Preview locally before anything is published.
