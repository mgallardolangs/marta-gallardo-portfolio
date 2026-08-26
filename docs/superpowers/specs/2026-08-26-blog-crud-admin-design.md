# Multilingual Blog CRUD Admin Design

## Goal

Manage each article as one logical multilingual post while preserving Astro's
Markdown rendering, SEO metadata, headings, and table of contents.

## Content model

Each logical post has six Markdown files, one per supported locale. Files share:

- `slug`
- `translationKey`
- `date`
- featured `image`

Each locale file owns its translated:

- `title`
- `description`
- `tags`
- Markdown body
- `lang`

Internal filenames are unique per locale. Public routes use the shared
frontmatter `slug`, never the internal filename.

The existing initial Spanish article is migrated into the grouped six-file
model. Its Spanish copy is preserved; other locales initially receive the
Spanish fallback and can be translated from admin.

## Language visibility and fallback

The admin derives required translation panels from `siteData.publicLanguagePicker`.
Currently visible ES/EN/FR panels are required before create/update.

Hidden DE/IT/CA locale files are still created using Spanish fallback content.
If a hidden locale is later enabled in the navbar, its panel appears
automatically in create/edit screens and its fallback can be replaced.

## Admin archive and editor

The archive groups locale files by `translationKey` and shows one row per
logical post with **Editar** and **Eliminar**.

The create/edit form has:

- Shared slug, date, and featured image controls.
- One panel per currently public language.
- Required translated title, description, tags, and body.
- Fixed slug during edit.
- Existing-image keep, replace, and remove controls.

## Repository operations

Create/update refreshes Netlify Identity and writes every locale file. Visible
locales use submitted translations; hidden locales keep their existing content
on edit or receive Spanish fallback on create. Writes are retry-safe because
every path is upserted using its current SHA.

Delete removes every locale Markdown file in the group before deleting the
shared owned `/images/blog/<slug>.*` asset. Partial failures identify remaining
files and keep the admin row visible until all locale posts are deleted.

## Public routes and archive

Public route generation and links use `post.data.slug`. Alternate links group by
`translationKey`.

“More stories very soon” appears only when the current locale has fewer than two
posts. Two or more localized posts render real archive rows without the
placeholder.

## Checks

Regression coverage includes:

- Grouping six locale files into one admin row.
- Dynamic required panels from the public language picker.
- Spanish fallback creation for hidden locales.
- Edit preservation of hidden locale translations.
- Same-slug localized routes and alternate links.
- Image keep/replace/remove behavior.
- Six-file deletion before owned-image cleanup.
- Retry-safe partial failure reporting.
- Locale-specific archive placeholder threshold.
