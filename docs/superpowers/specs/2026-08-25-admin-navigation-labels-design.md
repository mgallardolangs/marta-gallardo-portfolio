# Admin Navigation Labels Design

## Goal

Let editors update the five shared navigation labels from the existing admin
toolbar. A single edit must update the desktop navbar, mobile menu, and footer
without introducing duplicate content fields.

## Interface

Add a compact **Navigation labels** section below the toolbar language selector.
It contains inputs for Home, Creative Content, Translation/SEO, Blog, and
Contact in the currently selected ES, EN, or FR locale.

The header remains visually clean: it will not receive per-link edit pencils.
Changing the toolbar language swaps the five input values to that locale.

## Data Flow

Each input reads and writes the existing keys:

- `nav.home`
- `nav.ugc`
- `nav.translationSeo`
- `nav.blog`
- `nav.contact`

The admin header will use reactive, display-only mirrors of those keys for its
desktop and mobile labels. The footer already reads the same keys reactively.
Publishing continues through the existing admin store and translation JSON
workflow; no schema or duplicate navigation fields are added.

## Cursor Behavior

Add one global native-button rule:

- Enabled buttons use `cursor: pointer`.
- Disabled buttons use `cursor: not-allowed`.

This covers both language-picker buttons and all other current or future native
buttons without adding repeated utility classes.

## Checks

Regression checks will confirm:

- The toolbar exposes all five shared keys for the active locale.
- Header desktop/mobile labels and footer labels use the same keys.
- Public header rendering remains static.
- Enabled and disabled native buttons receive the intended cursor.
