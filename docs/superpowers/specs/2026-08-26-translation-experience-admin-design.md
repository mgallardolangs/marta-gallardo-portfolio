# Translation Experience Admin Design

## Scope

Refine only the Translation/SEO page hero and Experience/Education browser:

1. Remove the visible **View portfolio** CTA.
2. Remove the visible top-right **Translation profile** label.
3. Let admin editors add Education bullets and Experience cards.
4. Keep public layouts responsive as those collections grow.

The existing localized `ctaPrimary` and `profileLabel` values remain in all
locale files so either element can return later without reconstructing copy.

## Public page

The hero keeps only the Contact CTA. `ExperienceTabs` stops accepting or
rendering `profileLabel`.

Education continues rendering a vertical bullet list. Experience cards use a
responsive one-column, two-column, then three-column grid so any number of
cards wraps without overflow or narrow desktop leftovers.

## Admin page

Replace the static Experience/Education browser preview with one React editor
that preserves the approved browser styling and tab behavior.

The Education tab renders existing bullets as editable text and adds a compact
form below the list with required ES, EN, and FR text fields.

The Experience tab renders existing cards as editable highlight, title, and
body fields. Its add form requires those three values in ES, EN, and FR before
creating a card.

No remove or reorder controls are added in this change.

## Data and publishing

The existing translation JSON arrays remain the source of truth:

- `translationPage.education.studies`
- `translationPage.experience.cards`

Admin store methods add corresponding entries to ES, EN, and FR together.
DE, IT, and CA receive the Spanish values as code-managed fallbacks. The
existing draft, dirty-state, refreshed Identity token, and Git Gateway publish
flow writes the updated locale files.

## Error handling and checks

Incomplete add forms show an inline error and do not mutate any locale.
Successful additions clear the form and render immediately.

Regression checks cover:

- No portfolio CTA in public or admin markup.
- No profile label in public or admin markup.
- Retained locale keys for possible future restoration.
- Atomic six-locale Education and Experience additions.
- Required ES/EN/FR validation.
- Responsive public Experience grid.
- Existing text editing and publishing behavior.
