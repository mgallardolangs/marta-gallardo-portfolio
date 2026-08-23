import type { LanguageItem, LocalizedText, Locale, SkillItem, ToolItem } from './siteData.ts';

type PreviewCollectionKind = 'languages' | 'tools' | 'skills';

type PreviewStoreLike = {
  currentLang: Locale;
  getText: (key: string) => string;
  getImageSrc: (key: string) => string;
  getEditableCollection: (kind: PreviewCollectionKind) => Array<LanguageItem | ToolItem | SkillItem>;
};

function localize(value: LocalizedText | string | null | undefined, lang: Locale): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return value[lang] ?? value.es ?? '';
}

export function getAdminTranslationArsenalPreviewModel(store: PreviewStoreLike) {
  const languages = store.getEditableCollection('languages') as LanguageItem[];
  const tools = store.getEditableCollection('tools') as ToolItem[];
  const skills = store.getEditableCollection('skills') as SkillItem[];

  return {
    titles: {
      languages: store.getText('translationPage.arsenal.languagesTitle'),
      tools: store.getText('translationPage.arsenal.toolsTitle'),
      skills: store.getText('translationPage.arsenal.skillsTitle'),
      translation: store.getText('translationPage.skillGroups.translation'),
      seo: store.getText('translationPage.skillGroups.seo'),
    },
    languages: languages.map((language) => ({
      id: language.id,
      label: localize(language.label, store.currentLang),
      level: localize(language.level, store.currentLang),
    })),
    tools: tools.map((tool) => ({
      id: tool.id,
      label: localize(tool.label, store.currentLang),
      logoSrc: store.getImageSrc(`toolLogos.${tool.id}`) || tool.logo,
    })),
    skillGroups: {
      translation: skills
        .filter((skill) => skill.group === 'translation')
        .map((skill) => ({
          id: skill.id,
          label: localize(skill.label, store.currentLang),
        })),
      seo: skills
        .filter((skill) => skill.group === 'seo')
        .map((skill) => ({
          id: skill.id,
          label: localize(skill.label, store.currentLang),
        })),
    },
  };
}
