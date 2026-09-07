# Editable SEO Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Home, Translation & SEO, UGC, and Contact metadata editable and localized while consistently publishing canonical SEO to `https://marttelier.com`.

**Architecture:** Add one optional, localized `seo` subtree to the existing `site.json` data source. Resolve public-page metadata in a small `siteData` helper used by the four public views; retain `BaseLayout` and `SeoHead` as the sole metadata rendering pipeline. A single admin editor writes through the existing `AdminStore` draft and Git Gateway publish flow.

**Tech Stack:** Astro 7, React 19, TypeScript, `@astrojs/sitemap`, Node.js built-in test runner.

---

## File map

- Modify: `astro.config.mjs` — set the production site origin and exclude all admin paths from Astro sitemap output.
- Modify: `public/robots.txt` — retain the admin crawl block and point at the canonical sitemap URL.
- Modify: `src/data/site.json` — add the optional persisted SEO values.
- Modify: `src/lib/siteData.ts` — define SEO types and resolve normalized localized metadata with safe legacy fallbacks.
- Modify: `src/components/SeoHead.astro` — use the canonical production origin for canonical, alternate, social, and Person JSON-LD URLs.
- Modify: `src/views/HomePage.astro`, `src/views/TranslationSeoPage.astro`, `src/views/UgcPage.astro`, `src/views/ContactPage.astro` — obtain title and description through the shared resolver.
- Create: `src/components/admin/EditableSeoSettings.tsx` — render the four page groups and localized title/description inputs.
- Modify: `src/components/admin/adminStore.ts`, `src/components/admin/useAdminStore.ts` — expose typed SEO reads and sanitized writes in the established draft/publish state.
- Modify: `src/pages/admin/index.astro` — mount the single SEO editor on the current admin home.
- Modify: `tests/seo-social-image-contract.test.mjs` — update existing canonical-domain fixtures and assert generated public metadata.
- Create: `tests/editable-seo-settings.test.mjs` — cover data validation, locale fallback, admin persistence, routes, sitemap/robots, and blog independence.

### Task 1: Establish the canonical crawl contract

**Files:**
- Modify: `astro.config.mjs`
- Modify: `public/robots.txt`
- Test: `tests/editable-seo-settings.test.mjs`

- [ ] **Step 1: Write the failing canonical sitemap and robots test**

```js
test('canonical configuration generates only public URLs', async () => {
  const [config, robots] = await Promise.all([
    readSource('astro.config.mjs'),
    readSource('public/robots.txt'),
  ]);

  assert.match(config, /site:\s*'https:\/\/marttelier\.com'/);
  assert.match(config, /filter:\s*\(page\)\s*=>\s*!page\.includes\('\/admin'\)/);
  assert.match(robots, /^Disallow: \/admin$/m);
  assert.match(robots, /^Sitemap: https:\/\/marttelier\.com\/sitemap-index\.xml$/m);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/editable-seo-settings.test.mjs`  
Expected: FAIL because the configured and robots sitemap origins still reference `marttelier.netlify.app`.

- [ ] **Step 3: Apply the minimal canonical configuration**

```js
// astro.config.mjs
site: 'https://marttelier.com',
integrations: [
  react(),
  sitemap({
    filter: (page) => !page.includes('/admin'),
  }),
],
```

```txt
# public/robots.txt
User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://marttelier.com/sitemap-index.xml
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/editable-seo-settings.test.mjs`  
Expected: PASS for `canonical configuration generates only public URLs`.

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs public/robots.txt tests/editable-seo-settings.test.mjs
git commit -m "fix(seo): use canonical production origin"
```

### Task 2: Define SEO data and safe localized resolution

**Files:**
- Modify: `src/data/site.json`
- Modify: `src/lib/siteData.ts`
- Modify: `tests/editable-seo-settings.test.mjs`

- [ ] **Step 1: Write failing resolver tests**

```js
import { resolveSeoText } from '../src/lib/siteData.ts';

test('SEO resolution prefers requested locale then Spanish then page fallback', () => {
  const value = { es: 'Título español', en: 'English title' };
  assert.equal(resolveSeoText(value, 'en', 'Fallback'), 'English title');
  assert.equal(resolveSeoText(value, 'fr', 'Fallback'), 'Título español');
  assert.equal(resolveSeoText(undefined, 'fr', 'Fallback'), 'Fallback');
  assert.equal(resolveSeoText({ es: '   ' }, 'fr', 'Fallback'), 'Fallback');
});

test('site SEO data only accepts six string locale values', async () => {
  const source = await readSource('src/lib/siteData.ts');
  assert.match(source, /type SeoPageKey = 'home' \| 'translationSeo' \| 'ugc' \| 'contact'/);
  assert.match(source, /seo\?: Partial<Record<SeoPageKey, SeoPageMetadata>>/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/editable-seo-settings.test.mjs`  
Expected: FAIL because `resolveSeoText`, `SeoPageKey`, and optional `seo` typing do not exist.

- [ ] **Step 3: Add the smallest shared data model and resolver**

```ts
export type SeoPageKey = 'home' | 'translationSeo' | 'ugc' | 'contact';
export type SeoPageMetadata = {
  title?: Partial<LocalizedText>;
  description?: Partial<LocalizedText>;
};

export type ResolvedSeoPageMetadata = {
  title: string;
  description: string;
};

export function resolveSeoText(
  value: Partial<LocalizedText> | undefined,
  lang: Locale,
  fallback: string,
): string {
  const localized = value?.[lang]?.trim() || value?.es?.trim();
  return localized || fallback;
}

export function getPageSeo(
  site: Partial<SiteData>,
  page: SeoPageKey,
  lang: Locale,
  fallback: SeoPageMetadata,
): ResolvedSeoPageMetadata {
  const saved = site.seo?.[page];
  return {
    title: resolveSeoText(saved?.title, lang, resolveSeoText(fallback.title, lang, '')),
    description: resolveSeoText(saved?.description, lang, resolveSeoText(fallback.description, lang, '')),
  };
}
```

Add `seo?: Partial<Record<SeoPageKey, SeoPageMetadata>>` to `SiteData`, then seed all four page groups with non-empty Spanish title and description values in `site.json`. Do not modify existing non-SEO data.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `node --test tests/editable-seo-settings.test.mjs`  
Expected: PASS for localization priority and optional legacy data behavior.

- [ ] **Step 5: Commit**

```bash
git add src/data/site.json src/lib/siteData.ts tests/editable-seo-settings.test.mjs
git commit -m "feat(seo): add localized site metadata"
```

### Task 3: Feed editable metadata into public pages without affecting blog posts

**Files:**
- Modify: `src/views/HomePage.astro`
- Modify: `src/views/TranslationSeoPage.astro`
- Modify: `src/views/UgcPage.astro`
- Modify: `src/views/ContactPage.astro`
- Modify: `src/components/SeoHead.astro`
- Modify: `tests/seo-social-image-contract.test.mjs`
- Modify: `tests/editable-seo-settings.test.mjs`

- [ ] **Step 1: Write failing rendering-contract tests**

```js
test('public static page views resolve their own editable SEO group', async () => {
  const files = {
    home: 'src/views/HomePage.astro',
    translationSeo: 'src/views/TranslationSeoPage.astro',
    ugc: 'src/views/UgcPage.astro',
    contact: 'src/views/ContactPage.astro',
  };

  for (const [page, file] of Object.entries(files)) {
    const source = await readSource(file);
    assert.match(source, new RegExp(`getPageSeo\\(siteData, '${page}', lang,`));
    assert.match(source, /<BaseLayout title=\{pageSeo\.title\} description=\{pageSeo\.description\}>/);
  }
});

test('blog metadata remains frontmatter-owned', async () => {
  const source = await readSource('src/components/BlogArticleLayout.astro');
  assert.match(source, /title=\{`\$\{post\.data\.title\} — \$\{i\.hero\.name\}`\}/);
  assert.match(source, /description=\{post\.data\.description\}/);
  assert.doesNotMatch(source, /getPageSeo/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/editable-seo-settings.test.mjs tests/seo-social-image-contract.test.mjs`  
Expected: FAIL because the four views still derive metadata directly from i18n values.

- [ ] **Step 3: Replace only the four static-page metadata variables**

```astro
---
import { getPageSeo, siteData } from '../lib/siteData';
// Keep the current i18n-derived title and description as the final fallback.
const pageSeo = getPageSeo(siteData, 'home', lang, {
  title: { [lang]: `${i.hero.name} — ${i.home.hero.kicker}` },
  description: { [lang]: i.home.hero.description },
});
---
<BaseLayout title={pageSeo.title} description={pageSeo.description}>
```

Apply the identical pattern with the page keys `translationSeo`, `ugc`, and
`contact`, preserving each file's current title and description expression in
its fallback object. Do not change `BlogArticleLayout.astro`.

In `SeoHead.astro`, retain the existing social-image logic and use
`new URL(target, Astro.site)` after Task 1's canonical `site` change; add no
second URL constant.

- [ ] **Step 4: Update canonical social-image fixture and run focused tests**

Change `siteUrl` in `tests/seo-social-image-contract.test.mjs` to
`https://marttelier.com`, then run:

Run: `node --test tests/editable-seo-settings.test.mjs tests/seo-social-image-contract.test.mjs`  
Expected: PASS, including frontmatter-owned blog metadata and portrait fallback.

- [ ] **Step 5: Commit**

```bash
git add src/views/HomePage.astro src/views/TranslationSeoPage.astro src/views/UgcPage.astro src/views/ContactPage.astro src/components/SeoHead.astro tests/editable-seo-settings.test.mjs tests/seo-social-image-contract.test.mjs
git commit -m "feat(seo): resolve editable public page metadata"
```

### Task 4: Add one persisted admin SEO editor

**Files:**
- Create: `src/components/admin/EditableSeoSettings.tsx`
- Modify: `src/components/admin/adminStore.ts`
- Modify: `src/components/admin/useAdminStore.ts`
- Modify: `src/pages/admin/index.astro`
- Modify: `tests/editable-seo-settings.test.mjs`

- [ ] **Step 1: Write failing admin store and editor contract tests**

```js
test('admin SEO editor persists clean localized values through site data', async () => {
  const [{ AdminStore }, editor] = await Promise.all([
    import('../src/components/admin/adminStore.ts'),
    readSource('src/components/admin/EditableSeoSettings.tsx'),
  ]);
  const store = new AdminStore();
  store.init({ es: {}, en: {}, fr: {} }, {}, 'es', 'publish-token');
  store.setSeoText('home', 'title', 'es', '  SEO en español  ');

  assert.equal(store.getSeoText('home', 'title', 'es'), 'SEO en español');
  assert.match(editor, /SEO_PAGE_KEYS = \['home', 'translationSeo', 'ugc', 'contact'\] as const/);
  assert.match(editor, /store\.setSeoText\(page, field, locale, event\.target\.value\)/);
});

test('admin SEO writes reject unknown locales and non-string values', async () => {
  const { AdminStore } = await import('../src/components/admin/adminStore.ts');
  const store = new AdminStore();
  store.init({ es: {}, en: {}, fr: {} }, {}, 'es', 'publish-token');
  assert.throws(() => store.setSeoText('home', 'title', 'pt', 'Olá'), /Idioma SEO no válido/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/editable-seo-settings.test.mjs`  
Expected: FAIL because the typed SEO store methods and editor component do not exist.

- [ ] **Step 3: Implement the minimum typed store API and editor**

```ts
// adminStore.ts
getSeoText(page: SeoPageKey, field: 'title' | 'description', lang: SupportedLang): string {
  const value = deepGet(this.images, `seo.${page}.${field}.${lang}`);
  return typeof value === 'string' ? value : '';
}

setSeoText(page: SeoPageKey, field: 'title' | 'description', lang: string, value: unknown): void {
  if (!SUPPORTED_LANGS.includes(lang as SupportedLang) || typeof value !== 'string') {
    throw new Error('Idioma SEO no válido');
  }
  deepSet(this.images, `seo.${page}.${field}.${lang}`, value.trim());
  this.publishSuccessState = false;
  this.publishErrorState = '';
  this.emit();
}
```

Expose both methods from `useAdminStore.ts`. In
`EditableSeoSettings.tsx`, use the existing hook; render four labeled
`fieldset` groups and inputs for all six supported locales for each title and description.
Use `input` for titles and `textarea` for descriptions. Do not add a route,
new storage key, or separate save button; the existing toolbar draft and
publish actions own persistence.

Mount `<EditableSeoSettings client:load />` in a labeled editor section in
`src/pages/admin/index.astro`.

- [ ] **Step 4: Extend persistence coverage and run focused tests**

Add a mocked `fetch` publish assertion that verifies the existing
`src/data/site.json` write body contains:

```js
assert.equal(published.seo.home.title.es, 'SEO en español');
```

Run: `node --test tests/editable-seo-settings.test.mjs`  
Expected: PASS for trim, invalid-locale rejection, draft-state change, and
Git Gateway `site.json` publishing.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/EditableSeoSettings.tsx src/components/admin/adminStore.ts src/components/admin/useAdminStore.ts src/pages/admin/index.astro tests/editable-seo-settings.test.mjs
git commit -m "feat(admin): edit localized SEO settings"
```

### Task 5: Validate production output and compatibility

**Files:**
- Modify: `tests/editable-seo-settings.test.mjs`
- Modify: `tests/seo-social-image-contract.test.mjs`

- [ ] **Step 1: Write the failing built-output tests**

```js
test('built sitemap and public pages use the canonical origin without admin URLs', async (t) => {
  if (process.env.CHECK_DIST !== '1') return t.skip('Build first.');
  const [home, sitemap] = await Promise.all([
    readSource('dist/index.html'),
    readSource('dist/sitemap-0.xml'),
  ]);

  assert.match(home, /<link rel="canonical" href="https:\/\/marttelier\.com\/"/);
  assert.match(sitemap, /https:\/\/marttelier\.com\//);
  assert.doesNotMatch(sitemap, /\/admin(?:\/|<)/);
});
```

- [ ] **Step 2: Run the built-output test before building**

Run: `CHECK_DIST=1 node --test tests/editable-seo-settings.test.mjs`  
Expected: FAIL because the current `dist` is absent or stale.

- [ ] **Step 3: Build the site**

Run: `npm run build`  
Expected: Astro completes successfully and writes `dist/sitemap-index.xml`,
`dist/sitemap-0.xml`, and the public HTML pages.

- [ ] **Step 4: Run complete verification**

Run: `CHECK_DIST=1 node --test tests/editable-seo-settings.test.mjs tests/seo-social-image-contract.test.mjs && npm test`  
Expected: PASS. The build output has canonical and alternate URLs rooted at
`https://marttelier.com`, sitemap files contain no `/admin` route, robots
references the canonical sitemap, static pages use editable/fallback metadata,
and blog post metadata remains unchanged.

- [ ] **Step 5: Commit**

```bash
git add tests/editable-seo-settings.test.mjs tests/seo-social-image-contract.test.mjs
git commit -m "test(seo): cover canonical editable metadata"
```

## Plan self-review

- **Spec coverage:** Task 1 covers canonical origin, sitemap, robots, and admin
  exclusion. Tasks 2–4 cover centralized editable data, localized fallbacks,
  validation, admin persistence, and legacy optional data. Task 3 preserves
  blog frontmatter metadata and social-image fallback. Task 5 verifies built
  output and full regression coverage.
- **Placeholders:** No implementation placeholders remain; every task names
  files, concrete APIs, assertions, commands, and expected results.
- **Type consistency:** `SeoPageKey`, `SeoPageMetadata`, `resolveSeoText`,
  `getPageSeo`, `getSeoText`, and `setSeoText` retain identical names and
  signatures across the plan.
