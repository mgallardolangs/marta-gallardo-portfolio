import rawSiteData from '../data/site.json' with { type: 'json' };

export const siteLocales = ['es', 'en', 'fr', 'de', 'it', 'ca'] as const;
export type Locale = (typeof siteLocales)[number];
export const seoPageKeys = ['home', 'translationSeo', 'ugc', 'contact'] as const;
export type SeoPageKey = (typeof seoPageKeys)[number];

export type LocalizedText = Record<Locale, string>;
export type SeoPageValue = {
  title?: Partial<LocalizedText>;
  description?: Partial<LocalizedText>;
};
export type ResolvedSeoPageValue = {
  title: string;
  description: string;
};

export type OrbitMedia = {
  id: string;
  type: 'image' | 'video';
  src: string;
  embedUrl?: string | null;
  poster?: string | null;
  href?: string | null;
  alt: LocalizedText;
  label: LocalizedText;
};

export type UgcCategory = 'travel' | 'languages' | 'art';

export type UgcPortfolioItem = {
  id: string;
  category: UgcCategory;
  type: 'image' | 'video';
  src: string;
  embedUrl?: string | null;
  poster: string | null;
  label: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  format: LocalizedText;
  alt: LocalizedText;
};

export type LanguageItem = {
  id: string;
  code: string;
  label: LocalizedText;
  level: LocalizedText;
};

export type ToolItem = {
  id: string;
  logo: string;
  label: LocalizedText;
};

export type SkillGroup = 'translation' | 'seo';

export type SkillItem = {
  id: string;
  group: SkillGroup;
  label: LocalizedText;
};

export type SiteData = {
  heroMainPhoto: string;
  galleryCutouts: Record<string, string>;
  videoPlaceholderOrEmbedUrl: string;
  ugcHeaderImage: string;
  instagramScreenshot: string;
  socialLinks: {
    linkedin: string;
    instagram: string;
  };
  publicLanguagePicker: Locale[];
  nicheBackgrounds: Record<string, string>;
  ugcVideos: Record<string, string[]>;
  ugcPhotos: Record<string, string[]>;
  nicheIcons: Record<string, string>;
  aboutPhotos: string[];
  brandVideo: string;
  brandVideoEmbedUrl: string;
  toolLogos: Record<string, string>;
  videoStickers: Record<string, string>;
  orbitMedia: OrbitMedia[];
  ugcPortfolio: UgcPortfolioItem[];
  arsenal: {
    languages: LanguageItem[];
    tools: ToolItem[];
    skills: SkillItem[];
  };
  person: {
    name: string;
    location: string;
    socialProfiles: {
      linkedin: string;
      instagram: string;
    };
  };
  seo?: Partial<Record<SeoPageKey, SeoPageValue>>;
};

export function localize(value: LocalizedText | string | null | undefined, lang: Locale): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return value[lang] ?? value.es ?? '';
}

function normalizeSeoText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function resolveSeoText(
  value: Partial<LocalizedText> | null | undefined,
  lang: Locale,
  fallback: string,
): string {
  const requested = normalizeSeoText(value?.[lang]);
  if (requested) return requested;

  const spanish = normalizeSeoText(value?.es);
  if (spanish) return spanish;

  return normalizeSeoText(fallback);
}

export function getPageSeo(
  site: Partial<SiteData> | null | undefined,
  page: SeoPageKey,
  lang: Locale,
  fallback: ResolvedSeoPageValue,
): ResolvedSeoPageValue {
  const pageSeo = site?.seo?.[page];

  return {
    title: resolveSeoText(pageSeo?.title, lang, fallback.title),
    description: resolveSeoText(pageSeo?.description, lang, fallback.description),
  };
}

export const publicLanguagePickerFallback: Locale[] = ['es', 'en', 'fr'];

export function getPublicLanguagePicker(site: Partial<SiteData> | null | undefined): Locale[] {
  if (!Array.isArray(site?.publicLanguagePicker)) {
    return [...publicLanguagePickerFallback];
  }

  const hasUnsupportedLocale = site.publicLanguagePicker.some((locale) => !siteLocales.includes(locale as Locale));
  const selectedLocales = new Set(
    site.publicLanguagePicker.filter((locale): locale is Locale => siteLocales.includes(locale as Locale)),
  );

  if (hasUnsupportedLocale || !selectedLocales.has('es') || selectedLocales.size === 0) {
    return [...publicLanguagePickerFallback];
  }

  return siteLocales.filter((locale) => selectedLocales.has(locale));
}

export const siteData = rawSiteData as SiteData;
