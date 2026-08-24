# Contact Inquiry Switcher Design

## Goal

Replace the current two-card Contact page with the approved editorial hero and one black inquiry desk that switches between the UGC and Translation/SEO Netlify forms.

## Scope

Change only:

- Public Contact view.
- Admin Contact page.
- Contact switcher/client lifecycle.
- Contact form fields and localized labels.
- Contact success/error styling.

Do not change Home, UGC, Translation/SEO, Blog, navbar, or footer.

## Hero

- Paper background.
- Amaranth eyebrow: localized `Hablemos`.
- Typed localized `Colaboremos` with permanent amaranth underscore.
- Existing localized subtitle, styled uppercase and concise.
- No separate black intro card, side card, border, glow, or media.

## Inquiry desk

- Full-width ink section immediately after hero.
- Two top tabs:
  - Creative Content / UGC.
  - Translation / SEO.
- UGC is selected initially.
- Only one form is visible at a time.
- Both form elements remain in server HTML so Netlify detects both names.
- Active tab is amaranth with editorial brackets.
- Inactive tab uses paper transparency.
- Tab click and Left/Right/Home/End keys switch forms.
- Selection survives only for the current page visit; no storage needed.

## Fields

Each form contains exactly:

1. Email/contact — required.
2. Company — optional.
3. Project details — required.

Remove Budget from both forms.
Do not add Name.

UGC details label asks for more information about the creative project.
Translation/SEO details label asks what content needs translating, localizing, or optimizing.

Preserve:

- Form names:
  - `ugc-contact`
  - `seo-contact`
- Hidden `form-name` fields.
- Localized required-field message.
- AJAX form encoding.
- Non-OK/network fallback to native form submission.

## Visual treatment

- Ink desk with one-pixel paper-alpha rules.
- No rounded cards or field backgrounds.
- Two-column email/company row on desktop.
- Details spans full width.
- Inputs are transparent with paper text and bottom rule.
- Focus changes rule to amaranth.
- Optional company label uses paper transparency.
- Amaranth rectangular submit button aligned right.
- Footer note aligned left.
- Mobile stacks all fields.

## Success and errors

- Success replaces only the submitted form panel.
- Success uses ink/paper/amaranth only:
  - No green background/icon.
  - Amaranth rule/mark.
- Other tab remains usable.
- Switching tabs after success preserves the successful panel state.
- Errors keep the form and entered values.

## Admin

- Mirror the public hero and inquiry desk.
- ES/EN/FR labels and hero copy remain editable.
- Admin tabs show only one form preview at a time.
- Company optional and Budget removed.
- Form submission behavior remains available for preview/testing.

## Lifecycle and accessibility

- One shared switcher initializer handles public/admin.
- Rerun-safe under Astro ClientRouter.
- Remove listeners before reinit.
- Tabs use tablist/tab/tabpanel relationships.
- Hidden form panel uses `hidden`.
- Focus moves to selected tab only on keyboard navigation.
- Reduced-motion setting does not change layout.

## Verification

1. UGC selected initially.
2. Only one form panel visible.
3. Both Netlify forms exist in built HTML.
4. Exactly three fields per form.
5. Company is not required.
6. Email/details are required.
7. No Budget field/label/name remains.
8. Tab click/keyboard switches panels.
9. Submission and fallback behavior remain.
10. Success uses strict palette.
11. Admin mirrors public and labels remain editable.
12. Other approved pages remain unchanged.
