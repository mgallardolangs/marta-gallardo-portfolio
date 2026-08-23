# Blog Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved latest-feature Blog index, indexed article reader, and strict editorial admin workflow.

**Architecture:** Keep Astro content collections and locale routing. Extract shared Blog helpers/components for latest/archive selection and H2/H3 TOC generation. Extend the existing React BlogPostForm with a lightweight Markdown toolbar, live outline, and assets-first featured-image upload.

**Tech Stack:** Astro 7 Content Collections, React 19, Tailwind CSS 4, Typed.js, Node built-in tests.

---

## Task 1: Define Blog contracts

**Files:**

- Create: `tests/blog-editorial-contract.test.mjs`
- Modify: `tests/blog-locale-contract.test.mjs`

- [ ] Add red contracts for:
  - Latest locale post selected once.
  - Remaining archive excludes latest and stays newest-first.
  - Empty archive row.
  - Approved hero/latest/archive markers/classes.
  - Article TOC helper from H2/H3 headings.
  - Nested numbering and valid IDs.
  - Sticky desktop/mobile TOC.
  - Admin editorial list and strict form.
  - Markdown H2/H3 toolbar and live outline.
  - Featured image upload validation and assets-first order.
  - Existing locale/duplicate-slug rules.
  - Home/UGC/Translation stability.

- [ ] Run targeted tests red and commit.

## Task 2: Add Blog copy, feature media, and helpers

**Files:**

- Create: `public/images/blog/mi-primer-post.webp`
- Modify: `src/content/blog/mi-primer-post.md`
- Modify: `src/i18n/*.json`
- Modify: `src/lib/blog.ts`
- Create: `src/lib/blogOutline.ts`

- [ ] Download a local landscape temporary WebP under 500 KB and add it to the Spanish post frontmatter.

- [ ] Add all-six keys from the design spec.

- [ ] Add helpers:

```ts
getLatestAndArchive(posts)
getAdjacentLocalePost(posts, currentPost)
buildBlogOutline(headings)
parseMarkdownOutline(markdown)
insertMarkdownHeading(text, selectionStart, selectionEnd, level)
```

- [ ] Test exact sorting/exclusion/nesting and commit.

## Task 3: Build public index and article

**Files:**

- Rewrite: `src/views/BlogIndexPage.astro`
- Create: `src/components/BlogArticleLayout.astro`
- Create: `src/components/BlogTableOfContents.tsx`
- Modify: all six `src/pages/**/blog/[slug].astro`

- [ ] Blog index:
  - Approved eyebrow/title/subtitle/rule.
  - Latest feature `1.05fr/.95fr`, landscape image, larger copy.
  - All feature click targets route to article.
  - Archive rows exclude latest.
  - Localized empty archive row.

- [ ] Article:
  - Use `render(post)` headings.
  - Shared layout for all six routes.
  - Header/image/body exact design.
  - Sticky H2/H3 TOC with active scroll state.
  - Mobile TOC chips.
  - Valid next/back link.

- [ ] Remove duplicated article body markup from locale routes while preserving locale-specific `getStaticPaths`.

- [ ] Run public/locale/build tests and commit.

## Task 4: Build editorial admin and heading tools

**Files:**

- Rewrite: `src/pages/admin/blog/index.astro`
- Restyle: `src/pages/admin/blog/new.astro`
- Modify: `src/components/admin/BlogPostForm.tsx`
- Modify: `src/components/admin/adminStore.ts`

- [ ] Admin index:
  - Editorial header and black rectangular new-post button.
  - Compact numbered rows.
  - No rounded/pastel cards.

- [ ] Form:
  - Square strict-palette field grid.
  - Featured-image file input/preview.
  - H2/H3/Bold/Link toolbar.
  - Live nested outline.
  - Existing validation and language behavior.

- [ ] Extend `createBlogPost`:
  - Validate image MIME and <=2 MB.
  - Upload image first.
  - Add image frontmatter path.
  - Reject duplicate slug before writes.
  - Preserve form data on failure.

- [ ] Test toolbar insertion, outline parsing, image upload ordering, duplicate slug, and commit.

## Task 5: Verify and present Blog checkpoint

**Files:**

- Modify: `docs/site-refinement.md`
- Modify session artifact: `/Users/berengueragulloadrian/.copilot/session-state/441ad769-1603-42cd-8a3d-b1fba6b5c1d2/plan.md`

- [ ] Document Blog architecture and editor.

- [ ] Run:

```bash
npm test
npm run build
CHECK_DIST=1 npm test
git diff --check
```

- [ ] Audit strict palette, one latest feature, article TOC links, admin toolbar, and route localization.

- [ ] Restart background server and review:

```text
/blog
/blog/mi-primer-post
/admin/blog
/admin/blog/new
```

- [ ] Stop for approval before Contact.
