// Redirects any path ending in "/" (except the root) to its canonical no-slash URL.
// Netlify redirect rules treat "/fr/" and "/fr" as the same path, so a plain
// [[redirects]] rule would loop; an edge function sees the exact request path.
//
// Edge functions run before the [[redirects]] rules in netlify.toml. A slashed
// legacy URL such as "/en/ugc/" would otherwise take two hops (strip the slash,
// then the Netlify rule), so the legacy map is applied here and the visitor
// lands on the final URL with a single 301.
import { legacyRedirects } from '../../src/lib/legacyRedirects.js';

export default async (request) => {
  const url = new URL(request.url);

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    const canonicalPath = url.pathname.replace(/\/+$/, '') || '/';
    url.pathname = legacyRedirects[canonicalPath] ?? canonicalPath;
    return Response.redirect(url.toString(), 301);
  }
};

export const config = {
  path: '/*',
  excludedPath: ['/_astro/*', '/images/*', '/favicon.svg', '/robots.txt', '/sitemap-*.xml'],
};
