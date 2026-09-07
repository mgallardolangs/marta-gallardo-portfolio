# Editable SEO Settings Design

## Goal

Make the public SEO metadata editable from the existing admin experience,
without changing public routes or creating a second SEO system. The canonical
origin is `https://marttelier.com`.

## Chosen approach

Keep one `seo` section in `src/data/site.json` and have the existing
`BaseLayout` and `SeoHead` resolve all public-page metadata from it. This
extends the current data source and metadata component instead of adding a CMS
collection, a runtime API, or page-specific configuration files.

## Data model and persistence

`site.json` gains an optional top-level `seo` object:

```json
{
  "seo": {
    "home": {
      "title": { "es": "" },
      "description": { "es": "" }
    },
    "translationSeo": {
      "title": { "es": "" },
      "description": { "es": "" }
    },
    "ugc": {
      "title": { "es": "" },
      "description": { "es": "" }
    },
    "contact": {
      "title": { "es": "" },
      "description": { "es": "" }
    }
  }
}
```

Every field is a localized map using the existing six supported locales
(`es`, `en`, `fr`, `de`, `it`, and `ca`). The admin edits these values through
the current site-data draft and publish flow, so publishing persists only to
`site.json`; no new backend, database, environment variable, or duplicate
content store is introduced.

The admin surface contains one focused SEO editor with the four public page
groups and title/description inputs for each locale. It does not expose
canonical URLs, robots directives, sitemap controls, or a generic arbitrary
metadata editor.

## Metadata resolution

Public Home, Translation & SEO, UGC, and Contact pages select their matching
`seo` page group by route. For each requested locale:

1. Use that locale's non-empty saved value.
2. Fall back to the non-empty Spanish value.
3. Fall back to the current hard-coded localized title or description.

This preserves useful metadata for partially translated admin entries and
ensures absent or legacy SEO data cannot render an empty title or description.
The resolved values feed the existing document title, description, Open Graph,
and Twitter metadata. Existing social-image behavior remains unchanged.

The canonical and alternate-language links use the public page URL with the
canonical origin `https://marttelier.com`; they never use the Netlify preview
or deployment hostname. `x-default` remains the Spanish public URL. The
existing Person JSON-LD continues to use the configured portrait and its
canonical public URLs.

## Blog metadata

Blog post frontmatter remains the source of truth for `title`,
`description`, `date`, `image`, `lang`, and `translationKey`. Article pages
continue to pass the localized post title, description, and optional image to
the shared layout. No blog fields are copied into `site.json`, and no
site-level SEO fallback overwrites valid post metadata.

For missing optional post images, the existing portrait social-image fallback
continues to apply. A blog post must retain non-empty title and description
frontmatter under the content collection schema.

## Sitemap and robots

Astro's installed `@astrojs/sitemap` integration remains the sitemap
generator. Its `site` origin is changed to `https://marttelier.com`, so the
generated sitemap index and URLs use the production canonical domain.

The sitemap excludes every `/admin` route, including nested admin pages. The
checked-in `public/robots.txt` allows public crawling, disallows `/admin`, and
points to `https://marttelier.com/sitemap-index.xml`. Admin pages do not emit
public indexable sitemap entries.

## Validation

The admin validates only the editable values it accepts:

- A title is required once its locale field is edited; it is trimmed and must
  fit the existing single-line editor constraint.
- A description is required once its locale field is edited; it is trimmed and
  must fit the existing textarea constraint.
- Empty locale values are allowed as deliberate fallbacks and are not
  persisted as whitespace-only strings.
- Unknown locale keys and non-string values are rejected before publishing.

The runtime type and localization helper treat the whole `seo` object as
optional to preserve older `site.json` files. Runtime resolution never trusts
admin draft data directly; it normalizes the saved localized strings before
rendering.

## Migration and compatibility

No one-time migration is needed. Deployments with no `seo` object retain the
current metadata exactly through the final fallback. Existing `site.json`
media, person, language-picker, UGC, and translation data are untouched.

Once an editor publishes any SEO value, only the new optional `seo` subtree is
written alongside the existing data. Older published content and localized
blog Markdown remain valid without modification.

## Verification

Add focused contract coverage for:

- `site.json` SEO typing, admin draft persistence, and rejection of malformed
  localized values.
- Locale resolution for saved locale, Spanish fallback, and legacy hard-coded
  fallback.
- Route-to-page-group selection for Home, Translation & SEO, UGC, and Contact.
- Canonical, alternate, Open Graph, and Twitter URLs resolving to
  `https://marttelier.com`.
- Blog frontmatter metadata and optional social-image fallback staying
  independent of site-level SEO settings.
- Generated sitemap and `robots.txt` using the canonical origin and excluding
  all admin paths.

Run the focused SEO and admin contract tests, then build the Astro site and
inspect generated public pages, sitemap output, and `robots.txt`.
