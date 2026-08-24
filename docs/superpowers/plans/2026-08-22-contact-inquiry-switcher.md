# Contact Inquiry Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved one-form-at-a-time Contact inquiry desk without breaking Netlify submissions.

**Architecture:** Keep both Astro forms in the HTML and switch their `hidden` panels with a rerun-safe vanilla TypeScript initializer. Reuse the existing `contactForms.js` submission lifecycle. Mirror the same markup in admin with `EditableText`.

**Tech Stack:** Astro 7, Typed.js, native form APIs, Node built-in tests.

---

## Task 1: Define Contact contracts

**Files:**

- Create: `tests/contact-inquiry-switcher.test.mjs`
- Modify: `tests/contact-forms.test.mjs`

- [ ] Lock:
  - Hero exact markers/copy/TypedTitle.
  - Ink tablist with UGC default.
  - Both Netlify form names in HTML.
  - One visible panel.
  - Three fields each.
  - No Budget/Name.
  - Required email/details, optional company.
  - Click/keyboard switching helper.
  - Rerun-safe lifecycle.
  - Strict-palette success.
  - Admin parity/editable keys.
  - Existing fallback submission.

- [ ] Run red and commit.

## Task 2: Add copy and switcher lifecycle

**Files:**

- Modify: `src/i18n/*.json`
- Create: `src/lib/contactSwitcher.ts`
- Modify: `src/lib/contactForms.js`

- [ ] Add all-six keys:

```json
"tabs": {
  "ugc": "CONTENIDO UGC",
  "seo": "TRADUCCIÓN / SEO"
},
"emailContact": "EMAIL / CONTACTO",
"companyOptional": "EMPRESA · OPCIONAL",
"ugcDetails": "CUÉNTAME MÁS SOBRE EL PROYECTO",
"seoDetails": "¿QUÉ CONTENIDO NECESITAS ADAPTAR?",
"responseNote": "RESPUESTA CLARA · CONTACTO DIRECTO"
```

- [ ] Add pure helpers:

```ts
getContactTabTargetIndex(current, key)
getContactPanelState(activeTab, panelId)
```

- [ ] Build `initContactSwitcher(root)`:
  - Cleanup previous listeners.
  - UGC initial.
  - Click/keyboard switch.
  - Set aria-selected/tabIndex/hidden.
  - Astro rerun-safe cleanup.

- [ ] Keep submission logic separate and unchanged except success selectors.

## Task 3: Rewrite public and admin Contact

**Files:**

- Rewrite: `src/views/ContactPage.astro`
- Rewrite: `src/pages/admin/contact.astro`

- [ ] Hero:
  - Paper, eyebrow, typed title, subtitle.

- [ ] Inquiry desk:
  - Ink section.
  - Tablist and two panel forms.
  - Email/company/details only.
  - Transparent fields/bottom rules.
  - Amaranth submit and response note.

- [ ] Success:
  - Strict ink/paper/amaranth panel.
  - No green/red pastel classes.

- [ ] Admin:
  - Same structure.
  - EditableText for hero, tabs, field labels, send/success.

- [ ] Initialize switcher then forms under Astro lifecycle.

- [ ] Run tests/build and commit.

## Task 4: Verify and present Contact checkpoint

**Files:**

- Modify: `docs/site-refinement.md`
- Modify session artifact plan.

- [ ] Document fields, tabs, Netlify names, lifecycle.

- [ ] Run:

```bash
npm test
npm run build
CHECK_DIST=1 npm test
git diff --check
```

- [ ] Inspect built public/admin HTML for both forms and exact required attributes.

- [ ] Restart background dev server and review:

```text
/contact
/admin/contact
```

- [ ] Stop for final site approval.
