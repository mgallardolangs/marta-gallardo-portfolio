import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

test('FloatingIcon keeps pointer-events-none by default and exposes an interactive opt-in', async () => {
  const source = await readSource('src/components/FloatingIcon.tsx');

  assert.match(source, /interactive\?: boolean;/);
  assert.match(source, /interactive = false/);
  assert.match(source, /const pointerEventsClass = interactive \? 'pointer-events-auto' : 'pointer-events-none';/);
  assert.match(source, /className=\{`\$\{pointerEventsClass\} \$\{className\}`\}/);
});

test('admin home now edits the live home sections while About owns its editable brand video', async () => {
  const [homeSource, aboutSource] = await Promise.all([
    readSource('src/pages/admin/index.astro'),
    readSource('src/pages/admin/about.astro'),
  ]);

  assert.match(homeSource, /data-admin-home-services/);
  assert.match(homeSource, /data-admin-home-visibility/);
  assert.match(homeSource, /EditableOrbitCollection/);
  assert.doesNotMatch(homeSource, /videoStickers\.|instagramScreenshot|AdminBrandVideo/);
  assert.match(aboutSource, /<AdminBrandVideo client:load\s*\/>/);
});

test('public Home no longer contains the personal video stickers; About owns the click-to-load video', async () => {
  const [homeSource, aboutSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/views/AboutPage.astro'),
  ]);

  assert.doesNotMatch(homeSource, /siteData\.videoStickers|brandVideoEmbedUrl|instagramScreenshot/);
  assert.match(aboutSource, /<ClickToLoadYouTube[\s\S]*src=\{siteData\.brandVideoEmbedUrl\}/);
  assert.doesNotMatch(aboutSource, /instagramScreenshot/);
});

test('UGC contact sheet keeps public filter markup untouched and adds an admin-only rolling filter treatment', async () => {
  const [componentSource, adminPageSource] = await Promise.all([
    readSource('src/components/UgcContactSheet.tsx'),
    readSource('src/pages/admin/ugc.astro'),
  ]);

  assert.match(adminPageSource, /<UgcContactSheet[\s\S]*\badminPreview\b/s);
  assert.match(componentSource, /adminPreview \? \(/);
  assert.match(componentSource, /: \(\s*<button[\s\S]*group inline-flex items-center gap-2 text-\[0\.65rem\] font-semibold uppercase tracking-\[0\.24em\] transition/s);
  assert.match(componentSource, /className="ugc-admin-filter__bracket ugc-admin-filter__bracket--left"/);
  assert.match(componentSource, /className="ugc-admin-filter__line"/);
  assert.match(componentSource, /className="ugc-admin-filter__bracket ugc-admin-filter__bracket--right"/);
  assert.match(componentSource, /<span>\{copy\.filters\[currentFilter\]\}<\/span>\s*<span aria-hidden="true">\{copy\.filters\[currentFilter\]\}<\/span>/s);
  assert.match(componentSource, /ugc-admin-filter/);
  assert.match(componentSource, /\.ugc-admin-filter__line\s*\{[\s\S]*?height:\s*1\.05rem;[\s\S]*?overflow:\s*hidden;[\s\S]*?\}/);
  assert.match(componentSource, /\.ugc-admin-filter:hover \.ugc-admin-filter__line > span,\s*\.ugc-admin-filter:focus-visible \.ugc-admin-filter__line > span,\s*\.ugc-admin-filter\[aria-pressed='true'\] \.ugc-admin-filter__line > span\s*\{[\s\S]*?transform:\s*translateY\(-100%\);/s);
  assert.match(componentSource, /\.ugc-admin-filter:hover \.ugc-admin-filter__bracket,\s*\.ugc-admin-filter:focus-visible \.ugc-admin-filter__bracket,\s*\.ugc-admin-filter\[aria-pressed='true'\] \.ugc-admin-filter__bracket\s*\{[\s\S]*?color:\s*var\(--color-amaranth\);/s);
});
