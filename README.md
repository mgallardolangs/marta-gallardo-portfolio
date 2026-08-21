# Marta Gallardo Portfolio

Astro portfolio for Marta Gallardo’s UGC and Translation/SEO work.

## Stack

- Astro 7
- React 19 islands
- Tailwind CSS 4
- Framer Motion
- GSAP + ScrollTrigger (route-scoped)
- Embla (home orbit only)
- Lenis
- Typed.js
- Netlify deployment + Netlify Identity for `/admin`

## Site structure

Public routes:
- `/` home
- `/ugc`
- `/translation-seo`
- `/blog`
- `/contact`
- Locales: ES (default), EN, FR, DE, IT, CA

Admin routes:
- `/admin`
- `/admin/ugc`
- `/admin/translation-seo`
- `/admin/contact`
- `/admin/blog`

## Content and locale model

- `src/i18n/es.json`, `en.json`, `fr.json`, `de.json`, `it.json`, `ca.json` hold public copy.
- `/admin` edits ES/EN/FR inline.
- DE/IT/CA remain code-managed and must be updated in code when copy structure changes.
- Translation arsenal languages, tools, and skills are stored in `src/data/site.json` and rendered from shared helpers.

## Admin workflow

`/admin` is an inline editor, not Decap CMS.

It supports:
- login through Netlify Identity
- draft save/restore in local storage
- publish to repository-backed JSON/Markdown/assets
- orbit add / remove / reorder / relabel
- translation arsenal language / tool / skill controls
- blog creation in ES / EN / FR only

Publish requires login. Local preview can initialize without a token on localhost / hosted preview, but repository writes still require authentication.

## Media rules

- Keep referenced raster media in `public/images/`.
- Prefer WebP for photographic or transparent raster assets.
- SVG logos/placeholders stay SVG.
- Do not convert GIF/video to a format that changes behavior.
- Referenced non-video raster assets should stay at or below 500KB.
- Orbit image uploads: JPG / PNG / WebP / GIF up to 2MB.
- Orbit video uploads: MP4 / WebM / MOV up to 8MB and require a poster.
- Tool logos: JPG / PNG / WebP / GIF / SVG up to 2MB.

## Local commands

```bash
npm install
npm test
npm run build
```

For local development, follow `AGENTS.md` and start the dev server with the documented Astro background command.

## Deployment

- Netlify publishes `dist/` from `npm run build`.
- Public pages ship sitemap / canonical / hreflang tags.
- Admin pages are `noindex, nofollow`.
- Pushing the branch used for deployment triggers a Netlify rebuild.

## Key files

- `src/data/site.json` — shared media, orbit, social, arsenal data
- `src/views/` — shared public route views
- `src/pages/admin/` — inline admin previews
- `src/components/admin/` — editor controls, drafts, publish actions
- `docs/site-refinement.md` — implementation/reference guide for future AI or developer work
