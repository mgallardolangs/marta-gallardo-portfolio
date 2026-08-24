import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readSource(relativePath) {
  try {
    return await readFile(path.join(rootDir, relativePath), 'utf8');
  } catch (error) {
    assert.fail(`${relativePath} should exist for the approved blog hero divider contract: ${error.message}`);
  }
}

function extractWindowAround(source, needle, label, radius = 1200) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${label} should include ${needle}`);
  return source.slice(Math.max(0, index - radius), Math.min(source.length, index + radius));
}

test('BlogIndexPage removes only the full-width hero divider and keeps latest/archive borders', async () => {
  const source = await readSource('src/views/BlogIndexPage.astro');

  const heroBlock = extractWindowAround(source, 'data-blog-hero', 'BlogIndexPage hero block');
  const latestBlock = extractWindowAround(source, 'data-blog-latest-story', 'BlogIndexPage latest-story block');
  const archiveBlock = extractWindowAround(source, 'data-blog-archive', 'BlogIndexPage archive block');

  assert.doesNotMatch(
    heroBlock,
    /border-b border-black\/10/,
    'data-blog-hero should no longer render the full-width divider between the hero and latest story',
  );
  assert.match(
    latestBlock,
    /border-y border-black\/10/,
    'data-blog-latest-story should keep its bordered editorial frame',
  );
  assert.match(
    archiveBlock,
    /border-t border-black\/10/,
    'data-blog-archive should keep its top archive divider',
  );
  assert.match(
    archiveBlock,
    /border-b border-black\/10/,
    'data-blog-archive should keep its contained row dividers',
  );
});
