import test from 'node:test';
import assert from 'node:assert/strict';

import { toEmbedUrl } from '../src/lib/videoEmbed.ts';

test('toEmbedUrl normalizes YouTube links to the embed player', () => {
  assert.equal(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=42'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(toEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(toEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
});

test('toEmbedUrl normalizes Vimeo links, including unlisted hashes', () => {
  assert.equal(toEmbedUrl('https://vimeo.com/123456789'), 'https://player.vimeo.com/video/123456789');
  assert.equal(toEmbedUrl('https://vimeo.com/123456789/abc123'), 'https://player.vimeo.com/video/123456789?h=abc123');
  assert.equal(toEmbedUrl('https://player.vimeo.com/video/123456789?h=abc123'), 'https://player.vimeo.com/video/123456789?h=abc123');
});

test('toEmbedUrl extracts the src from a pasted <iframe> snippet', () => {
  const snippet = '<iframe src="https://player.vimeo.com/video/123456789?h=abc123" width="640" height="360" allowfullscreen></iframe>';
  assert.equal(toEmbedUrl(snippet), 'https://player.vimeo.com/video/123456789?h=abc123');
});

test('toEmbedUrl normalizes Instagram links and embed snippets', () => {
  assert.equal(toEmbedUrl('https://www.instagram.com/p/ABC123/'), 'https://www.instagram.com/p/ABC123/embed');
  assert.equal(toEmbedUrl('https://instagram.com/reel/XY_9-z/'), 'https://www.instagram.com/reel/XY_9-z/embed');
  const blockquote = '<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/reel/XY_9-z/?utm_source=ig_embed"></blockquote>';
  assert.equal(toEmbedUrl(blockquote), 'https://www.instagram.com/reel/XY_9-z/embed');
});

test('toEmbedUrl allows embeds from any provider, rejecting only unsafe or malformed input', () => {
  // Any http(s) URL is allowed through (TikTok, a generic player, etc.).
  assert.equal(toEmbedUrl('https://www.tiktok.com/@user/video/123'), 'https://www.tiktok.com/@user/video/123');
  assert.equal(toEmbedUrl('https://example.com/embed/xyz'), 'https://example.com/embed/xyz');

  // Empty, malformed, and unsafe-scheme input is still rejected.
  assert.equal(toEmbedUrl(''), null);
  assert.equal(toEmbedUrl('   '), null);
  assert.equal(toEmbedUrl(null), null);
  assert.equal(toEmbedUrl('not a url'), null);
  assert.equal(toEmbedUrl('javascript:alert(1)'), null);
});
