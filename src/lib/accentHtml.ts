const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Escapes `text` and wraps the first occurrence of `accent` in the italic accent face. */
export function accentHtml(text: string, accent?: string): string | undefined {
  const index = accent ? text.indexOf(accent) : -1;
  if (!accent || index < 0) return undefined;

  return `${escapeHtml(text.slice(0, index))}<em class="accent-word">${escapeHtml(accent)}</em>${escapeHtml(text.slice(index + accent.length))}`;
}
