import rawSiteData from '../data/site.json';

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

export type SkillItem = {
  id: string;
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
  nicheBackgrounds: Record<string, string>;
  ugcVideos: Record<string, string[]>;
  ugcPhotos: Record<string, string[]>;
  nicheIcons: Record<string, string>;
  aboutPhotos: string[];
  brandVideo: string;
  toolLogos: Record<string, string>;
  videoStickers: Record<string, string>;
  orbitMedia: OrbitMedia[];
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

export const siteData = rawSiteData as SiteData;
