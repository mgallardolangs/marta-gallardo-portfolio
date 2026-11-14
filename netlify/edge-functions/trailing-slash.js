// Redirects any path ending in "/" (except the root) to its canonical no-slash URL.
// Netlify redirect rules treat "/fr/" and "/fr" as the same path, so a plain
// [[redirects]] rule would loop; an edge function sees the exact request path.
export default async (request) => {
  const url = new URL(request.url);

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return Response.redirect(url.toString(), 301);
  }
};

export const config = {
  path: '/*',
  excludedPath: ['/_astro/*', '/images/*', '/favicon.svg', '/robots.txt', '/sitemap-*.xml'],
};
