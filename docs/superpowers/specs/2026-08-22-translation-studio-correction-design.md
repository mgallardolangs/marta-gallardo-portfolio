# Translation, SEO, and Localization Studio Page Design

## Goal

Bring the existing Translation/SEO implementation back to the five approved studio checkpoints while preserving all localized factual content and ES/EN/FR inline editing.

## Source of truth

1. `translation-checkpoint-1-hero-services.html`
2. `translation-checkpoint-2-arsenal-v4.html`
3. `translation-checkpoint-3-experience.html`
4. `translation-checkpoint-4-methodology.html`
5. `translation-checkpoint-5-why.html`, with final number treatment `[ 01 ]`, `[ 02 ]`, `[ 03 ]`

The shared shell, strict palette, typography, footer, and permanent TypedTitle cursor are already approved and must not change.

## Scope

Change only:

- Public Translation/SEO shared view.
- Admin Translation/SEO page.
- Service switcher styling/data.
- Arsenal data/grouping/editor.
- Experience tabs styling.
- Translation-page motion selectors.
- Required six-locale Translation copy.

Do not change Home, UGC, Blog, Contact, shared navbar, shared footer, or their data.

## Section order

1. Hero.
2. Services.
3. Mi arsenal técnico.
4. Experiencia y Formación.
5. Metodología e infografía.
6. ¿Por qué elegirme?
7. Shared seamless footer.

## Checkpoint 1: Hero

- Flat paper background.
- No radial gradient, glow, side card, or large background-label panel.
- Compact amaranth eyebrow.
- Typed localized H1 with permanent amaranth underscore.
- Existing concise localized subtitle.
- Rectangular CTAs:
  - Amaranth primary: portfolio.
  - Paper outlined secondary: contact.
- Both CTAs lift and receive an ink bottom shadow on hover/focus.
- Vertical lower-right mark: localized equivalent of `ELCHE · WORKING WORLDWIDE`.
- Hero has no other decorative media.

## Checkpoint 1: Services

- Full-width ink section, not an inner card.
- Amaranth eyebrow: localized equivalent of `01 · CÓMO PUEDO AYUDARTE`.
- Desktop layout:
  - Left: Translation, Localization, Multilingual SEO.
  - Right: selected service headline and description.
- Selected left item uses paper text and a six-second amaranth progress line.
- Inactive titles use paper transparency.
- Auto-advance remains six seconds.
- Hover/focus pauses.
- Click and keyboard select and restart.
- Mobile stacks list and selected copy with one top rule.
- Add localized `headline` to each service item:
  - Translation: outcome-focused headline equivalent to `Traducción que conserva intención.`
  - Localization: equivalent to `Contenido que se siente local.`
  - SEO: equivalent to `Visibilidad sin perder naturalidad.`

## Checkpoint 2: Compact Arsenal

### Public layout

- Paper section.
- Amaranth eyebrow: `02 · PERFIL Y HERRAMIENTAS`.
- Typed `Mi arsenal técnico`.
- One flush outer ink frame divided into three columns:
  - Languages: `1fr`
  - Tools: `1fr`
  - Skills: `1fr`
- No card gaps, radius, shadows, or white card backgrounds.
- Final live refinement: public plus admin live preview use exact `lg:grid-cols-3` equal thirds.

### Languages

- Six separate rows.
- Slightly larger readable labels.
- Level sits right in amaranth.
- Compact rows prevent empty lower space.

### Tools

- Three-column grid with the original roomy equal-cell layout.
- Small logo/glyph centered inside each ink square.
- Each public/admin preview tile is `aspect-square w-full min-w-0`; the dashed admin add-tool tile keeps that same square footprint.
- Existing real logos remain editable.
- Hover changes the square to amaranth/ink.

### Skills

Two vertical subcolumns:

1. Translation and Localization.
2. SEO and Web Content.

Initial grouping:

- Translation group:
  - Translation.
  - Web localization.
  - Editing.
  - Glossaries.
- SEO group:
  - Local SEO.
  - Keywords.
  - Copywriting.
  - Web optimization.

Add `group: 'translation' | 'seo'` to every skill record.

### Admin

- Add Language button directly below language rows.
- Add Tool is a same-size dashed tile inside the tool grid.
- Each skill group has its own Add Skill button directly below its skills.
- Existing add/remove/reorder/edit behavior remains.
- New skill form requires choosing its group.
- Public layout updates dynamically for practical item counts.

## Checkpoint 3: Experience and Education

- Paper section with amaranth eyebrow `03 · TRAYECTORIA`.
- Typed localized `Experiencia y Formación`.
- One browser-window frame with one-pixel ink border.
- Ink chrome strip.
- Two upper-left tabs:
  - Education.
  - Experience.
- Active tab is paper/ink.
- Inactive tab uses paper transparency.
- Small amaranth browser dot precedes tabs.
- No rounded pill controls or floating shadow card.
- Body uses:
  - Left statement.
  - Right selected content.
- Stable panel height.
- Content changes with a vertical clip/fade.
- Public keyboard behavior remains WAI-ARIA compliant.
- Admin mirrors the browser frame with editable panels and a simple tab switch.

## Checkpoint 4: Methodology

- Full-width ink section.
- Amaranth eyebrow `04 · METODOLOGÍA E INFOGRAFÍA`.
- Typed localized headline equivalent to `Un proceso claro, de principio a fin`.
- Four equal desktop steps.
- Amaranth connector draws left-to-right.
- Steps enter in sequence.
- Final live refinement: methodology wrappers stay overflow-visible and the motion source animates only `autoAlpha`/`y`, never `clipPath`, so the 4px badge lift does not clip.
- Public and admin desktop cards keep equal heights with an exact `md:min-h-[170px]`.
- Number circles stay ink with paper border and amaranth number.
- Hover/focus:
  - Number turns amaranth/ink and lifts.
  - Step frame border turns amaranth and lifts.
- No inner filled white cards.
- Mobile connector draws top-to-bottom and steps stack vertically.

## Checkpoint 5: Why Choose Me

- Paper section.
- Amaranth eyebrow `05 · VALOR DIFERENCIAL`.
- Typed existing localized section title.
- One flush three-column ink-divided grid.
- Each card begins paper/ink.
- Number treatment is inline bracketed:
  - `[ 01 ]`
  - `[ 02 ]`
  - `[ 03 ]`
- Remove separate corner bracket.
- Hover/focus:
  - Ink background wipes upward.
  - Copy becomes paper.
  - Bracketed number stays amaranth.
- Cards stagger upward on scroll.
- Mobile stacks three full-width cards.

## Motion

- Hero/title uses existing TypedTitle.
- Hero CTAs use simple lift/shadow.
- Services use the existing precise rAF progress timer.
- Arsenal frame/dividers draw before item stagger.
- Browser tabs use existing panel transition with new shell.
- Methodology connector and steps use route-scoped GSAP.
- Why cards use route-scoped scroll entrance and CSS ink wipe.
- No new dependencies.

## Admin and localization

- ES/EN/FR all visible text remains editable.
- DE/IT/CA stay code-managed.
- Add all new keys to all six locales:
  - Hero mark.
  - Section eyebrows.
  - Service headlines.
  - Experience section title.
  - Methodology display headline.
  - Skill group titles.
- Site-data skills gain a group in all records.
- Admin mutations preserve localized fallback, draft, dirty count, assets-first publish, and stable IDs.

## Verification

1. No radial hero gradient or side card.
2. CTAs are rectangular.
3. Services have no outer bordered/shadow card.
4. Services cycle/pause/select correctly.
5. Arsenal column ratio and flush frame match Checkpoint 2.
6. Six language rows remain separate.
7. Tools use equal spacious cells with small logos.
8. Skills split into two groups.
9. Admin add actions appear inside their relevant column/group.
10. Experience uses browser tabs, not pills.
11. Methodology connector/step motion matches Checkpoint 4.
12. Why numbers are bracketed and cards use ink wipe.
13. All six locale structures match.
14. Public/admin build and existing Home/UGC routes remain unchanged.
