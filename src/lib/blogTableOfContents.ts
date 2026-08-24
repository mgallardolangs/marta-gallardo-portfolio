export function decodeBlogHash(hash: string, validIds: readonly string[]): string | null {
  const rawFragment = String(hash ?? '').replace(/^#/, '');
  if (!rawFragment) return null;

  let decodedFragment = rawFragment;
  try {
    decodedFragment = decodeURIComponent(rawFragment);
  } catch {
    decodedFragment = rawFragment;
  }

  return validIds.includes(decodedFragment) ? decodedFragment : null;
}
