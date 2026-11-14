import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const blogDir = new URL('../src/content/blog/', import.meta.url);
const netlifyToml = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
const redirects = [...netlifyToml.matchAll(/\[\[redirects\]\]\s*from = "([^"]+)"\s*to = "([^"]+)"\s*status = (\d+)/g)]
  .map(([, from, to, status]) => ({ from, to, status: Number(status) }));
const slugOf = (md) => md.match(/^slug: "([^"]+)"/m)[1];

for (const folder of await readdir(blogDir)) {
  test(`${folder}: Spanish keeps the folder slug, other locales have their own slug and a 301 from the old URL`, async () => {
    const seen = new Set();
    for (const lang of ['es', 'en', 'fr', 'de', 'it', 'ca']) {
      const slug = slugOf(await readFile(new URL(`${folder}/${lang}.md`, blogDir), 'utf8'));
      assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
      assert.ok(!seen.has(slug), `${lang} slug should be unique`);
      seen.add(slug);
      if (lang === 'es') {
        assert.equal(slug, folder);
        continue;
      }
      assert.notEqual(slug, folder, `${lang} should have a translated slug`);
      const rule = redirects.find((r) => r.from === `/${lang}/blog/${folder}`);
      assert.ok(rule, `/${lang}/blog/${folder} should redirect`);
      assert.equal(rule.to, `/${lang}/blog/${slug}`);
      assert.equal(rule.status, 301);
    }
  });
}
