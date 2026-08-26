# Translation Studio Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing Translation/SEO page and admin mirror to match the five approved studio checkpoints exactly.

**Architecture:** Keep the existing shared Astro view, React service switcher, React experience tabs, GSAP route motion, localized JSON, and dynamic site-data editor. Change only markup, styles, new localized display keys, skill grouping, and relevant admin controls.

**Tech Stack:** Astro 7, React 19, Tailwind CSS 4, GSAP, Typed.js, Node built-in tests.

---

## Task 1: Lock correction contracts

**Files:**

- Create: `tests/translation-studio-correction.test.mjs`
- Modify: `tests/phase4-translation-contract.test.mjs`

- [ ] Add failing contracts for:
  - Flat hero; no gradient/card/pills.
  - Rectangular CTAs and vertical mark.
  - Open black service section and service headlines.
  - Flush Arsenal frame with exact column ratio.
  - Skill grouping and in-column admin add actions.
  - Browser tab window shell.
  - Methodology eyebrow/headline/connector/hover markers.
  - Why flush grid and `[ 01 ]` numbers.
  - All-six localized keys.
  - Public/admin parity.

- [ ] Run:

```bash
node --test tests/translation-studio-correction.test.mjs tests/phase4-translation-contract.test.mjs
```

Expected: fail against current hero/card/pill/flat-skill implementation.

- [ ] Commit tests with Copilot trailer.

## Task 2: Add localized display data and grouped skills

**Files:**

- Modify: `src/i18n/es.json`, `en.json`, `fr.json`, `de.json`, `it.json`, `ca.json`
- Modify: `src/data/site.json`
- Modify: `src/lib/siteData.ts`
- Modify: `src/lib/translationPage.js`
- Modify: `src/components/admin/adminStore.ts`
- Modify: `src/components/admin/EditableCollection.tsx`

- [ ] Add all-six keys:

```json
"heroMark": "ELCHE · WORKING WORLDWIDE",
"servicesEyebrow": "01 · CÓMO PUEDO AYUDARTE",
"arsenalEyebrow": "02 · PERFIL Y HERRAMIENTAS",
"experienceSectionTitle": "Experiencia y Formación",
"experienceEyebrow": "03 · TRAYECTORIA",
"methodologyEyebrow": "04 · METODOLOGÍA E INFOGRAFÍA",
"methodologyDisplayTitle": "Un proceso claro, de principio a fin",
"whyEyebrow": "05 · VALOR DIFERENCIAL",
"skillGroups": {
  "translation": "Traducción y localización",
  "seo": "SEO y contenido web"
}
```

- [ ] Add localized `headline` to each service item.

- [ ] Extend `SkillItem`:

```ts
group: 'translation' | 'seo';
```

- [ ] Assign four current skills to each group.

- [ ] Update admin skill mutations:
  - New skills require group.
  - Editing group updates `site.json`.
  - Add/remove/reorder remains stable.
  - Spanish fallback behavior remains.

- [ ] Update `EditableCollection` skill UI with group selector and per-group add controls.

- [ ] Run data/admin tests and commit.

## Task 3: Restore hero and services

**Files:**

- Modify: `src/views/TranslationSeoPage.astro`
- Modify: `src/components/translation/ServiceSwitcher.tsx`
- Modify: `src/pages/admin/translation-seo.astro`

- [ ] Public hero:
  - Remove radial gradient.
  - Remove right background-label card.
  - Use compact eyebrow, typed title, subtitle.
  - Rectangular amaranth and outlined paper CTAs.
  - Add vertical hero mark at lower-right.

- [ ] ServiceSwitcher:
  - Remove outer border/shadow/card.
  - Open ink section.
  - Left titles + progress.
  - Right service headline + description.
  - Keep existing 6-second rAF timer and ARIA.
  - Mobile top-rule layout.

- [ ] Admin:
  - Mirror flat hero.
  - Keep EditableText for all new hero/service keys.
  - Present editable service headlines and descriptions in the same open layout.

- [ ] Run hero/services contracts and commit.

## Task 4: Build compact grouped Arsenal

**Files:**

- Modify: `src/views/TranslationSeoPage.astro`
- Modify: `src/pages/admin/translation-seo.astro`
- Modify: `src/lib/translationPageMotion.ts`

- [ ] Public Arsenal:

```css
grid-template-columns: .82fr .88fr 1.3fr;
gap: 1px;
background: ink;
```

- [ ] Languages:
  - Six compact rows.
  - 9px-equivalent label and 8px-equivalent level.

- [ ] Tools:
  - Three equal columns.
  - Roomy square cells.
  - Small 28px maximum real logo.
  - Amaranth hover.

- [ ] Skills:
  - Two subcolumns by `group`.
  - Slightly larger 8px-equivalent labels.

- [ ] Admin:
  - Add Language directly under rows.
  - Add Tool as same-size dashed tool tile.
  - Add Skill under each group.
  - Keep remove/reorder/edit.

- [ ] Motion:
  - Outer frame/dividers draw.
  - Rows/tiles stagger.

- [ ] Run Arsenal/admin tests and commit.

## Task 5: Restore experience, methodology, and why sections

**Files:**

- Modify: `src/components/translation/ExperienceTabs.tsx`
- Modify: `src/views/TranslationSeoPage.astro`
- Modify: `src/pages/admin/translation-seo.astro`
- Modify: `src/lib/translationPageMotion.ts`

- [ ] Experience:
  - Add eyebrow + typed section title.
  - Ink chrome, amaranth dot, top-left tabs.
  - Active paper tab, inactive transparent paper.
  - Remove rounded pills/shadow card.
  - Left statement/right panel.
  - Preserve stable height and keyboard controls.
  - Admin vanilla tab switch with editable panels.

- [ ] Methodology:
  - Add eyebrow and typed display title.
  - Connector draws horizontally/vertically.
  - Four border-only cards.
  - Hover lifts card and amaranth-fills number.
  - Preserve four localized descriptions.

- [ ] Why:
  - Add eyebrow.
  - Flush three-column grid.
  - Use `[ 01 ]`, `[ 02 ]`, `[ 03 ]`.
  - Ink wipe hover/focus.
  - Stagger entrance.

- [ ] Run targeted tests and commit.

## Task 6: Verify and present live checkpoint

**Files:**

- Modify: `docs/site-refinement.md`
- Modify session artifact: `/Users/berengueragulloadrian/.copilot/session-state/441ad769-1603-42cd-8a3d-b1fba6b5c1d2/plan.md`

- [ ] Document the five checkpoints and grouped skill admin model.

- [ ] Run:

```bash
npm test
npm run build
CHECK_DIST=1 npm test
git diff --check
```

- [ ] Audit:
  - No translation hero radial gradient.
  - No rounded hero CTA pills.
  - No ServiceSwitcher outer card.
  - Arsenal grouping is 4/4.
  - Admin add actions are inside columns/groups.
  - Experience tabs are browser-style.
  - Methodology/why markers and motion exist.
  - Home/UGC compiled markup remains unchanged.

- [ ] Restart background dev server and review:

```text
/translation-seo
/admin/translation-seo
```

- [ ] Stop for user approval before Blog.
