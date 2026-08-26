# Blog CRUD Admin Design

## Goal

Let Marta create, edit, and delete every blog post from the Spanish admin while
keeping post URLs, featured images, and public archive behavior safe.

## Admin archive

Replace the static admin list with a small React list seeded from Astro content.
Each post row keeps its title, language, tags, and date and adds:

- **Editar** — links to `/admin/blog/edit/<slug>`.
- **Eliminar** — asks for confirmation, deletes through Git Gateway, and removes
  the row immediately after success.

## Edit route and form

Add a static admin edit route for each built blog entry. It passes the existing
title, description, date, tags, language, Markdown body, and featured image into
the existing `BlogPostForm`.

`BlogPostForm` supports create and edit modes. Edit mode keeps the original slug
read-only so public URLs and alternate links cannot break accidentally. It can:

- Update all frontmatter fields and Markdown body.
- Keep the current image.
- Replace the current image.
- Remove the current image.

## Repository writes

All operations refresh Netlify Identity before Git Gateway requests.

Updating fetches the existing Markdown SHA and writes the same path. A
replacement image uploads first, then Markdown points to it. Once Markdown is
safe, an old owned image may be deleted if its path changed.

Deleting removes the Markdown file first. If its featured image is an owned
`/images/blog/<slug>.*` asset, delete that asset afterward. This ordering avoids
leaving a live post with a broken image. Partial cleanup errors are surfaced
clearly without pretending the post deletion failed.

## Public archive

The localized “More stories very soon” row appears only while the current
language contains zero or one post. At two or more localized posts, the archive
contains a real second story and the placeholder is absent.

## Checks

Regression coverage includes:

- Existing posts render Edit/Delete controls.
- Edit form is prefilled and writes the original Markdown path with its SHA.
- Image keep, replace, and remove paths.
- Delete confirmation and Markdown-before-image ordering.
- Missing or shared/non-owned images are not deleted accidentally.
- Failed operations keep form/list state and show Spanish errors.
- The archive placeholder threshold is locale-specific at fewer than two posts.
