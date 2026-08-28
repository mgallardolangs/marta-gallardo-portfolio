import rawSiteData from '../data/site.json' with { type: 'json' };

export const siteLocales = ['es', 'en', 'fr', 'de', 'it', 'ca'] as const;
export type Locale = (typeof siteLocales)[number];

export type LocalizedText = Record<Locale, string>;

export type OrbitMedia = {
  id: string;
  type: 'image' | 'video';
  src: string;
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
};

export function localize(value: LocalizedText | string | null | undefined, lang: Locale): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return value[lang] ?? value.es ?? '';
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
