# Unified Media Embeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Home, UGC, and orbit video slots accept the same URL/iframe embed input without changing existing local uploads, posters, layouts, or assets; render only HTTPS embeds in Home and UGC focused playback while leaving orbit tiles unchanged and orbit publishing dependent on a local video source.

**Architecture:** Store an optional normalized-compatible embed string alongside each UGC/orbit item; keep `src` as the existing local fallback. Reuse `toEmbedUrl` for admin preview, but require `toHttpsEmbedUrl` anywhere public rendering or embed-only UGC publishing depends on the value. Poster-based thumbnails and orbit tiles remain unchanged, and orbit validation continues to require a local `src`. Add the smallest shared admin field needed to match the existing Home control.

**Tech Stack:** Astro 7, React 19, TypeScript, Node’s built-in test runner, existing `toEmbedUrl` parser and admin store.

---

### Task 1: Extend media records and admin-store persistence

**Files:**
- Modify: `src/lib/siteData.ts:8-31`
- Modify: `src/data/site.json` only if the existing records require explicit empty fields
- Modify: `src/components/admin/adminStore.ts:738-788,1101-1245`
- Modify: `src/components/admin/useAdminStore.ts:1-35`
- Test: `tests/media-embed-contract.test.mjs` (new)

- [ ] **Step 1: Write the failing contract test**

Add a Node test that reads the source files and asserts:

```js
assert.match(siteDataSource, /embedUrl\?: string \| null;/);
assert.match(storeSource, /setUgcPortfolioEmbedUrl/);
assert.match(storeSource, /setOrbitMediaEmbedUrl/);
assert.match(storeHookSource, /setUgcPortfolioEmbedUrl/);
assert.match(storeHookSource, /setOrbitMediaEmbedUrl/);
```

Also assert that the setter trims values, accepts an empty string to clear the
embed, marks the publish state dirty, and emits exactly like the existing media
setters by checking the method bodies.

- [ ] **Step 2: Run the contract test and confirm it fails**

Run: `node --test tests/media-embed-contract.test.mjs`

Expected: FAIL because the optional field and setters do not exist on `main`.

- [ ] **Step 3: Add the optional field and setters**

Add `embedUrl?: string | null` to both `OrbitMedia` and `UgcPortfolioItem`.
Add `setOrbitMediaEmbedUrl(index, value)` and
`setUgcPortfolioEmbedUrl(itemId, value)` beside the existing poster/file
methods. Each method should:

```ts
const item = ...;
if (!item || item.type !== 'video') return;
item.embedUrl = value.trim() || null;
this.publishSuccessState = false;
this.publishErrorState = '';
this.emit();
```

Expose both bound methods from `useAdminStore.ts`. Do not rewrite existing
`src`, `poster`, pending asset, or upload-path logic. Treat missing fields in
existing JSON as `null` at render time rather than mass-editing Marta’s data.

- [ ] **Step 4: Run the contract test and the existing media tests**

Run: `node --test tests/media-embed-contract.test.mjs tests/video-embed.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the persistence change**

```bash
git add src/lib/siteData.ts src/components/admin/adminStore.ts src/components/admin/useAdminStore.ts tests/media-embed-contract.test.mjs
git commit -m "feat: persist media embed values" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Match the Home embed control in UGC and orbit editors

**Files:**
- Create: `src/components/admin/EditableVideoEmbed.tsx`
- Modify: `src/components/admin/EditableUgcPortfolio.tsx:69-134`
- Modify: `src/components/admin/EditableOrbitCollection.tsx:73-134`
- Test: `tests/media-embed-contract.test.mjs`

- [ ] **Step 1: Write the failing UI contract assertions**

Extend the contract test to assert the shared control imports `toEmbedUrl`,
renders a text input with an iframe/link placeholder, shows an invalid-input
message, and calls the supplied setter with the trimmed value. Assert both
UGC and orbit editors render the shared control for video items and pass the
item’s `embedUrl`.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/media-embed-contract.test.mjs`

Expected: FAIL because no shared control or editor wiring exists.

- [ ] **Step 3: Implement the minimal shared embed control**

Create `EditableVideoEmbed` with props:

```ts
type Props = {
  value: string | null | undefined;
  onChange: (value: string) => void;
  label?: string;
};
```

Use `toEmbedUrl(value)` for validity and preview. Render the same Spanish
label, placeholder, invalid message, and “remove link/use uploaded file” action
as `AdminBrandVideo`, but use a compact non-absolute layout suitable for the
UGC/orbit forms. The preview must be an accessible iframe with
`loading="lazy"`, the existing `allow` permissions, `allowFullScreen`, and
`title`. The control must not alter `src` or `poster`.

- [ ] **Step 4: Wire both editors**

In `EditableUgcPortfolio`, render the shared control inside the video branch
next to the poster and call `store.setUgcPortfolioEmbedUrl(item.id, value)`.
In `EditableOrbitCollection`, render it in the video branch and call
`store.setOrbitMediaEmbedUrl(index, value)`. Keep the current upload controls,
labels, poster requirements, and layout classes.

- [ ] **Step 5: Run the contract and production type/build checks**

Run: `node --test tests/media-embed-contract.test.mjs && npm run build`

Expected: PASS and a successful Astro production build.

- [ ] **Step 6: Commit the admin control change**

```bash
git add src/components/admin/EditableVideoEmbed.tsx src/components/admin/EditableUgcPortfolio.tsx src/components/admin/EditableOrbitCollection.tsx tests/media-embed-contract.test.mjs
git commit -m "feat: add embed input to media editors" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Render embeds only in focused public video frames

**Files:**
- Modify: `src/components/UgcContactSheet.tsx:342-366,440-458`
- Modify: `src/components/admin/AdminOrbitPreview.tsx:12-64`
- Test: `tests/media-embed-contract.test.mjs`

- [ ] **Step 1: Add failing fallback/render assertions**

Assert that the UGC focused renderer imports `toEmbedUrl`, prefers
`item.embedUrl` when it normalizes successfully, and retains the current
`item.src` video fallback. Assert that contact-sheet/orbit thumbnail branches
continue to use posters or local sources rather than iframe embeds, and that
`OvalMediaOrbit.tsx` remains unchanged.

- [ ] **Step 2: Run the test and confirm the rendering assertions fail**

Run: `node --test tests/media-embed-contract.test.mjs`

Expected: FAIL because the public UGC renderer currently always uses
`<video src={item.src}>`.

- [ ] **Step 3: Add focused embed rendering**

In the UGC dialog, compute `const embedUrl = toEmbedUrl(activeItem.embedUrl)`.
When the active item is a video and `embedUrl` exists, render an iframe in the
same `aspect-[9/16]` frame; otherwise keep the current video branch unchanged.
Keep `activeItem.poster` for the contact-sheet thumbnail and fallback video.

Leave `OvalMediaOrbit.tsx` unchanged: moving tiles cannot safely host remote
iframes without changing autoplay, pointer interaction, and performance. Keep
the poster-only behavior in `AdminOrbitPreview`.

- [ ] **Step 4: Run focused tests and build**

Run: `node --test tests/media-embed-contract.test.mjs tests/video-embed.test.mjs && npm run build`

Expected: PASS and a successful build.

- [ ] **Step 5: Commit public rendering**

```bash
git add src/components/UgcContactSheet.tsx src/components/OvalMediaOrbit.tsx src/components/admin/AdminOrbitPreview.tsx tests/media-embed-contract.test.mjs
git commit -m "feat: render media embeds in focused views" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Preserve validation, documentation, and verify the branch

**Files:**
- Modify: `src/lib/ugcPortfolio.ts:87-108`
- Modify: `src/lib/orbitMedia.ts` only if validation currently rejects optional embed records
- Modify: `GUIA-MARTA.md` only to document the new UGC/orbit video field
- Test: `tests/media-embed-contract.test.mjs`

- [ ] **Step 1: Add validation regression assertions**

Assert that UGC accepts HTTPS embed-only videos but rejects HTTP-only embed-only
publishes, that orbit still requires a local `src` even when `embedUrl` exists,
that both validators still require local posters for video slots and reject
image posters, and that they still enforce the existing 2 MB image and 8 MB
video upload limits. Assert that admin parsing still accepts HTTP(S) through
`toEmbedUrl` while public rendering/publish gates use `toHttpsEmbedUrl`.

- [ ] **Step 2: Implement the smallest validation change**

Change UGC validation to accept embed-only videos only when
`toHttpsEmbedUrl(item.embedUrl)` returns a URL. Keep orbit validation based on
its local `src` regardless of `embedUrl`, so extension/source checks stay tied
to the file that orbit public tiles actually render. Leave all file
MIME/size/poster checks unchanged. Do not add a new dependency or upload path.

- [ ] **Step 3: Update Marta’s guide**

Add one short instruction explaining that video slots can use either the
existing local upload or a pasted provider URL/iframe, while the poster remains
the local thumbnail. Keep the existing high-quality image/video guidance.

- [ ] **Step 4: Run the complete existing validation**

Run:

```bash
node --test tests/*.test.mjs
npm run build
git diff --check origin/main...HEAD
git diff --name-only origin/main...HEAD
```

Expected: the new focused tests and build pass; any full-suite failures must be
the same pre-existing failures already present on `main`. The changed-file list
must contain only the spec, plan, media schema/store/editor/rendering/docs/test
files; no existing image or video asset may be modified.

- [ ] **Step 5: Commit final validation/documentation changes**

```bash
git add src/lib/ugcPortfolio.ts src/lib/orbitMedia.ts GUIA-MARTA.md tests/media-embed-contract.test.mjs
git commit -m "docs: document unified video media inputs" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 6: Push and open the requested unmerged PR**

```bash
git push -u origin unify-media-embeds
gh pr create --base main --head unify-media-embeds --title "Unify video embeds across admin media" --body "Adds the Home-style URL/iframe input to UGC and orbit video slots while preserving local uploads, posters, layouts, and existing assets. Full-suite pre-existing failures are documented in the PR checks."
```

Leave the PR open for Marta’s review; do not merge it.
