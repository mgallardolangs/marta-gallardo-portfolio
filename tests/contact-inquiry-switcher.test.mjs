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
  assert.match(emailTag, /\bname="Email"\b/);
  assert.match(emailTag, /\btype="email"\b/);
  assert.match(emailTag, /\brequired\b/);
  assert.match(companyTag, /\bname="Company"\b/);
  assert.match(companyTag, /\btype="text"\b/);
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
  const source = await readSource('src/views/ContactPage.astro');

  assert.match(source, /<section data-contact-hero\b/);
  assert.match(source, /<TypedTitle[\s\S]{0,240}\btext=\{i\.contact\.title\}/s);
  assert.doesNotMatch(source, /border border-white\/10 bg-ink p-8 text-paper/);
  assert.doesNotMatch(source, /lg:grid-cols-\[0\.9fr_1\.1fr\]/);
});

test('public and admin contact pages lock the switcher desk, exact forms, strict field set, and editable key parity', async () => {
  const [publicSource, adminSource] = await Promise.all([
    readSource('src/views/ContactPage.astro'),
    readSource('src/pages/admin/contact.astro'),
  ]);

  for (const source of [publicSource, adminSource]) {
    assert.match(source, /import \{ initContactForms, initContactInquirySwitcher \} from /);
    assert.match(source, /data-contact-desk/);
    assert.match(source, /data-contact-tablist/);
    assert.equal(countMatches(source, /data-contact-tab="ugc"/g), 1);
    assert.equal(countMatches(source, /data-contact-tab="seo"/g), 1);
    assert.equal(countMatches(source, /data-contact-panel="ugc"/g), 1);
    assert.equal(countMatches(source, /data-contact-panel="seo"/g), 1);
    assert.equal(countMatches(source, /\brole="tab"\b/g), 2);
    assert.equal(countMatches(source, /\brole="tabpanel"\b/g), 2);
    assert.match(source, /data-contact-tab="ugc"[\s\S]{0,220}aria-selected="true"[\s\S]{0,120}tabindex="0"/s);
    assert.match(source, /data-contact-tab="seo"[\s\S]{0,220}aria-selected="false"[\s\S]{0,120}tabindex="-1"/s);
    assert.match(source, /data-contact-panel="seo"[\s\S]{0,200}\bhidden\b/s);
    assert.equal(countMatches(source, /\bname="ugc-contact"\b/g), 1);
    assert.equal(countMatches(source, /\bname="seo-contact"\b/g), 1);
    assert.equal(countMatches(source, /<input type="hidden" name="form-name" value="ugc-contact" \/>/g), 1);
    assert.equal(countMatches(source, /<input type="hidden" name="form-name" value="seo-contact" \/>/g), 1);
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
