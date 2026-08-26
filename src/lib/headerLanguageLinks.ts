type HeaderLanguageLink<Locale extends string> = {
  lang: Locale;
  href: string;
};

type ResolveHeaderLanguageLinksOptions<Locale extends string> = {
  path: string;
  visibleLangs: readonly Locale[];
  getLocalizedPath: (path: string, lang: Locale) => string;
  alternateLinks?: Partial<Record<Locale, string>>;
};

function normalizeMappedPath(path: string): string {
  const trimmedPath = path.trim();
  return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
}

export function resolveHeaderLanguageLinks({
  path,
  visibleLangs,
  getLocalizedPath,
  alternateLinks,
}: ResolveHeaderLanguageLinksOptions<string>): HeaderLanguageLink<string>[] {
  if (alternateLinks) {
    return visibleLangs.reduce<HeaderLanguageLink<string>[]>((links, locale) => {
      const mappedPath = alternateLinks[locale];

      if (typeof mappedPath === 'string' && mappedPath.trim()) {
        links.push({ lang: locale, href: normalizeMappedPath(mappedPath) });
      }

      return links;
    }, []);
  }

  const normalizedPath = path.trim() ? path : '/';
  const localizedPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;

  return visibleLangs.map((locale) => ({
    lang: locale,
    href: getLocalizedPath(localizedPath, locale),
  }));
}
