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

test('admin homepage sticker frames opt into interactive FloatingIcon wrappers for all four EditableImage slots', async () => {
  const source = await readSource('src/pages/admin/index.astro');

  for (const [key, intensity] of [
    ['one', 10],
    ['two', 12],
    ['three', 14],
    ['four', 11],
  ]) {
    assert.match(
      source,
      new RegExp(`<FloatingIcon client:visible intensity=\\{${intensity}\\} interactive>[\\s\\S]*?imageKey="videoStickers\\.${key}"`, 's'),
      `admin homepage should keep the ${key} sticker inside an interactive FloatingIcon wrapper`,
    );
  }
});

test('public homepage binds all four video stickers to siteData with image-first rendering and localized text fallbacks', async () => {
  const source = await readSource('src/views/HomePage.astro');

  for (const [key, shotKey] of [
    ['one', 'shotOne'],
    ['two', 'shotTwo'],
    ['three', 'shotThree'],
    ['four', 'shotFour'],
  ]) {
    assert.match(
      source,
      new RegExp(`siteData\\.videoStickers\\.${key}\\s*\\?\\s*\\([\\s\\S]*?<img[\\s\\S]*?src=\\{siteData\\.videoStickers\\.${key}\\}[\\s\\S]*?alt=\\{i\\.home\\.gallery\\.${shotKey}\\}[\\s\\S]*?class="h-full w-full object-cover"[\\s\\S]*?\\)\\s*:\\s*\\([\\s\\S]*?i\\.home\\.gallery\\.${shotKey}`, 's'),
      `public homepage should render ${key} from siteData.videoStickers.${key} and fall back to i.home.gallery.${shotKey}`,
    );
  }
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
