import test from 'node:test';
import assert from 'node:assert/strict';

import { netlifyImage } from '../src/lib/netlifyImage.ts';

test('netlifyImage leaves local rasters directly accessible in development', () => {
  assert.equal(netlifyImage('/images/site/photo.jpg', { width: 800 }), '/images/site/photo.jpg');
  assert.equal(netlifyImage('/images/site/photo.png'), '/images/site/photo.png');
  assert.equal(netlifyImage('/images/site/photo.webp', { width: 400, quality: 60 }), '/images/site/photo.webp');
});

test('netlifyImage passes through non-optimizable sources unchanged', () => {
  assert.equal(netlifyImage('/images/tools/logo.svg'), '/images/tools/logo.svg');
  assert.equal(netlifyImage('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(netlifyImage('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg');
  assert.equal(netlifyImage(''), '');
  assert.equal(netlifyImage(null), '');
  assert.equal(netlifyImage(undefined), '');
});
