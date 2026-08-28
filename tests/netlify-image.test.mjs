import test from 'node:test';
import assert from 'node:assert/strict';

import { netlifyImage } from '../src/lib/netlifyImage.ts';

test('netlifyImage routes local rasters through the Netlify Image CDN', () => {
  assert.equal(
    netlifyImage('/images/site/photo.jpg', { width: 800 }),
    '/.netlify/images?url=%2Fimages%2Fsite%2Fphoto.jpg&w=800&q=75',
  );
  assert.equal(
    netlifyImage('/images/site/photo.png'),
    '/.netlify/images?url=%2Fimages%2Fsite%2Fphoto.png&q=75',
  );
  assert.equal(
    netlifyImage('/images/site/photo.webp', { width: 400, quality: 60 }),
    '/.netlify/images?url=%2Fimages%2Fsite%2Fphoto.webp&w=400&q=60',
  );
});

test('netlifyImage passes through non-optimizable sources unchanged', () => {
  assert.equal(netlifyImage('/images/tools/logo.svg'), '/images/tools/logo.svg');
  assert.equal(netlifyImage('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(netlifyImage('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg');
  assert.equal(netlifyImage(''), '');
  assert.equal(netlifyImage(null), '');
  assert.equal(netlifyImage(undefined), '');
});
