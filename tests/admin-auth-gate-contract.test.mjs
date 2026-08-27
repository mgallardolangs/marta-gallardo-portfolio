import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdminStore } from '../src/components/admin/adminStore.ts';
import {
  ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS,
  createAdminAuthGateOpenController,
  getAdminInitDecision,
  shouldAllowTokenlessAdminInit,
} from '../src/lib/adminInit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
let cachedFixturesPromise;

async function readSource(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readOptionalSource(relativePath) {
  try {
    return await readSource(relativePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath));
}

async function loadAdminFixtures() {
  if (!cachedFixturesPromise) {
    cachedFixturesPromise = Promise.all([
      readJson('src/i18n/es.json'),
      readJson('src/i18n/en.json'),
      readJson('src/i18n/fr.json'),
      readJson('src/data/site.json'),
    ]).then(([es, en, fr, site]) => ({
      i18n: { es, en, fr },
      site,
    }));
  }

  return cachedFixturesPromise;
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function createLocalStorage(seed = {}) {
  const values = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function createImageFile(name = 'admin-auth-preview.png', content = 'preview') {
  return new File([Buffer.from(content)], name, { type: 'image/png' });
}

function mockWindow(windowValue) {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const previousWindow = globalThis.window;
  globalThis.window = windowValue;

  return () => {
    if (hadWindow) {
      globalThis.window = previousWindow;
      return;
    }

    delete globalThis.window;
  };
}

function mockFetch(fetchImpl) {
  const hadFetch = Object.prototype.hasOwnProperty.call(globalThis, 'fetch');
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;

  return () => {
    if (hadFetch) {
      globalThis.fetch = previousFetch;
      return;
    }

    delete globalThis.fetch;
  };
}

async function createDirtyStore(token = 'publish-token') {
  const fixtures = await loadAdminFixtures();
  const store = new AdminStore();

  store.init(fixtures.i18n, fixtures.site, 'es', token);
  store.setText('nav.home', 'Portada pendiente');
  await store.setImage(
    'heroMainPhoto',
    createImageFile(),
    '/images/site/admin-auth-preview.png',
  );

  return {
    store,
    previewBeforeAuthChange: store.getImageSrc('heroMainPhoto'),
  };
}

function makeBlogTranslationsFixture(overrides = {}) {
  const base = {
    es: { title: 'Título ES', description: 'Descripción ES', tags: ['seo'], body: '# Cuerpo ES' },
    en: { title: 'Title EN', description: 'Description EN', tags: ['seo'], body: '# Body EN' },
    fr: { title: 'Titre FR', description: 'Description FR', tags: ['seo'], body: '# Corps FR' },
  };

  return {
    es: { ...base.es, ...overrides.es },
    en: { ...base.en, ...overrides.en },
    fr: { ...base.fr, ...overrides.fr },
  };
}

test('shouldAllowTokenlessAdminInit only trusts loopback hosts', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', '[::1]']) {
    assert.equal(
      shouldAllowTokenlessAdminInit(host),
      true,
      `loopback host ${host} should be the only place where admin tokenless init is allowed`,
    );
  }

  for (const host of ['marttelier.netlify.app', 'custom.production.example.com']) {
    assert.equal(
      shouldAllowTokenlessAdminInit(host),
      false,
      `production host ${host} should require a real admin session before the editor initializes`,
    );
  }
});

test('admin init waits in production without a user but upgrades any valid tokenized session', () => {
  assert.equal(
    getAdminInitDecision({
      isInitialized: false,
      identityToken: '',
      allowTokenlessFallback: false,
    }),
    'wait',
    'production init without a user should wait for login instead of booting a tokenless admin store',
  );

  assert.equal(
    getAdminInitDecision({
      isInitialized: false,
      identityToken: '',
      allowTokenlessFallback: true,
    }),
    'init-without-token',
    'local loopback hosts should still allow the tokenless admin bootstrap fallback',
  );

  assert.equal(
    getAdminInitDecision({
      isInitialized: false,
      identityToken: 'identity-token',
      allowTokenlessFallback: false,
    }),
    'init-with-token',
    'a valid existing Netlify Identity user should initialize the admin store with its token',
  );

  assert.equal(
    getAdminInitDecision({
      isInitialized: true,
      identityToken: 'fresh-token',
      allowTokenlessFallback: false,
    }),
    'update-token',
    'later login events should upgrade an already initialized store instead of rebuilding it',
  );
});

test('AdminInit wires host-aware init plus login and logout identity transitions', async () => {
  const source = await readSource('src/components/admin/AdminInit.tsx');

  assert.match(
    source,
    /shouldAllowTokenlessAdminInit\(window\.location\.hostname\)/,
    'AdminInit should derive its tokenless bypass from the current hostname helper instead of allowing production silently',
  );
  assert.match(
    source,
    /identity\.on\('init', onIdentityChange\)/,
    'AdminInit should react when Netlify Identity finishes resolving the current user',
  );
  assert.match(
    source,
    /identity\.on\('login', onIdentityChange\)/,
    'AdminInit should upgrade the admin store when a login event arrives',
  );
  assert.match(
    source,
    /identity\.on\('logout',/,
    'AdminInit should subscribe to logout events so production auth can be cleared immediately',
  );
  assert.match(
    source,
    /identity\.off\?\.\('logout',/,
    'AdminInit should clean up the logout listener alongside init and login listeners',
  );
  assert.match(
    source,
    /adminStore\.clearAuthToken\(\)/,
    'AdminInit should clear the admin auth state on logout instead of leaving a stale authenticated snapshot behind',
  );
});

test('AdminStore snapshot exposes isAuthenticated and tracks auth changes without reinitializing content', async () => {
  const fixtures = await loadAdminFixtures();
  const store = new AdminStore();

  store.init(fixtures.i18n, fixtures.site, 'es', '');

  const tokenlessSnapshot = store.getSnapshot();
  assert.ok(
    'isAuthenticated' in tokenlessSnapshot,
    'AdminStore.getSnapshot() should expose isAuthenticated so React gates can block editing in production',
  );
  if (!('isAuthenticated' in tokenlessSnapshot)) return;

  assert.equal(
    tokenlessSnapshot.isAuthenticated,
    false,
    'a tokenless admin bootstrap should not present the production editor as authenticated',
  );

  store.setAuthToken('fresh-admin-token');

  assert.equal(
    store.getSnapshot().isAuthenticated,
    true,
    'setAuthToken should flip the snapshot to authenticated once a real admin session exists',
  );
});

test('setAuthToken preserves initialized i18n, image previews, and draft state after a fresh login', async () => {
  const fixtures = await loadAdminFixtures();
  const store = new AdminStore();
  const restoreWindow = mockWindow({
    localStorage: createLocalStorage(),
  });

  try {
    store.init(fixtures.i18n, fixtures.site, 'es', '');
    store.setText('nav.home', 'Portada segura');
    await store.setImage(
      'heroMainPhoto',
      createImageFile('fresh-login.png', 'fresh-login'),
      '/images/site/fresh-login.png',
    );
    store.saveDraft();

    const beforeLogin = store.getSnapshot();
    const previewBeforeLogin = store.getImageSrc('heroMainPhoto');

    store.setAuthToken('fresh-admin-token');

    const afterLogin = store.getSnapshot();
    assert.equal(afterLogin.initialized, true, 'logging in should not rebuild or drop the initialized admin store');
    assert.equal(store.getText('nav.home'), 'Portada segura', 'logging in should preserve pending text edits');
    assert.equal(
      store.getImageSrc('heroMainPhoto'),
      previewBeforeLogin,
      'logging in should preserve pending image previews so the editor does not lose unsaved uploads',
    );
    assert.equal(
      afterLogin.pendingCount,
      beforeLogin.pendingCount,
      'logging in should not discard existing dirty diffs or pending draft work',
    );
    assert.equal(afterLogin.draftTone, beforeLogin.draftTone, 'logging in should preserve the draft save status');
    assert.equal(afterLogin.draftMessage, beforeLogin.draftMessage, 'logging in should preserve the draft save copy');
  } finally {
    restoreWindow();
  }
});

test('clearAuthToken only drops auth state and preserves dirty edits plus pending previews', async () => {
  const { store, previewBeforeAuthChange } = await createDirtyStore();
  const clearAuthToken = store.clearAuthToken;

  assert.equal(
    typeof clearAuthToken,
    'function',
    'AdminStore should expose clearAuthToken so logout can revoke publish access without destroying pending work',
  );
  if (typeof clearAuthToken !== 'function') return;

  const pendingCountBeforeLogout = store.getSnapshot().pendingCount;

  store.clearAuthToken();

  const afterLogout = store.getSnapshot();
  assert.equal(afterLogout.initialized, true, 'logout should keep the admin store initialized inside the current tab');
  assert.equal(
    store.getText('nav.home'),
    'Portada pendiente',
    'logout should preserve unsaved dirty edits so the admin can resume after signing back in',
  );
  assert.equal(
    store.getImageSrc('heroMainPhoto'),
    previewBeforeAuthChange,
    'logout should preserve pending image previews instead of wiping the current editing tab',
  );
  assert.equal(
    afterLogout.pendingCount,
    pendingCountBeforeLogout,
    'logout should only flip auth state and keep the pending dirty diff count intact',
  );
  assert.ok(
    'isAuthenticated' in afterLogout,
    'logout contracts need an isAuthenticated snapshot flag for React auth gates and toolbar status copy',
  );
  if ('isAuthenticated' in afterLogout) {
    assert.equal(afterLogout.isAuthenticated, false, 'logout should leave the store unauthenticated');
  }
});

test('expired identity refresh clears auth, keeps edits and previews, and returns actionable Spanish publish guidance', async () => {
  const { store, previewBeforeAuthChange } = await createDirtyStore();
  const fetchCalls = [];
  const restoreWindow = mockWindow({
    localStorage: createLocalStorage(),
    netlifyIdentity: {
      currentUser: () => ({ id: 'admin-editor' }),
      refresh: async () => {
        throw new Error('expired');
      },
    },
  });
  const restoreFetch = mockFetch(async (input, init = {}) => {
    fetchCalls.push({ input: String(input), init });
    return new Response(JSON.stringify({ message: 'publish should stop before repository writes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  try {
    await store.publish();
  } finally {
    restoreFetch();
    restoreWindow();
  }

  const snapshot = store.getSnapshot();
  assert.match(
    snapshot.publishError,
    /La sesión de administrador ha expirado/i,
    'publish should explain in Spanish that the existing admin session expired after Identity refresh fails',
  );
  assert.match(
    snapshot.publishError,
    /vuelve a iniciarla/i,
    'publish should tell the editor to sign in again instead of leaving the next action implicit',
  );
  assert.match(
    snapshot.publishError,
    /cambios sin publicar siguen abiertos/i,
    'publish should reassure the editor that unsaved changes still remain available in the current tab',
  );
  assert.ok(
    'isAuthenticated' in snapshot,
    'expired sessions need a snapshot auth flag so UI gates and the toolbar can react immediately',
  );
  if ('isAuthenticated' in snapshot) {
    assert.equal(snapshot.isAuthenticated, false, 'an expired refresh should clear the stored authenticated state');
  }
  assert.equal(snapshot.isDirty, true, 'an expired refresh should keep the draft dirty so the admin can retry later');
  assert.equal(
    store.getText('nav.home'),
    'Portada pendiente',
    'an expired refresh should not discard dirty text edits',
  );
  assert.equal(
    store.getImageSrc('heroMainPhoto'),
    previewBeforeAuthChange,
    'an expired refresh should preserve pending image previews in the current tab',
  );
  assert.equal(fetchCalls.length, 0, 'publish should stop before any repository writes when Identity refresh fails');
});

test('valid identity refresh still publishes using the fresh token', async () => {
  const fixtures = await loadAdminFixtures();
  const store = new AdminStore();
  const fetchCalls = [];
  const restoreWindow = mockWindow({
    localStorage: createLocalStorage(),
    netlifyIdentity: {
      currentUser: () => ({ id: 'admin-editor' }),
      refresh: async () => 'fresh-admin-token',
    },
  });
  const restoreFetch = mockFetch(async (input, init = {}) => {
    fetchCalls.push({ input: String(input), init });
    const method = init.method ?? 'GET';

    if (method === 'PUT') {
      return new Response(JSON.stringify({ content: { sha: 'written-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  try {
    store.init(fixtures.i18n, fixtures.site, 'es', 'stale-admin-token');
    store.setText('nav.home', 'Portada publicada');
    await store.publish();
  } finally {
    restoreFetch();
    restoreWindow();
  }

  const snapshot = store.getSnapshot();
  assert.equal(snapshot.publishSuccess, true, 'publish should still succeed after refreshing a valid session');
  assert.equal(snapshot.publishError, '', 'successful publish should clear any auth error copy');
  assert.ok(fetchCalls.length >= 2, 'publish should perform authenticated reads and writes once the token refresh succeeds');
  assert.ok(
    fetchCalls.every(({ init }) => String(init.headers?.Authorization ?? '') === 'Bearer fresh-admin-token'),
    'every Git Gateway read/write in publish should use the freshly refreshed Netlify Identity token',
  );
});

test('AdminAuthGate exists and AdminLayout mounts it exactly once', async () => {
  const [gateSource, layoutSource] = await Promise.all([
    readOptionalSource('src/components/admin/AdminAuthGate.tsx'),
    readSource('src/layouts/AdminLayout.astro'),
  ]);

  assert.ok(
    gateSource,
    'src/components/admin/AdminAuthGate.tsx should be created so production admin routes can block editing until authentication succeeds',
  );
  if (!gateSource) return;

  assert.match(
    layoutSource,
    /import\s+AdminAuthGate\s+from\s+['"]\.\.\/components\/admin\/AdminAuthGate['"];/,
    'AdminLayout should import the dedicated auth gate instead of leaving the admin editor directly exposed',
  );

  const gateMounts = layoutSource.match(/<AdminAuthGate\s+client:load\s+allowTokenless=\{allowTokenless\}\s*\/>/g) ?? [];
  assert.equal(
    gateMounts.length,
    1,
    'AdminLayout should mount AdminAuthGate exactly once for the whole admin shell, passing the computed allowTokenless prop',
  );
});

test('AdminAuthGate only bypasses local hosts and shows the production full-screen login overlay until authenticated', async () => {
  const source = await readOptionalSource('src/components/admin/AdminAuthGate.tsx');

  assert.ok(
    source,
    'src/components/admin/AdminAuthGate.tsx should exist before production admin editing can be blocked correctly',
  );
  if (!source) return;

  assert.match(
    source,
    /allowTokenless/,
    'AdminAuthGate should accept the allowTokenless prop AdminLayout computes from Astro.url.hostname instead of re-deriving the host on the client',
  );
  assert.match(
    source,
    /className="fixed inset-0[\s\S]*?"/,
    'AdminAuthGate should render a fixed full-screen overlay while production admin auth is missing',
  );
  assert.match(
    source,
    /No hay una sesión de administrador activa/i,
    'AdminAuthGate should explain the initial unauthenticated production state in Spanish',
  );
  assert.match(
    source,
    /La sesión de administrador ha expirado/i,
    'AdminAuthGate should also explain the expired-session production state in Spanish',
  );
  assert.match(
    source,
    /Iniciar sesión/,
    'AdminAuthGate should provide a visible "Iniciar sesión" call to action',
  );
  assert.match(
    source,
    /open\(['"]login['"]\)/,
    'AdminAuthGate should open the Netlify Identity login dialog when the admin clicks the login CTA',
  );
  assert.match(
    source,
    /useEffect/,
    'AdminAuthGate should auto-open the login dialog once when production loads without an active admin session',
  );
  assert.match(
    source,
    /useRef|autoOpen|hasAutoOpened|loginPromptOpened/i,
    'AdminAuthGate should guard the production auto-open flow so the login dialog opens only once per page load',
  );
  const overlayIndex = source.search(/className="fixed inset-0/);
  const loopbackEarlyReturnMatch = source.match(
    /if\s*\(\s*allowTokenless\s*\)\s*(?:\{\s*return\s+null;?\s*\}|return\s+null;?)/,
  );
  assert.ok(
    loopbackEarlyReturnMatch,
    'AdminAuthGate should use the loopback helper result to return null before rendering any production auth overlay markup',
  );
  if (loopbackEarlyReturnMatch && overlayIndex >= 0) {
    assert.ok(
      source.indexOf(loopbackEarlyReturnMatch[0]) < overlayIndex,
      'AdminAuthGate should short-circuit loopback hosts before the fixed overlay markup is declared',
    );
  }
  assert.match(
    source,
    /if\s*\(\s*store\.isAuthenticated\s*\)\s*return\s+null|store\.isAuthenticated\s*\?\s*null\s*:/,
    'AdminAuthGate should disappear entirely once the admin becomes authenticated',
  );
  assert.match(
    source,
    /La sesión de administrador ha expirado[\s\S]{0,320}(?:cambios[\s\S]{0,160}pestaña|pestaña[\s\S]{0,160}cambios)/i,
    'AdminAuthGate expired-session copy should explicitly say the current tab still keeps unsaved changes',
  );
  assert.match(source, /bg-ink/, 'AdminAuthGate should use the website ink background');
  assert.match(source, /text-paper/, 'AdminAuthGate should use the website paper foreground');
  assert.match(source, /text-amaranth/, 'AdminAuthGate should use the website amaranth accent');
  assert.match(source, /font-heading/, 'AdminAuthGate should use the website heading typography');
  assert.doesNotMatch(
    source,
    /rounded-(?:full|2xl)|bg-white|bg-charcoal|text-charcoal/,
    'AdminAuthGate should keep the website flat three-color studio styling instead of a rounded generic modal',
  );
});

test('AdminAuthGate receives its local bypass as a prop computed by AdminLayout from Astro.url.hostname, and the production build renders the auth wall before hydration instead of only after an effect', async () => {
  const [gateSource, layoutSource] = await Promise.all([
    readOptionalSource('src/components/admin/AdminAuthGate.tsx'),
    readSource('src/layouts/AdminLayout.astro'),
  ]);

  assert.ok(gateSource, 'src/components/admin/AdminAuthGate.tsx should exist');
  if (!gateSource) return;

  assert.match(
    layoutSource,
    /import\s*\{\s*shouldAllowTokenlessAdminInit\s*\}\s*from\s*['"]\.\.\/lib\/adminInit\.js['"];/,
    'AdminLayout should import shouldAllowTokenlessAdminInit so it can compute the bypass itself instead of leaving the decision to a client-side effect',
  );
  assert.match(
    layoutSource,
    /const\s+allowTokenless\s*=\s*shouldAllowTokenlessAdminInit\(\s*Astro\.url\.hostname\s*\)/,
    'AdminLayout should derive allowTokenless from Astro.url.hostname while server rendering',
  );
  assert.match(
    layoutSource,
    /<AdminAuthGate\s+client:load\s+allowTokenless=\{allowTokenless\}\s*\/>/,
    'AdminLayout should pass the computed allowTokenless prop into AdminAuthGate',
  );

  assert.match(
    gateSource,
    /interface\s+Props\s*\{\s*allowTokenless:\s*boolean;\s*\}/,
    'AdminAuthGate should type its allowTokenless prop',
  );
  assert.match(
    gateSource,
    /export default function AdminAuthGate\(\{\s*allowTokenless\s*\}:\s*Props\)/,
    'AdminAuthGate should destructure the typed allowTokenless prop instead of computing its own host state',
  );
  assert.doesNotMatch(
    gateSource,
    /window\.location\.hostname/,
    'AdminAuthGate should no longer read window.location.hostname itself now that AdminLayout computes allowTokenless during SSR',
  );
  assert.doesNotMatch(
    gateSource,
    /useState<[^>]*\bnull\b[^>]*>|useState\(\s*null\s*\)/,
    'AdminAuthGate should not initialize its bypass/wall decision with a null useState that would flash empty before the SSR wall appears',
  );
  assert.match(
    gateSource,
    /if\s*\(\s*allowTokenless\s*\)\s*return\s+null;/,
    'AdminAuthGate should return null synchronously from the allowTokenless prop so its first server render and first client render always agree',
  );
});

test('CHECK_DIST: production build renders the AdminAuthGate auth wall heading and copy inside its server-rendered island before hydration', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify the built admin HTML auth wall.');
    return;
  }

  const adminHtml = await readSource('dist/admin/index.html');

  const islandTagMatch = adminHtml.match(/<astro-island[^>]*component-url="\/_astro\/AdminAuthGate\.[^"]*"[^>]*>/);
  assert.ok(islandTagMatch, 'built admin HTML should include the AdminAuthGate island');
  if (!islandTagMatch) return;

  assert.match(
    islandTagMatch[0],
    /props="[^"]*allowTokenless[^"]*"/,
    'the AdminAuthGate island should be seeded with the allowTokenless prop computed by AdminLayout',
  );

  const tagStart = adminHtml.indexOf(islandTagMatch[0]);
  const bodyStart = tagStart + islandTagMatch[0].length;
  const bodyEnd = adminHtml.indexOf('</astro-island>', bodyStart);
  assert.ok(bodyEnd !== -1, 'the AdminAuthGate island should have a matching close tag');
  const islandBody = adminHtml.slice(bodyStart, bodyEnd);

  assert.match(
    islandBody,
    /Acceso de administrador requerido/,
    'the production build should server-render the auth wall heading before hydration instead of an empty island',
  );
  assert.match(
    islandBody,
    /No hay una sesión de administrador activa/,
    'the production build should server-render the initial unauthenticated wall copy before hydration',
  );
});

test('AdminLayout wraps all admin editing content in an admin-editing-shell that is inert by default in production, and AdminAuthGate toggles it once real auth state is known', async () => {
  const [gateSource, layoutSource] = await Promise.all([
    readOptionalSource('src/components/admin/AdminAuthGate.tsx'),
    readSource('src/layouts/AdminLayout.astro'),
  ]);

  assert.ok(gateSource, 'src/components/admin/AdminAuthGate.tsx should exist');
  if (!gateSource) return;

  assert.match(
    layoutSource,
    /<div\s+id="admin-editing-shell"\s+inert=\{allowTokenless\s*\?\s*undefined\s*:\s*true\}>/,
    'AdminLayout should wrap the admin editing content in a known #admin-editing-shell container that is inert by default whenever the production bypass is not allowed',
  );

  const shellOpenIndex = layoutSource.indexOf('id="admin-editing-shell"');
  const adminInitIndex = layoutSource.indexOf('<AdminInit');
  const toolbarIndex = layoutSource.indexOf('<AdminToolbar');
  const headerIndex = layoutSource.indexOf('<Header');
  const mainIndex = layoutSource.indexOf('<main');
  const footerIndex = layoutSource.indexOf('<Footer');
  const gateIndex = layoutSource.indexOf('<AdminAuthGate');

  assert.ok(
    shellOpenIndex !== -1 &&
      shellOpenIndex < adminInitIndex &&
      adminInitIndex < toolbarIndex &&
      toolbarIndex < headerIndex &&
      headerIndex < mainIndex &&
      mainIndex < footerIndex &&
      footerIndex < gateIndex,
    'the admin-editing-shell should wrap AdminInit, the toolbar, header, main, and footer, with AdminAuthGate rendered as a sibling outside of it afterwards',
  );

  assert.match(
    gateSource,
    /getElementById\(\s*(?:ADMIN_SHELL_ID|['"]admin-editing-shell['"])\s*\)/,
    'AdminAuthGate should look up the admin-editing-shell element to toggle its inert state',
  );
  assert.match(
    gateSource,
    /\.inert\s*=\s*!store\.isAuthenticated/,
    'AdminAuthGate should keep the shell inert while unauthenticated and remove inert once a real session exists',
  );
  assert.match(
    gateSource,
    /return\s*\(\)\s*=>\s*\{\s*shell\.inert\s*=\s*false;/,
    'AdminAuthGate should restore the shell out of inert on cleanup so unmounting never leaves the admin shell permanently locked',
  );
});

test('CHECK_DIST: the built production admin shell is inert by default around every admin control', async (t) => {
  if (process.env.CHECK_DIST !== '1') {
    t.skip('Set CHECK_DIST=1 after npm run build to verify the built admin-editing-shell inert state.');
    return;
  }

  const adminHtml = await readSource('dist/admin/index.html');

  assert.match(
    adminHtml,
    /<div id="admin-editing-shell" inert>/,
    'the production build should server-render the admin-editing-shell as inert before any admin session exists',
  );

  const shellIndex = adminHtml.indexOf('id="admin-editing-shell"');
  const adminInitIslandIndex = adminHtml.search(/component-url="\/_astro\/AdminInit\./);
  const gateIslandIndex = adminHtml.search(/component-url="\/_astro\/AdminAuthGate\./);
  assert.ok(
    shellIndex !== -1 && shellIndex < adminInitIslandIndex,
    'the admin-editing-shell should wrap the AdminInit island',
  );
  assert.ok(
    adminInitIslandIndex !== -1 && gateIslandIndex !== -1 && adminInitIslandIndex < gateIslandIndex,
    'AdminAuthGate should be rendered after the admin-editing-shell content in the built HTML',
  );
});

test('AdminAuthGate traps Tab and Shift+Tab focus on its single login CTA while the background shell stays inert', async () => {
  const gateSource = await readOptionalSource('src/components/admin/AdminAuthGate.tsx');
  assert.ok(gateSource, 'src/components/admin/AdminAuthGate.tsx should exist');
  if (!gateSource) return;

  assert.match(
    gateSource,
    /ref=\{dialogRef\}/,
    'the dialog container should hold a ref so the focus trap can attach a keydown listener to it',
  );
  assert.match(
    gateSource,
    /ref=\{loginButtonRef\}/,
    'the single login CTA should hold a ref so the focus trap can refocus it',
  );
  assert.match(
    gateSource,
    /addEventListener\(\s*['"]keydown['"]\s*,\s*handleKeyDown\s*\)/,
    'AdminAuthGate should attach a keydown listener to the dialog to trap focus',
  );
  assert.match(
    gateSource,
    /event\.key\s*!==\s*['"]Tab['"]/,
    'the focus trap should react to Tab presses (Shift+Tab also reports "Tab" as the key) and ignore every other key',
  );
  assert.match(
    gateSource,
    /event\.preventDefault\(\)/,
    'the focus trap should prevent the browser default Tab navigation from escaping the one-control dialog',
  );
  assert.match(
    gateSource,
    /loginButtonRef\.current\?\.focus\(\)/,
    'the focus trap should keep focus on the single login CTA instead of letting it leave the dialog',
  );
  assert.match(
    gateSource,
    /removeEventListener\(\s*['"]keydown['"]\s*,\s*handleKeyDown\s*\)/,
    'the focus trap should clean up its keydown listener when the gate unmounts or stops blocking',
  );
  assert.match(
    gateSource,
    /admin-editing-shell/,
    'AdminAuthGate should still reference the admin-editing-shell so the background stays inert while this dialog traps focus',
  );
});

test('AdminAuthGate only marks its auto-open flag after a successful Netlify Identity open call, and bounds its widget-readiness retry with cleanup', async () => {
  const gateSource = await readOptionalSource('src/components/admin/AdminAuthGate.tsx');
  assert.ok(gateSource, 'src/components/admin/AdminAuthGate.tsx should exist');
  if (!gateSource) return;

  assert.match(
    gateSource,
    /createAdminAuthGateOpenController/,
    'AdminAuthGate should centralize manual and automatic login opens through shared retry bookkeeping instead of treating them as unrelated flows',
  );
  assert.match(
    gateSource,
    /function\s+openNetlifyLogin\(\)\s*:\s*boolean\s*\{/,
    'openNetlifyLogin should report success/failure instead of silently doing nothing when the widget is not ready',
  );
  assert.match(
    gateSource,
    /if\s*\(\s*typeof\s+identity\?\.open\s*!==\s*['"]function['"]\s*\)\s*return\s+false;/,
    'openNetlifyLogin should return false when the Netlify Identity widget has not defined open yet',
  );
  assert.match(
    gateSource,
    /identity\.open\(['"]login['"]\);\s*\n\s*return true;/,
    'openNetlifyLogin should return true only once it has actually invoked the widget open call',
  );
  assert.match(
    gateSource,
    /attemptAutoOpen\(\)/,
    'the auto-open effect should route through the shared controller so automatic retries observe manual-success bookkeeping',
  );
  assert.match(
    gateSource,
    /onClick=\{\s*handleManualLogin(?:Click)?\s*\}/,
    'the manual login CTA should use a shared handler so a successful click can cancel or neutralize any queued auto-open retry',
  );
  assert.match(
    gateSource,
    /attemptManualOpen\(\)/,
    'the shared manual handler should notify the controller when a real manual widget open succeeds',
  );
  assert.match(
    gateSource,
    /ADMIN_AUTH_GATE_OPEN_MAX_RETRIES/,
    'AdminAuthGate should bound its auto-open retry attempts so a widget that never loads cannot retry forever',
  );
  assert.match(
    gateSource,
    /scheduleRetry:\s*\(callback,\s*delay\)\s*=>\s*window\.setTimeout\(callback,\s*delay\)/,
    'AdminAuthGate should pass a bounded timeout scheduler into the shared controller while the widget script is still loading',
  );
  assert.match(
    gateSource,
    /clearRetry:\s*\(timeoutId\)\s*=>\s*window\.clearTimeout\(timeoutId\)/,
    'AdminAuthGate should pass timeout cleanup into the shared controller so manual success or unmount can cancel queued retries',
  );
  assert.match(
    gateSource,
    /dispose\(\)/,
    'AdminAuthGate should dispose the shared retry controller on cleanup so no stray timer can fire after unmount and cause a modal storm',
  );

  const adminInitModule = await import('../src/lib/adminInit.js');
  const { ADMIN_AUTH_GATE_OPEN_MAX_RETRIES, ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS } = adminInitModule;
  assert.equal(
    typeof ADMIN_AUTH_GATE_OPEN_MAX_RETRIES,
    'number',
    'ADMIN_AUTH_GATE_OPEN_MAX_RETRIES should be exported as a number',
  );
  assert.ok(
    ADMIN_AUTH_GATE_OPEN_MAX_RETRIES > 1,
    'the retry ceiling should allow more than a single attempt so a slow widget script still gets picked up',
  );
  assert.equal(
    typeof ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS,
    'number',
    'ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS should be exported as a number',
  );
  assert.ok(
    ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS > 0,
    'the retry delay should be a positive bounded interval, not an immediate busy loop',
  );
});

test('createAdminAuthGateOpenController cancels queued auto retries after a manual success and ignores stale retry callbacks', () => {
  const openSources = [];
  const scheduledRetries = [];
  const clearedRetries = [];

  const controller = createAdminAuthGateOpenController({
    tryOpen: (source) => {
      openSources.push(source);
      return source === 'manual';
    },
    scheduleRetry: (callback, delay) => {
      const token = { callback, delay };
      scheduledRetries.push(token);
      return token;
    },
    clearRetry: (token) => {
      clearedRetries.push(token);
    },
    retryDelayMs: ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS,
    maxRetries: 3,
  });

  assert.equal(controller.attemptAutoOpen(), false);
  assert.deepEqual(openSources, ['auto']);
  assert.equal(scheduledRetries.length, 1, 'a failed first auto-open should queue exactly one bounded retry');
  assert.equal(
    scheduledRetries[0].delay,
    ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS,
    'queued retries should keep using the configured bounded delay',
  );

  assert.equal(controller.attemptManualOpen(), true);
  assert.deepEqual(openSources, ['auto', 'manual']);
  assert.deepEqual(
    clearedRetries,
    [scheduledRetries[0]],
    'a successful manual open should clear the queued auto-open retry',
  );

  scheduledRetries[0].callback();
  assert.deepEqual(
    openSources,
    ['auto', 'manual'],
    'even if a stale retry callback runs after the manual success, it must observe the success flag and avoid reopening the widget',
  );
});

test('createAdminAuthGateOpenController only suppresses duplicate automatic opens, not future explicit manual clicks', () => {
  const openSources = [];

  const controller = createAdminAuthGateOpenController({
    tryOpen: (source) => {
      openSources.push(source);
      return true;
    },
    scheduleRetry: () => {
      throw new Error('manual/auto success should not queue retries');
    },
    clearRetry: () => {},
    retryDelayMs: ADMIN_AUTH_GATE_OPEN_RETRY_DELAY_MS,
    maxRetries: 3,
  });

  assert.equal(controller.attemptAutoOpen(), true);
  assert.equal(controller.attemptManualOpen(), true);
  assert.equal(controller.attemptManualOpen(), true);
  assert.deepEqual(
    openSources,
    ['auto', 'manual', 'manual'],
    'once the one-shot auto-open has succeeded, later deliberate manual clicks should still reopen the widget if the admin closes it and clicks again',
  );
});

test('AdminAuthGate hides its full-screen overlay while the Netlify Identity widget modal is open so the login dialog stays visible on top', async () => {
  const source = await readSource('src/components/admin/AdminAuthGate.tsx');

  assert.match(
    source,
    /identity\.on\(\s*['"]open['"]/,
    'AdminAuthGate should subscribe to the Netlify Identity widget open event so its own overlay can step aside while the login modal is visible',
  );
  assert.match(
    source,
    /identity\.on\(\s*['"]close['"]/,
    'AdminAuthGate should subscribe to the Netlify Identity widget close event so its overlay can return when the login modal is dismissed without signing in',
  );
  assert.match(
    source,
    /identity\.off\?\.\(\s*['"]open['"]/,
    'AdminAuthGate should clean up its widget open listener when it unmounts',
  );
  assert.match(
    source,
    /identity\.off\?\.\(\s*['"]close['"]/,
    'AdminAuthGate should clean up its widget close listener when it unmounts',
  );
  assert.match(
    source,
    /isWidgetOpen|widgetIsOpen|identityWidgetOpen/,
    'AdminAuthGate should track when the Netlify Identity widget modal is open so its own overlay can stay out of the way',
  );
  assert.match(
    source,
    /if\s*\(\s*(?:isWidgetOpen|widgetIsOpen|identityWidgetOpen)\s*\)\s*return\s+null/,
    'AdminAuthGate should return null while the Netlify Identity widget modal is open so the login dialog is not covered by the gate',
  );
});

test('AdminToolbar shows session state, login action, draft and publish descriptions, and disables publish while unauthenticated', async () => {
  const source = await readSource('src/components/admin/AdminToolbar.tsx');

  assert.match(source, /Sesión activa/, 'AdminToolbar should confirm when the admin session is active');
  assert.match(
    source,
    /Inicia sesión para publicar/,
    'AdminToolbar should warn production editors when there is no active admin session',
  );
  assert.match(source, /Iniciar sesión/, 'AdminToolbar should offer an explicit login button or action');
  assert.match(
    source,
    /Guardar borrador/,
    'AdminToolbar should keep a draft-specific action or description visible while auth may be missing',
  );
  assert.match(
    source,
    /Publicar cambios/,
    'AdminToolbar should keep a publish-specific action or description visible alongside auth status',
  );
  assert.match(
    source,
    /open\(['"]login['"]\)/,
    'AdminToolbar login actions should route directly to netlifyIdentity.open(\'login\')',
  );
  const publishOnClickIndex = source.indexOf('onClick={() => void store.publish()}');
  const publishOnClickIndexFallback = publishOnClickIndex === -1
    ? source.search(/onClick=\{\(\)\s*=>\s*void\s+store\.publish\(\)\}/)
    : publishOnClickIndex;
  assert.notEqual(
    publishOnClickIndexFallback,
    -1,
    'AdminToolbar should expose a publish button onClick that calls store.publish()',
  );
  if (publishOnClickIndexFallback === -1) return;

  const publishButtonStartIndex = source.lastIndexOf('<button', publishOnClickIndexFallback);
  assert.notEqual(
    publishButtonStartIndex,
    -1,
    'AdminToolbar publish button extraction should find the nearest opening <button before the publish onClick marker',
  );
  if (publishButtonStartIndex === -1) return;

  const publishButtonEndIndex = source.indexOf('</button>', publishOnClickIndexFallback);
  assert.notEqual(
    publishButtonEndIndex,
    -1,
    'AdminToolbar publish button extraction should find the closing </button> after the publish onClick marker',
  );
  if (publishButtonEndIndex === -1) return;

  const publishButtonBlock = source.slice(publishButtonStartIndex, publishButtonEndIndex + '</button>'.length);

  const disabledExpressionMatch = publishButtonBlock.match(/disabled=\{([\s\S]*?)\}/);
  assert.ok(
    disabledExpressionMatch,
    'AdminToolbar publish button should declare its own disabled expression',
  );
  if (!disabledExpressionMatch) return;

  const disabledExpression = disabledExpressionMatch[1];
  assert.match(
    disabledExpression,
    /!store\.isAuthenticated/,
    'AdminToolbar should disable publishing whenever store.isAuthenticated is false',
  );
  assert.match(
    disabledExpression,
    /!store\.isDirty/,
    'AdminToolbar publish button should keep the existing dirty-state gate inside its disabled expression',
  );
  assert.match(
    disabledExpression,
    /store\.isPublishing/,
    'AdminToolbar publish button should keep the in-flight publishing gate inside its disabled expression',
  );
  assert.match(
    disabledExpression,
    /store\.orbitValidationErrors\.length\s*>\s*0/,
    'AdminToolbar publish button should keep its validation gate inside the same disabled expression',
  );

  const classNameMatch = publishButtonBlock.match(/className=\{`([\s\S]*?)`\}/);
  assert.ok(
    classNameMatch,
    'AdminToolbar publish button should declare its own className expression',
  );
  if (!classNameMatch) return;

  const classNameExpression = classNameMatch[1];
  assert.match(
    classNameExpression,
    /store\.isAuthenticated\s*&&\s*store\.isDirty\s*&&\s*store\.orbitValidationErrors\.length\s*===\s*0/,
    'AdminToolbar publish button should only render the active green state when authenticated, dirty, and validation-clean',
  );
});

for (const entrypoint of [
  {
    name: 'createBlogPost',
    call: (store) => store.createBlogPost({
      slug: 'mi-post',
      date: '2026-08-26',
      translations: makeBlogTranslationsFixture(),
    }),
  },
  {
    name: 'updateBlogPost',
    call: (store) => store.updateBlogPost({
      slug: 'mi-post',
      date: '2026-08-26',
      currentImage: '/images/blog/mi-post.webp',
      translations: makeBlogTranslationsFixture(),
    }),
  },
  {
    name: 'deleteBlogPost',
    call: (store) => store.deleteBlogPost({
      slug: 'mi-post',
      image: '/images/blog/mi-post.webp',
    }),
  },
]) {
  test(`${entrypoint.name} clears auth state and notifies subscribers immediately when Identity refresh fails, without discarding dirty edits`, async () => {
    const { store, previewBeforeAuthChange } = await createDirtyStore();
    const fetchCalls = [];
    const authNotifications = [];
    const unsubscribe = store.subscribe(() => {
      authNotifications.push(store.getSnapshot().isAuthenticated);
    });

    const restoreWindow = mockWindow({
      localStorage: createLocalStorage(),
      netlifyIdentity: {
        currentUser: () => ({ id: 'admin-editor' }),
        refresh: async () => {
          throw new Error('expired');
        },
      },
    });
    const restoreFetch = mockFetch(async (input, init = {}) => {
      fetchCalls.push({ input: String(input), init });
      return new Response(JSON.stringify({ message: `${entrypoint.name} should stop before repository writes` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    try {
      await assert.rejects(
        () => entrypoint.call(store),
        /La sesión de administrador ha expirado/i,
        `${entrypoint.name} should surface the same expired-session Spanish message publish already uses`,
      );
    } finally {
      unsubscribe();
      restoreFetch();
      restoreWindow();
    }

    assert.equal(
      fetchCalls.length,
      0,
      `${entrypoint.name} should stop before any repository writes when Identity refresh fails`,
    );

    assert.ok(
      authNotifications.length > 0,
      `${entrypoint.name} should notify subscribers immediately when the refresh fails, not only on some later unrelated store change`,
    );
    assert.equal(
      authNotifications[authNotifications.length - 1],
      false,
      `the most recent subscriber notification after a failed refresh inside ${entrypoint.name} should reflect the cleared auth state`,
    );

    const snapshot = store.getSnapshot();
    assert.ok(
      'isAuthenticated' in snapshot,
      `${entrypoint.name} refresh failures need a snapshot auth flag so UI gates can react immediately`,
    );
    assert.equal(
      snapshot.isAuthenticated,
      false,
      `a refresh failure inside ${entrypoint.name} should flip the snapshot to unauthenticated immediately, without waiting for another unrelated emit`,
    );
    assert.equal(
      store.getText('nav.home'),
      'Portada pendiente',
      `a refresh failure inside ${entrypoint.name} should not discard dirty text edits`,
    );
    assert.equal(
      store.getImageSrc('heroMainPhoto'),
      previewBeforeAuthChange,
      `a refresh failure inside ${entrypoint.name} should preserve pending image previews so the current tab keeps unsaved work`,
    );
  });
}

test('publish keeps using the token captured right after Identity refresh for every repository request, even when the mutable token is cleared mid-operation', async () => {
  const { store } = await createDirtyStore('stale-publish-token');
  const fetchCalls = [];

  const restoreWindow = mockWindow({
    localStorage: createLocalStorage(),
    netlifyIdentity: {
      currentUser: () => ({ id: 'admin-editor' }),
      refresh: async () => 'fresh-publish-token',
    },
  });
  const restoreFetch = mockFetch(async (input, init = {}) => {
    const call = {
      method: init.method ?? 'GET',
      authorization: String(init.headers?.Authorization ?? ''),
    };
    fetchCalls.push(call);

    if (fetchCalls.length === 1) {
      // Simulate an external logout (or any other mutation of the mutable
      // this.token) arriving mid-operation, right after the very first
      // Git Gateway request already went out with the refreshed token.
      store.clearAuthToken();
    }

    if (call.method === 'PUT') {
      return new Response(JSON.stringify({ content: { sha: 'written-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  try {
    await store.publish();
  } finally {
    restoreFetch();
    restoreWindow();
  }

  assert.ok(
    fetchCalls.length >= 4,
    'publish should perform multiple Git Gateway requests across the pending image, text, and site data writes',
  );
  assert.ok(
    fetchCalls.every((call) => call.authorization === 'Bearer fresh-publish-token'),
    'every Git Gateway request inside one publish operation must reuse the token captured right after the Identity refresh, never an empty or later-mutated this.token',
  );

  const snapshot = store.getSnapshot();
  assert.equal(
    snapshot.publishSuccess,
    true,
    'publish should still complete successfully end-to-end once every repository write used the operation-captured token',
  );
  assert.equal(
    snapshot.isAuthenticated,
    false,
    'the snapshot should still reflect the real mutable auth state (cleared mid-flight) once the operation settles',
  );
});

test('createBlogPost keeps using the token captured right after Identity refresh for every repository request, even when the mutable token is cleared mid-operation', async () => {
  const fixtures = await loadAdminFixtures();
  const store = new AdminStore();
  store.init(fixtures.i18n, fixtures.site, 'es', 'stale-create-token');

  const fetchCalls = [];
  const restoreWindow = mockWindow({
    localStorage: createLocalStorage(),
    netlifyIdentity: {
      currentUser: () => ({ id: 'admin-editor' }),
      refresh: async () => 'fresh-create-token',
    },
  });
  const restoreFetch = mockFetch(async (input, init = {}) => {
    const call = {
      method: init.method ?? 'GET',
      authorization: String(init.headers?.Authorization ?? ''),
    };
    fetchCalls.push(call);

    if (fetchCalls.length === 1) {
      // Simulate an external logout arriving after the first of the six
      // locale preflight reads that createBlogPost performs.
      store.clearAuthToken();
    }

    if (call.method === 'GET') {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ content: { sha: 'new-sha' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  let translationKey;
  try {
    translationKey = await store.createBlogPost({
      slug: 'mi-post',
      date: '2026-08-26',
      translations: makeBlogTranslationsFixture(),
    });
  } finally {
    restoreFetch();
    restoreWindow();
  }

  assert.equal(translationKey, 'mi-post', 'createBlogPost should still resolve successfully once every write used the operation-captured token');
  assert.ok(
    fetchCalls.length >= 12,
    'createBlogPost should read all six locale files and then write all six locale Markdown files',
  );
  assert.ok(
    fetchCalls.every((call) => call.authorization === 'Bearer fresh-create-token'),
    'every Git Gateway request inside one createBlogPost operation must reuse the token captured right after the Identity refresh, never an empty or later-mutated this.token',
  );
});
