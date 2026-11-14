# SEO review · 11/11/2026

Three problems reported in the SEO review, checked against the repository and the live site (marttelier.com) on 11/11/2026.

## 1. Untranslated blog post versions (confirmed)

Post: `de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones`

| Language | Content | `<html lang>` | In hreflang | In sitemap | Listed on that blog |
|---|---|---|---|---|---|
| es | Spanish ✅ | es | yes | yes | yes |
| en | English ✅ | en | yes | yes | yes |
| fr | French ✅ | fr | yes | yes | yes |
| de | **Spanish ❌** | de | yes | yes | yes |
| it | **Spanish ❌** | it | yes | yes | yes |
| ca | **Spanish ❌** | ca | yes | yes | yes |

The `de`, `it` and `ca` files (`src/content/blog/de-traductora-…/de.md`, `it.md`, `ca.md`) are copies of the Spanish text: title, description and body. The page declares German, Italian or Catalan, but the content is Spanish.

Post `seo-internacional-mas-alla-de-traducir-tu-web`: **all six versions are correctly translated** ✅

Chosen fix: **A. translate the post** (12/11/2026).
- [x] German translation (`de.md`): title, description, tags, body and links to `/de/ueber-mich` and `/de/contact`.
- [x] Italian translation (`it.md`): links to `/it/chi-sono` and `/it/contact`.
- [x] Catalan translation (`ca.md`): links to `/ca/sobre-mi` and `/ca/contact`.
- [x] Updated the test that locked in the Spanish links for de/it/ca (`tests/public-page-structure-contract.test.mjs`).
- [ ] Marta reviews the three translations.

## 2. Blog slugs in Spanish in every language (confirmed)

Both posts use the Spanish slug in all six languages, for example:
- `/en/blog/seo-internacional-mas-alla-de-traducir-tu-web`
- `/de/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones`

The service pages, by contrast, have translated URLs (`/en/services/seo`, `/de/dienstleistungen/seo`…).

Cause: the frontmatter `slug` field is the same in every language file, and the blog uses it to build the URL and to link the versions together.

Fix (14/11/2026): each language now has a URL based on its own title.

| Post | Language | New URL |
|---|---|---|
| SEO internacional | es | `/blog/seo-internacional-mas-alla-de-traducir-tu-web` (unchanged) |
| | en | `/en/blog/international-seo-beyond-translating-your-website` |
| | fr | `/fr/blog/seo-international-au-dela-de-la-traduction-de-votre-site` |
| | de | `/de/blog/internationale-seo-mehr-als-nur-uebersetzung-ihrer-website` |
| | it | `/it/blog/seo-internazionale-oltre-la-traduzione-del-tuo-sito` |
| | ca | `/ca/blog/seo-internacional-mes-enlla-de-traduir-el-teu-web` |
| De traductora a especialista SEO | es | `/blog/de-traductora-a-especialista-en-seo-por-que-combino-ambas-profesiones` (unchanged) |
| | en | `/en/blog/from-translator-to-seo-specialist` |
| | fr | `/fr/blog/de-traductrice-a-specialiste-seo` |
| | de | `/de/blog/von-der-uebersetzerin-zur-seo-spezialistin` |
| | it | `/it/blog/da-traduttrice-a-specialista-seo` |
| | ca | `/ca/blog/de-traductora-a-especialista-seo` |

- [x] Each language file has its own `slug`; versions stay linked by `translationKey` (the folder name). The Spanish URLs don't change.
- [x] 301 from every old Spanish-slug URL to the new one (`netlify.toml`).
- [x] hreflang, sitemap, language switcher and "next post" links use the new URLs (checked in the build).
- [x] The admin keeps each language's slug when you edit a post. New posts created from the admin still get the Spanish slug in every language; that can be changed later in each file.
- [x] Tests: `tests/blog-translated-slugs.test.mjs` and updated blog tests (382 passing).
- [ ] Marta reviews the new URLs.
- [ ] Check on the Deploy Preview that the old URLs return 301.

## 3. Trailing-slash URLs don't redirect (confirmed)

| URL | Response | Canonical |
|---|---|---|
| `/fr/` | 200 (loads the page) | `https://marttelier.com/fr` |
| `/fr/contact/` | 200 | `https://marttelier.com/fr/contact` |
| `/servicios/seo/` | 200 | `https://marttelier.com/servicios/seo` |
| `/en/blog/` | 200 | `https://marttelier.com/en/blog` |
| `/translation-seo` (old) | 301 → `/servicios/seo` ✅ | — |

It's not only `/fr/`: it happens with every trailing-slash URL. The canonical points to the no-slash version, which limits the damage, but it's still duplicate content and the ideal is a 301.

Fix (13/11/2026):
- [x] Netlify Edge Function `netlify/edge-functions/trailing-slash.js`: any URL ending in `/` (except the root `/`) returns a 301 to the no-slash version, keeping query parameters. It skips static files (`/_astro/*`, `/images/*`, favicon, robots, sitemap).
  - Why not a rule in `netlify.toml`: Netlify treats `/fr/` and `/fr` as the same path in its redirect rules, so a rule from `/fr/` to `/fr` would loop.
- [x] Tests in `tests/trailing-slash-edge.test.mjs` (redirects, root and canonical URLs untouched, assets excluded). The existing routing tests don't need changes, because `netlify.toml` is unchanged.
- [x] (14/11/2026, PR #44) Checked on the Netlify Deploy Preview with `curl` that `/fr/`, `/fr/contact/`, `/servicios/seo/` and `/en/blog/` return 301 and that `/` and `/fr` return 200. (Edge Functions can't be tested with the local dev server.)

## How it was checked

- Content: front matter and first lines of each `src/content/blog/*/*.md`.
- Live site: `curl` against marttelier.com (response codes, `<html lang>`, hreflang, canonical, `sitemap-0.xml` and the blog lists for de, it and ca).
