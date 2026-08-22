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

test('public and admin home heroes tighten top spacing and keep matching primary CTA markup', async () => {
  const [homeSource, adminHomeSource, globalCssSource] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/pages/admin/index.astro'),
    readSource('src/styles/global.css'),
  ]);

  assert.match(homeSource, /data-home-hero class="home-hero bg-paper px-6 pt-20 pb-16 md:pt-24 md:pb-20"/);
  assert.match(adminHomeSource, /data-admin-home-hero class="home-hero bg-paper px-6 pt-20 pb-16 md:pt-24 md:pb-20"/);
  assert.doesNotMatch(homeSource, /home-hero__cta--secondary/);
  assert.doesNotMatch(adminHomeSource, /home-hero__cta--secondary/);
  assert.equal(
    homeSource.match(/class="home-hero__cta home-hero__cta--primary"/g)?.length,
    2,
    'public hero should render both CTAs with the same primary treatment',
  );
  assert.equal(
    adminHomeSource.match(/class="home-hero__cta home-hero__cta--primary"/g)?.length,
    2,
    'admin hero should render both CTAs with the same primary treatment',
  );
  assert.match(
    globalCssSource,
    /\.home-hero__actions\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[^}]*gap:\s*0\.75rem;[^}]*\}/s,
  );
  assert.match(
    globalCssSource,
    /\.home-hero__cta\s*\{[^}]*width:\s*100%;[^}]*justify-content:\s*center;[^}]*text-align:\s*center;[^}]*\}/s,
  );
  assert.match(
    globalCssSource,
    /\.home-hero__cta-label\s*\{[^}]*display:\s*block;[^}]*white-space:\s*normal;[^}]*\}/s,
  );
  assert.doesNotMatch(globalCssSource, /\.home-hero__cta--secondary\b/);
});

test('header and footer tighten nav sizing and swap every LinkedIn icon for the text-only in mark', async () => {
  const [headerSource, footerSource] = await Promise.all([
    readSource('src/components/Header.astro'),
    readSource('src/components/Footer.astro'),
  ]);

  assert.match(headerSource, /<div class="hidden items-center gap-6 md:ml-auto md:flex">/);
  assert.match(headerSource, /<nav aria-label="Primary" class="flex items-center gap-4">/);
  assert.match(headerSource, /\.nav-link\s*\{[^}]*font-size:\s*0\.64rem;[^}]*letter-spacing:\s*0\.18em;[^}]*\}/s);
  assert.match(headerSource, /\.social-control\s*\{[^}]*height:\s*2\.2rem;[^}]*width:\s*2\.2rem;[^}]*\}/s);
  assert.match(
    headerSource,
    /<a href=\{siteData\.socialLinks\.linkedin\}[^>]*aria-label="LinkedIn"[^>]*class="social-control">\s*<span class="social-control__linkedin-mark" aria-hidden="true">in<\/span>\s*<\/a>/,
  );
  assert.equal(
    headerSource.match(/class="social-control__linkedin-mark" aria-hidden="true">in<\/span>/g)?.length,
    2,
    'desktop and mobile header social links should both use the text-only LinkedIn mark',
  );
  assert.match(
    footerSource,
    /<a href=\{siteData\.socialLinks\.linkedin\}[^>]*aria-label="LinkedIn"[^>]*class="footer-social">\s*<span class="footer-social__linkedin-mark" aria-hidden="true">in<\/span>\s*<\/a>/,
  );
});

test('typed cursor and shared reveal motion use the stronger alignment and timing contracts', async () => {
  const [globalCssSource, scrollRevealSource, staggerSource] = await Promise.all([
    readSource('src/styles/global.css'),
    readSource('src/components/ScrollReveal.tsx'),
    readSource('src/components/StaggerContainer.tsx'),
  ]);

  assert.match(
    globalCssSource,
    /\.typed-cursor\s*\{[^}]*grid-area:\s*1\s*\/\s*2;[^}]*align-self:\s*end;[^}]*color:\s*(?:var\(--color-amaranth\)|#E83256);[^}]*margin-inline-start:\s*0\.12em;[^}]*animation:\s*typed-cursor-blink 1s steps\(1\) infinite;[^}]*\}/s,
  );
  assert.match(scrollRevealSource, /up:\s*\{\s*y:\s*64,\s*x:\s*0\s*\}/);
  assert.match(scrollRevealSource, /left:\s*\{\s*x:\s*-64,\s*y:\s*0\s*\}/);
  assert.match(scrollRevealSource, /right:\s*\{\s*x:\s*64,\s*y:\s*0\s*\}/);
  assert.match(scrollRevealSource, /useInView\(ref,\s*\{\s*once:\s*true,\s*margin:\s*'-40px'\s*\}\)/);
  assert.match(scrollRevealSource, /transition=\{\{\s*duration:\s*0\.88,\s*delay,\s*ease:\s*\[0\.22,\s*1,\s*0\.36,\s*1\]\s*\}\}/);
  assert.match(staggerSource, /viewport=\{\{\s*once:\s*true,\s*margin:\s*'-40px'\s*\}\}/);
  assert.match(
    staggerSource,
    /hidden:\s*\{\s*opacity:\s*0,\s*y:\s*48,\s*scale:\s*1\s*\},\s*visible:\s*\{\s*opacity:\s*1,\s*y:\s*0,\s*scale:\s*1,\s*transition:\s*\{\s*duration:\s*0\.72,\s*ease:\s*\[0\.22,\s*1,\s*0\.36,\s*1\]\s*\}\s*\}/s,
  );
});

test('orbit hover playback exposes a helper for immediate pause and resume while public home shifts only the live orbit wrapper', async () => {
  const [homeSource, adminHomeSource, orbitSource, orbitMedia] = await Promise.all([
    readSource('src/views/HomePage.astro'),
    readSource('src/pages/admin/index.astro'),
    readSource('src/components/OvalMediaOrbit.tsx'),
    import('../src/lib/orbitMedia.ts'),
  ]);

  assert.match(homeSource, /<div class="order-4 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:order-none lg:translate-x-6">/);
  assert.doesNotMatch(adminHomeSource, /lg:translate-x-6/);
  assert.match(orbitSource, /syncOrbitDriftPlayback\(driftTweenRef\.current,\s*itemId\);/);
  assert.match(
    orbitSource,
    /onPointerLeave=\{\(event\) => \{\s*if \(event\.pointerType === 'touch'\) return;\s*if \(event\.currentTarget\.contains\(event\.relatedTarget as Node \| null\)\) return;\s*clearActiveTile\(\);\s*\}\}/s,
  );
  assert.match(
    orbitSource,
    /role="region"[\s\S]*onPointerLeave=\{\(event\) => \{\s*if \(event\.pointerType === 'touch'\) return;\s*if \(event\.currentTarget\.contains\(event\.relatedTarget as Node \| null\)\) return;\s*clearActiveTile\(\);\s*\}\}/s,
  );

  const calls = [];
  const fakeTween = {
    pause() {
      calls.push('pause');
    },
    play() {
      calls.push('play');
    },
  };

  assert.equal(orbitMedia.syncOrbitDriftPlayback(undefined, 'orbit-1'), 'pause');
  assert.equal(orbitMedia.syncOrbitDriftPlayback(fakeTween, 'orbit-1'), 'pause');
  assert.equal(orbitMedia.syncOrbitDriftPlayback(fakeTween, null), 'play');
  assert.deepEqual(calls, ['pause', 'play']);
});

test('footer becomes a seamless black section and keeps the single-row label reveal contract', async () => {
  const footerSource = await readSource('src/components/Footer.astro');

  assert.match(footerSource, /<footer class="footer-shell bg-charcoal text-cream">/);
  assert.doesNotMatch(footerSource, /rounded-\[2\.25rem\]/);
  assert.doesNotMatch(footerSource, /border border-white\/10 bg-charcoal/);
  assert.match(footerSource, /\.footer-nav-link__line\s*\{[^}]*display:\s*block;[^}]*height:\s*1rem;[^}]*overflow:\s*hidden;[^}]*\}/s);
  assert.match(
    footerSource,
    /\.footer-nav-link__line > span\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*height:\s*1rem;[^}]*transition:\s*transform 0\.24s ease;[^}]*\}/s,
  );
  assert.match(footerSource, /\.footer-nav-link:hover \.footer-nav-link__line > span,[\s\S]*transform:\s*translateY\(-100%\);/s);
});
