import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { isPublishedLocale, unpublishedLocaleFallback } from '../src/lib/localizedRoutes.js';

const blogDir = new URL('../src/content/blog/', import.meta.url);
const netlifyToml = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
const redirects = [...netlifyToml.matchAll(/\[\[redirects\]\]\s*from = "([^"]+)"\s*to = "([^"]+)"\s*status = (\d+)/g)]
  .map(([, from, to, status]) => ({ from, to, status: Number(status) }));
const slugOf = (md) => md.match(/^slug: "([^"]+)"/m)[1];

const postPath = (lang, slug) => (lang === 'es' ? `/blog/${slug}` : `/${lang}/blog/${slug}`);

for (const folder of await readdir(blogDir)) {
  test(`${folder}: Spanish keeps the folder slug, other locales have their own slug and a 301 from the old URL`, async () => {
    const seen = new Set();
    const slugs = {};
    for (const lang of ['es', 'en', 'fr', 'de', 'it', 'ca']) {
      const slug = slugOf(await readFile(new URL(`${folder}/${lang}.md`, blogDir), 'utf8'));
      slugs[lang] = slug;
      assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
      assert.ok(!seen.has(slug), `${lang} slug should be unique`);
      seen.add(slug);
      if (lang === 'es') {
        assert.equal(slug, folder);
        continue;
      }
      assert.notEqual(slug, folder, `${lang} should have a translated slug`);
    }

    for (const lang of ['en', 'fr', 'de', 'it', 'ca']) {
      // Unpublished locales (de, it, ca) land on the same post in their fallback locale.
      const finalLang = isPublishedLocale(lang) ? lang : unpublishedLocaleFallback[lang];
      const finalPath = postPath(finalLang, slugs[finalLang]);
      const rule = redirects.find((r) => r.from === `/${lang}/blog/${folder}`);
      assert.ok(rule, `/${lang}/blog/${folder} should redirect`);
      assert.equal(rule.to, finalPath, `the old Spanish-slug URL in ${lang} goes straight to the final post`);
      assert.equal(rule.status, 301);

      if (!isPublishedLocale(lang)) {
        const unpublished = redirects.find((r) => r.from === postPath(lang, slugs[lang]));
        assert.ok(unpublished, `${postPath(lang, slugs[lang])} is not published and should redirect`);
        assert.equal(unpublished.to, finalPath);
        assert.equal(unpublished.status, 301);
      }
    }
  });
}
