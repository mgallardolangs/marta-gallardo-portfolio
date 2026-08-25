import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const locales = ['es', 'en', 'fr', 'de', 'it', 'ca'];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
}

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

function countMatches(source, expression) {
  return [...source.matchAll(expression)].length;
}

function extractWindowAround(source, needle, label, radius = 320) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${label} should include ${needle}`);
  return source.slice(Math.max(0, index - radius), Math.min(source.length, index + radius));
}

function extractForm(source, formName) {
  const match = source.match(new RegExp(`<form[^>]*name="${formName}"[\\s\\S]*?<\\/form>`, 's'));
  assert.ok(match, `expected to find ${formName} form`);
  return match[0];
}

function assertContactFieldContract(source, prefix) {
  const emailTag = source.match(new RegExp(`<input[^>]*id="${prefix}-email"[^>]*>`, 's'))?.[0] ?? '';
  const companyTag = source.match(new RegExp(`<input[^>]*id="${prefix}-company"[^>]*>`, 's'))?.[0] ?? '';
  const detailsTag = source.match(new RegExp(`<textarea[^>]*id="${prefix}-details"[\\s\\S]{0,200}</textarea>`, 's'))?.[0] ?? '';

  assert.match(source, new RegExp(`<label[^>]*for="${prefix}-email"`));
  assert.match(source, new RegExp(`<label[^>]*for="${prefix}-company"`));
  assert.match(source, new RegExp(`<label[^>]*for="${prefix}-details"`));
  assert.match(emailTag, /name="Email"/);
  assert.match(emailTag, /type="email"/);
  assert.match(emailTag, /\brequired\b/);
  assert.match(companyTag, /name="Company"/);
  assert.match(companyTag, /type="text"/);
  assert.doesNotMatch(companyTag, /\brequired\b/);
  assert.match(detailsTag, /\brequired\b/);

  const formSource = extractForm(source, `${prefix}-contact`);
  assert.equal(countMatches(formSource, /<label\b/g), 3, `${prefix} form should keep exactly three labels`);
  assert.equal(countMatches(formSource, /<(?:input|textarea)\b/g), 4, `${prefix} form should keep exactly one hidden field plus three user fields`);
  assert.equal(countMatches(formSource, /\brequired\b/g), 2, `${prefix} form should require only email and details`);
}

test('all six locale files expose the new Contact tabs, field, and response key groups', async () => {
  const dictionaries = await Promise.all(
    locales.map(async (locale) => [locale, await readJson(`src/i18n/${locale}.json`)]),
  );

  for (const [locale, dictionary] of dictionaries) {
    assert.deepEqual(
      Object.keys(dictionary.contact.tabs ?? {}).sort(),
      ['seo', 'ugc'],
      `${locale} should expose exactly the two contact tab labels`,
    );
    assert.deepEqual(
      Object.keys(dictionary.contact.fields ?? {}).sort(),
      ['company', 'email', 'seoDetails', 'ugcDetails'],
      `${locale} should expose the shared contact field labels plus both form-specific details prompts`,
    );
    assert.deepEqual(
      Object.keys(dictionary.contact.response ?? {}).sort(),
      ['message', 'title'],
      `${locale} should expose grouped contact success response keys`,
    );

    assert.equal(dictionary.contact.successTitle, undefined, `${locale} should move successTitle under contact.response.title`);
    assert.equal(dictionary.contact.successMessage, undefined, `${locale} should move successMessage under contact.response.message`);
    assert.equal(dictionary.contact.ugcForm?.budget, undefined, `${locale} should remove the UGC budget label key`);
    assert.equal(dictionary.contact.seoForm?.budget, undefined, `${locale} should remove the SEO budget label key`);
  }
});

test('public Contact hero keeps stable markers, a Typed title, and no old black intro card', async () => {
  const [publicSource, adminSource] = await Promise.all([
    readSource('src/views/ContactPage.astro'),
    readSource('src/pages/admin/contact.astro'),
  ]);

  for (const source of [publicSource, adminSource]) {
    assert.match(source, /<section data-contact-hero\b/);
    assert.match(source, /class="bg-paper px-6 pb-8 pt-20 text-ink md:pb-10 md:pt-24"/);
    assert.doesNotMatch(source, /pt-28|md:pt-32|pb-14|md:pb-18/);
    assert.doesNotMatch(source, /border border-white\/10 bg-ink p-8 text-paper/);
    assert.doesNotMatch(source, /lg:grid-cols-\[0\.9fr_1\.1fr\]/);
  }

  assert.match(publicSource, /<TypedTitle[\s\S]{0,320}\btext=\{i\.contact\.title\}[\s\S]{0,240}class="max-w-\[10ch\] font-heading text-4xl leading-\[0\.92\] tracking-\[-0\.04em\] text-ink md:text-6xl"/s);
  assert.match(publicSource, /<RichText text=\{i\.contact\.subtitle\} class="max-w-2xl font-body text-xs leading-5 tracking-\[0\.12em\] text-ink\/72 uppercase md:text-sm md:leading-6" \/>/);
  assert.match(adminSource, /i18nKey="contact\.title" as="h1" className="max-w-\[10ch\] font-heading text-4xl leading-\[0\.92\] tracking-\[-0\.04em\] text-ink md:text-6xl"/);
  assert.match(adminSource, /i18nKey="contact\.subtitle" as="div" className="max-w-2xl font-body text-xs leading-5 tracking-\[0\.12em\] text-ink\/72 uppercase md:text-sm md:leading-6"/);
});

test('public and admin contact pages keep the denser contact desk, exact forms, strict field set, and editable key parity', async () => {
  const [publicSource, adminSource, globalCss] = await Promise.all([
    readSource('src/views/ContactPage.astro'),
    readSource('src/pages/admin/contact.astro'),
    readSource('src/styles/global.css'),
  ]);

  for (const source of [publicSource, adminSource]) {
    assert.match(source, /import \{ initContactForms, initContactInquirySwitcher \} from /);
    assert.match(source, /data-contact-desk/);
    assert.match(source, /data-contact-tablist/);
    assert.match(source, /class="bg-ink px-6 py-8 text-paper md:py-10"/);
    assert.match(source, /class="site-container border border-paper\/14 px-5 py-6 md:px-6 md:py-8"/);
    assert.equal(countMatches(source, /data-contact-tab="ugc"/g), 1);
    assert.equal(countMatches(source, /data-contact-tab="seo"/g), 1);
    assert.equal(countMatches(source, /data-contact-panel="ugc"/g), 1);
    assert.equal(countMatches(source, /data-contact-panel="seo"/g), 1);
    assert.equal(countMatches(source, /role="tab"/g), 2);
    assert.equal(countMatches(source, /role="tabpanel"/g), 2);
    assert.equal(countMatches(source, /data-contact-success=/g), 2);
    assert.match(source, /data-contact-tab="ugc"[\s\S]{0,220}aria-selected="true"[\s\S]{0,120}tabindex="0"/s);
    assert.match(source, /data-contact-tab="seo"[\s\S]{0,220}aria-selected="false"[\s\S]{0,120}tabindex="-1"/s);
    assert.match(source, /<div data-contact-success="ugc" role="status" aria-live="polite" tabindex="-1" class=\{successClass\}>/);
    assert.match(source, /<div data-contact-success="seo" role="status" aria-live="polite" tabindex="-1" class=\{successClass\}>/);
    assert.equal(countMatches(source, /class=\{`\$\{tabClass\} contact-tab`\}/g), 2);
    assert.match(source, /data-contact-panel="seo"[\s\S]{0,200}\bhidden\b/s);
    assert.equal(countMatches(source, /name="ugc-contact"/g), 1);
    assert.equal(countMatches(source, /name="seo-contact"/g), 1);
    assert.equal(countMatches(source, /<input type="hidden" name="form-name" value="ugc-contact" \/>/g), 1);
    assert.equal(countMatches(source, /<input type="hidden" name="form-name" value="seo-contact" \/>/g), 1);
    assert.equal(countMatches(source, /rows="4"/g), 2, 'each contact page should keep both textareas at four rows');
    assert.equal(countMatches(source, /min-h-\[7rem\]/g), 2, 'each contact page should use the shorter textarea minimum height');
    assert.doesNotMatch(source, /rows="6"/);
    assert.doesNotMatch(source, /min-h-\[10rem\]/);
    assert.doesNotMatch(source, /py-14|md:py-18|px-6 py-8 md:px-8 md:py-10|pb-6|space-y-6|gap-6|py-3/);
    assert.doesNotMatch(source, /\b(?:ugc|seo)-(?:budget|name)\b/);
    assert.doesNotMatch(source, /\bname="Budget"\b/);
    assert.doesNotMatch(source, /\bname="Name"\b/);
    assert.doesNotMatch(source, /\b(?:bg|border|text)-(?:green|red|pink)(?:-\d{2,3})?\b/);
    assert.match(source, /const initContactPage = \(\) => \{\s*initContactInquirySwitcher\(\);\s*initContactForms\(\);\s*\}/s);
    assert.match(source, /document\.removeEventListener\('astro:page-load', docWithHandler\[handlerKey\]\)/);
    assert.match(source, /document\.addEventListener\('astro:page-load', initContactPage\)/);

    assertContactFieldContract(source, 'ugc');
    assertContactFieldContract(source, 'seo');
  }

  assert.match(publicSource, /const fieldClass =\s+'w-full border-b border-paper\/22 bg-transparent px-0 py-2\.5 font-body text-base text-paper outline-none transition placeholder:text-paper\/42 focus:border-amaranth';/);
  assert.match(adminSource, /const fieldClass =\s+'w-full border-b border-paper\/22 bg-transparent px-0 py-2\.5 font-body text-base text-paper outline-none transition placeholder:text-paper\/42 focus:border-amaranth';/);
  assert.match(publicSource, /const panelClass = 'pt-6';/);
  assert.match(adminSource, /const panelClass = 'pt-6';/);
  assert.match(publicSource, /<div class="border-b border-paper\/14 pb-4">/);
  assert.match(adminSource, /<div class="border-b border-paper\/14 pb-4">/);
  assert.equal(countMatches(publicSource, /class="contact-form space-y-4"/g), 2);
  assert.equal(countMatches(adminSource, /class="contact-form space-y-4"/g), 2);
  assert.equal(countMatches(publicSource, /class="grid gap-4 md:grid-cols-2"/g), 2);
  assert.equal(countMatches(adminSource, /class="grid gap-4 md:grid-cols-2"/g), 2);
  assert.equal(countMatches(publicSource, /class="flex flex-col gap-3 border-t border-paper\/14 pt-4 md:flex-row md:items-end md:justify-between"/g), 2);
  assert.equal(countMatches(adminSource, /class="flex flex-col gap-3 border-t border-paper\/14 pt-4 md:flex-row md:items-end md:justify-between"/g), 2);

  assert.match(globalCss, /\.contact-tab\s*\{/);
  assert.match(globalCss, /\.contact-tab__line\s*\{[^}]*height:\s*1\.05rem;[^}]*overflow:\s*hidden;[^}]*transition:\s*color 0\.2s ease;/s);
  assert.match(globalCss, /\.contact-tab__line > \*\s*\{[^}]*min-height:\s*1\.05rem;[^}]*transform:\s*translateY\(0\);[^}]*transition:\s*transform 0\.24s ease;/s);
  assert.match(globalCss, /\.contact-tab__bracket\s*\{[^}]*font-size:\s*0\.9rem;[^}]*opacity:\s*0;[^}]*transform:\s*translateY\(0\.3rem\);[^}]*transition:\s*opacity 0\.2s ease, transform 0\.2s ease;/s);
  assert.match(globalCss, /\.contact-tab:hover \.contact-tab__line,\s*\.contact-tab:focus-visible \.contact-tab__line,\s*\.contact-tab\[aria-selected='true'\] \.contact-tab__line\s*\{[^}]*color:\s*var\(--color-amaranth\);/s);
  assert.match(globalCss, /\.contact-tab:hover \.contact-tab__line > \*,\s*\.contact-tab:focus-visible \.contact-tab__line > \*,\s*\.contact-tab\[aria-selected='true'\] \.contact-tab__line > \*\s*\{[^}]*transform:\s*translateY\(-100%\);/s);
  assert.match(globalCss, /\.contact-tab:hover \.contact-tab__bracket,\s*\.contact-tab:focus-visible \.contact-tab__bracket,\s*\.contact-tab\[aria-selected='true'\] \.contact-tab__bracket\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*translateY\(0\);/s);
  assert.doesNotMatch(globalCss, /\.contact-tab::before|\.contact-tab::after/);

  for (const key of [
    'contact.tabs.ugc',
    'contact.tabs.seo',
    'contact.fields.email',
    'contact.fields.company',
    'contact.fields.ugcDetails',
    'contact.fields.seoDetails',
    'contact.response.title',
    'contact.response.message',
  ]) {
    const sourceKey = key.replaceAll('.', '\\.');
    assert.match(publicSource, new RegExp(`i\\.${sourceKey}`));
    assert.match(adminSource, new RegExp(`i18nKey="${sourceKey}"`));
  }

  assert.doesNotMatch(publicSource, /i\.contact\.(?:ugcForm|seoForm)\.(?:title|company|email|budget|description)/);
  assert.doesNotMatch(publicSource, /i\.contact\.success(?:Title|Message)/);
  assert.doesNotMatch(adminSource, /i18nKey="contact\.(?:ugcForm|seoForm)\.(?:title|company|email|budget|description)"/);
  assert.doesNotMatch(adminSource, /i18nKey="contact\.success(?:Title|Message)"/);
});

test('admin contact buttons keep editable labels through portal targets without stealing tab or submit clicks', async () => {
  const source = await readSource('src/pages/admin/contact.astro');

  assert.equal(countMatches(source, /clickToEdit=\{false\}/g), 6);
  assert.equal(countMatches(source, /class="group\/edit relative"/g), 4);

  assert.match(source, /class="contact-tab__line"[\s\S]{0,360}<EditableText client:load i18nKey="contact\.tabs\.ugc" as="span" className="" clickToEdit=\{false\} editButtonTargetId="admin-contact-ugc-tab-edit" \/>\s*<span aria-hidden="true">\s*<EditableText client:load i18nKey="contact\.tabs\.ugc" as="span" className="" clickToEdit=\{false\} showEditButton=\{false\} \/>\s*<\/span>/s);
  assert.match(source, /class="contact-tab__line"[\s\S]{0,360}<EditableText client:load i18nKey="contact\.tabs\.seo" as="span" className="" clickToEdit=\{false\} editButtonTargetId="admin-contact-seo-tab-edit" \/>\s*<span aria-hidden="true">\s*<EditableText client:load i18nKey="contact\.tabs\.seo" as="span" className="" clickToEdit=\{false\} showEditButton=\{false\} \/>\s*<\/span>/s);
  assert.doesNotMatch(source, /<span aria-hidden="true">\{i\.contact\.tabs\.(?:ugc|seo)\}<\/span>/);
  assert.match(source, /<EditableText client:load i18nKey="contact\.send" as="span" className="" clickToEdit=\{false\} editButtonTargetId="admin-contact-ugc-submit-edit" \/>/);
  assert.match(source, /<EditableText client:load i18nKey="contact\.send" as="span" className="" clickToEdit=\{false\} editButtonTargetId="admin-contact-seo-submit-edit" \/>/);

  assert.match(source, /<span id="admin-contact-ugc-tab-edit" \/>/);
  assert.match(source, /<span id="admin-contact-seo-tab-edit" \/>/);
  assert.match(source, /<span id="admin-contact-ugc-submit-edit" \/>/);
  assert.match(source, /<span id="admin-contact-seo-submit-edit" \/>/);
});

test('EditableText supports reactive display-only mirrors without inline pencil controls', async () => {
  const source = await readSource('src/components/admin/EditableText.tsx');

  assert.match(source, /showEditButton\?: boolean/);
  assert.match(source, /showEditButton = true/);
  assert.match(source, /!editing && showEditButton/);
});

test('contact tabs use duplicated label lines with explicit brackets in public and admin', async () => {
  const [publicSource, adminSource] = await Promise.all([
    readSource('src/views/ContactPage.astro'),
    readSource('src/pages/admin/contact.astro'),
  ]);

  for (const [label, source] of [
    ['public', publicSource],
    ['admin', adminSource],
  ]) {
    assert.equal(countMatches(source, /class="contact-tab__bracket contact-tab__bracket--left"/g), 2, `${label} contact tabs should render explicit left brackets`);
    assert.equal(countMatches(source, /class="contact-tab__bracket contact-tab__bracket--right"/g), 2, `${label} contact tabs should render explicit right brackets`);
    assert.equal(countMatches(source, /class="contact-tab__line"/g), 2, `${label} contact tabs should render duplicated rolling label lines`);
  }

  assert.match(publicSource, /class="contact-tab__line"[\s\S]{0,80}<span>\{i\.contact\.tabs\.ugc\}<\/span>\s*<span aria-hidden="true">\{i\.contact\.tabs\.ugc\}<\/span>/s);
  assert.match(publicSource, /class="contact-tab__line"[\s\S]{0,80}<span>\{i\.contact\.tabs\.seo\}<\/span>\s*<span aria-hidden="true">\{i\.contact\.tabs\.seo\}<\/span>/s);
});

test('contact desk polish keeps one header divider, one response note per panel, and editable admin bottom notes', async () => {
  const [publicSource, adminSource, globalCss] = await Promise.all([
    readSource('src/views/ContactPage.astro'),
    readSource('src/pages/admin/contact.astro'),
    readSource('src/styles/global.css'),
  ]);

  for (const [label, source] of [
    ['public', publicSource],
    ['admin', adminSource],
  ]) {
    const tabHeaderWindow = extractWindowAround(source, 'data-contact-tablist', `${label} contact tab header`);

    assert.equal(
      countMatches(source, /(?:i\.contact\.responseNote|i18nKey="contact\.responseNote")/g),
      2,
      `${label} contact page should render contact.responseNote exactly once per panel`,
    );
    assert.equal(
      countMatches(source, /border-b border-paper\/14 pb-4/g),
      1,
      `${label} contact page should keep exactly one header divider under the tabs`,
    );
    assert.match(source, /const panelClass = 'pt-6';/);
    assert.doesNotMatch(source, /const panelClass = 'border-t/);
    assert.doesNotMatch(
      tabHeaderWindow,
      /(?:i\.contact\.eyebrow|i\.contact\.responseNote|i18nKey="contact\.eyebrow"|i18nKey="contact\.responseNote")/,
      `${label} contact tab header should not repeat the eyebrow or response note`,
    );
  }

  assert.equal(
    countMatches(adminSource, /<EditableText client:load i18nKey="contact\.responseNote" as="p" className="max-w-xl font-body text-\[0\.68rem\] uppercase tracking-\[0\.22em\] text-paper\/58" \/>/g),
    2,
    'admin contact page should keep the removed top note editable through the two bottom action-row EditableText instances',
  );
  assert.equal(countMatches(globalCss, /\.contact-tab::before|\.contact-tab::after/g), 0, 'contact tabs should no longer rely on pseudo-element brackets');
});

test('contact switcher work leaves the approved Home, UGC, and Translation markers untouched', async () => {
  const [homeSource, ugcSource, translationSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/views/UgcPage.astro'),
    readSource('src/views/TranslationSeoPage.astro'),
  ]);

  assert.match(homeSource, /data-home-hero/);
  assert.match(homeSource, /data-home-orbit/);
  assert.match(ugcSource, /data-ugc-hero/);
  assert.match(ugcSource, /<UgcContactSheet/);
  assert.match(translationSource, /data-translation-page/);
  assert.match(translationSource, /data-translation-cta="contact"/);
});
