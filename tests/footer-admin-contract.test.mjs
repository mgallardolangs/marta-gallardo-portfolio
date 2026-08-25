import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];
const navKeys = ['nav.home', 'nav.ugc', 'nav.translationSeo', 'nav.blog', 'nav.contact'];
const editableFooterKeys = [
  'footer.eyebrow',
  'footer.headline',
  'footer.support',
  'footer.cta',
  'footer.brand',
  'hero.name',
  'footer.rights',
];

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

function extractFooter(html, label) {
  const match = html.match(/<footer\b[\s\S]*?<\/footer>/);
  assert.ok(match, `${label} should include a footer`);
  return match[0];
}

test('footer admin source makes every visible text editable without hard-coded footer copy', async () => {
  const [footerSource, adminLayoutSource] = await Promise.all([
    readSource('src/components/Footer.astro'),
    readSource('src/layouts/AdminLayout.astro'),
  ]);

  assert.match(adminLayoutSource, /<Footer lang=\{lang\} adminMode=\{true\} \/>/, 'AdminLayout should keep footer adminMode enabled');
  assert.match(footerSource, /import EditableText from '\.\/admin\/EditableText';/, 'Footer should load EditableText for the admin branch');

  for (const key of editableFooterKeys) {
    assert.match(
      footerSource,
      new RegExp(`i18nKey="${key.replace('.', '\\.')}"`),
      `${key} should be editable in the admin footer`,
    );
  }

  for (const key of navKeys) {
    assert.match(
      footerSource,
      new RegExp(`['"]${key.replace('.', '\\.')}['"]`),
      `${key} should stay wired into the footer nav`,
    );
  }

  assert.match(footerSource, /i\.footer\.brand/, 'public footer should render the locale footer brand');
  assert.match(footerSource, /i\.hero\.name/, 'copyright name should use hero.name');
  assert.doesNotMatch(footerSource, />\s*MG\s*</, 'Footer should not hard-code the brand mark');
  assert.doesNotMatch(footerSource, /Marta Gallardo/, 'Footer should not hard-code the person name');
  assert.doesNotMatch(footerSource, /footer\.name/, 'Footer should not introduce a duplicate footer name key');

  assert.match(
    footerSource,
    /<div class="[^"]*group\/edit relative overflow-visible[^"]*">\s*<a href=\{navPath\('\/contact'\)\} class="footer-cta">[\s\S]*i18nKey="footer\.cta"[\s\S]*editButtonTargetId="admin-footer-cta-edit"/,
    'CTA should stay clickable while moving its edit pencil outside the link',
  );
  assert.match(
    footerSource,
    /<EditableText client:load i18nKey=\{item\.i18nKey\} as="span" className="" clickToEdit=\{false\} editButtonTargetId=\{`admin-footer-nav-\$\{item\.key\}-edit`\} \/>[\s\S]*<EditableText client:load i18nKey=\{item\.i18nKey\} as="span" className="" clickToEdit=\{false\} showEditButton=\{false\} \/>/m,
    'admin nav labels should use one editable copy plus one reactive display-only duplicate',
  );
  assert.match(
    footerSource,
    /id=\{`admin-footer-nav-\$\{item\.key\}-edit`\}/,
    'nav edit buttons should target deterministic external portal ids',
  );
});

test('all locale files define footer.brand with the shared MG mark', async () => {
  const dictionaries = await Promise.all(locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)]));

  for (const [locale, dictionary] of dictionaries) {
    assert.equal(dictionary.footer.brand, 'MG', `${locale} should define footer.brand as MG`);
    assert.equal(typeof dictionary.footer.location, 'string', `${locale} should keep footer.location intact`);
    assert.notEqual(dictionary.footer.location.trim(), '', `${locale} footer.location should stay populated`);
  }
});

test('built footer stays static in public HTML and mounts editable islands only in admin HTML', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify built footer HTML.');
    return;
  }

  const [publicHtml, adminHtml] = await Promise.all([
    readSource('dist/index.html'),
    readSource('dist/admin/index.html'),
  ]);

  const publicFooter = extractFooter(publicHtml, 'public home HTML');
  const adminFooter = extractFooter(adminHtml, 'admin home HTML');

  assert.doesNotMatch(publicFooter, /admin-footer-[\w-]+-edit/, 'public footer should not render admin pencil targets');
  assert.doesNotMatch(publicFooter, /<astro-island\b/, 'public footer should stay static Astro markup');
  assert.match(publicFooter, />MG</, 'public footer should still render the brand text');
  assert.match(publicFooter, /Marta Gallardo/, 'public footer should still render the display name text');

  assert.match(adminFooter, /admin-footer-cta-edit/, 'admin footer should render the CTA edit portal target');
  assert.match(adminFooter, /admin-footer-nav-home-edit/, 'admin footer should render deterministic nav edit portal targets');
  assert.match(adminFooter, /footer\.brand/, 'admin footer should render an editable footer.brand island');
  assert.match(adminFooter, /<astro-island\b/, 'admin footer should mount editable islands');
});
