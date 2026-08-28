// Converts a pasted video link, share URL, or embed snippet into an iframe-embeddable
// URL. Known hosts (YouTube, Vimeo, Instagram) are normalized to their player/embed URL
// so a plain share link "just works"; any other http(s) URL is allowed through as-is so
// embeds from any provider (TikTok, Facebook, a self-hosted player, …) work too. Returns
// null only for empty, malformed, or non-http(s) input. The scheme guard is the one hard
// rule: it keeps javascript:/data: URLs out of the iframe. The host list is intentionally
// open because this value is set only by the authenticated admin.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;
const VIMEO_HASH = /^[A-Za-z0-9]+$/;

export function toEmbedUrl(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  // Accept a pasted "<iframe ... src="...">" or an Instagram "<blockquote ...>" embed by
  // pulling the real URL out of the snippet first.
  const iframeSrc = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
  const instagramPermalink =
    raw.match(/data-instgrm-permalink=["']([^"'?]+)/i)?.[1] ??
    (/<blockquote/i.test(raw) ? raw.match(/href=["'](https?:\/\/[^"'?]+)/i)?.[1] : undefined);
  const candidate = iframeSrc ?? instagramPermalink ?? raw;

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
    if (YOUTUBE_ID.test(id)) return `https://www.youtube.com/embed/${id}`;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v') ?? '';
      if (YOUTUBE_ID.test(id)) return `https://www.youtube.com/embed/${id}`;
    }
    const match = url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  } else if (host === 'vimeo.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[0] ?? '';
    if (VIMEO_ID.test(id)) {
      const hash = parts[1] && VIMEO_HASH.test(parts[1]) ? parts[1] : null;
      return hash
        ? `https://player.vimeo.com/video/${id}?h=${hash}`
        : `https://player.vimeo.com/video/${id}`;
    }
  } else if (host === 'player.vimeo.com') {
    const match = url.pathname.match(/^\/video\/(\d+)/);
    if (match) {
      const hash = url.searchParams.get('h');
      return hash && VIMEO_HASH.test(hash)
        ? `https://player.vimeo.com/video/${match[1]}?h=${hash}`
        : `https://player.vimeo.com/video/${match[1]}`;
    }
  } else if (host === 'instagram.com' || host === 'instagr.am') {
    const match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (match) return `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
  }

  // Any other http(s) URL (or a known host we couldn't normalize) is embedded as-is.
  return url.toString();
}
