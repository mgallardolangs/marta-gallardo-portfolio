// Routes local raster images through Netlify Image CDN so large uploads are resized and
// re-compressed (and served as WebP/AVIF via content negotiation) at request time, without
// touching the original file. SVGs, data URLs, remote URLs and empty values pass through
// untouched: the CDN endpoint only exists on Netlify, and vector/preview/remote sources
// must not be rewritten. The original stays reachable at its /images/... path so the CDN
// can fetch it (rewriting /images/* directly would infinite-loop).

const LOCAL_RASTER = /^\/[^?#]+\.(?:png|jpe?g|webp)$/i;

export function netlifyImage(
  src: string | null | undefined,
  options: { width?: number; quality?: number } = {},
): string {
  const value = (src ?? '').trim();
  if (!value || !LOCAL_RASTER.test(value)) return value;

  const params = [`url=${encodeURIComponent(value)}`];
  if (options.width) params.push(`w=${options.width}`);
  params.push(`q=${options.quality ?? 75}`);
  return `/.netlify/images?${params.join('&')}`;
}
