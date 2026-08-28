// Converts a pasted YouTube/Vimeo link (or a full <iframe ...> embed snippet) into a
// safe player embed URL, or null when the input isn't a recognized video host. The
// result is always rebuilt from parsed IDs, so raw pasted text never reaches the iframe
// src — only youtube.com/vimeo.com players are ever embedded. This is the trust boundary
// for user-supplied embed URLs, so anything unrecognized is rejected instead of passed
// through.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;
const VIMEO_HASH = /^[A-Za-z0-9]+$/;

export function toEmbedUrl(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  // Marta may paste a full "<iframe ... src="...">" snippet; pull the src out of it.
  const iframeSrc = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
  const candidate = iframeSrc ?? raw;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    return YOUTUBE_ID.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v') ?? '';
      return YOUTUBE_ID.test(id) ? `https://www.youtube.com/embed/${id}` : null;
    }
    const match = url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }

  if (host === 'vimeo.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[0] ?? '';
    if (!VIMEO_ID.test(id)) return null;
    const hash = parts[1] && VIMEO_HASH.test(parts[1]) ? parts[1] : null;
    return hash
      ? `https://player.vimeo.com/video/${id}?h=${hash}`
      : `https://player.vimeo.com/video/${id}`;
  }

  if (host === 'player.vimeo.com') {
    const match = url.pathname.match(/^\/video\/(\d+)/);
    if (!match) return null;
    const hash = url.searchParams.get('h');
    return hash && VIMEO_HASH.test(hash)
      ? `https://player.vimeo.com/video/${match[1]}?h=${hash}`
      : `https://player.vimeo.com/video/${match[1]}`;
  }

  return null;
}
