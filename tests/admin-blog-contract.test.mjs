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

test('admin blog creation stays scoped to approved ES/EN/FR locales', async () => {
  const [formSource, storeSource] = await Promise.all([
    readSource('src/components/admin/BlogPostForm.tsx'),
    readSource('src/components/admin/adminStore.ts'),
  ]);

  assert.match(
    storeSource,
    /export const SUPPORTED_LANGS = \['es', 'en', 'fr', 'de', 'it', 'ca'\] as const;/,
    'adminStore should keep the full public locale list available',
  );
  assert.match(
    storeSource,
    /export const ADMIN_BLOG_LANGS = \['es', 'en', 'fr'\] as const;/,
    'adminStore should define the approved admin blog locale subset',
  );
  assert.match(
    storeSource,
    /lang:\s*AdminBlogLang;/,
    'createBlogPost should type blog locales as AdminBlogLang',
  );
  assert.match(
    storeSource,
    /if \(!isAdminBlogLang\(post\.lang\)\) \{\s*throw new Error\('Blog posts can only be created in ES, EN, or FR\.'\);\s*\}/s,
    'createBlogPost should reject non-admin blog locales at runtime',
  );

  assert.match(
    formSource,
    /useState<AdminBlogLang>/,
    'BlogPostForm should keep its local language state scoped to AdminBlogLang',
  );
  assert.match(
    formSource,
    /ADMIN_BLOG_LANGS\.map\(\(locale\) => \(/,
    'BlogPostForm should render the language picker from the approved admin locale list',
  );
  assert.doesNotMatch(
    formSource,
    /Deutsch|Italiano|Català/,
    'BlogPostForm should not offer DE, IT, or CA blog creation options',
  );
});
