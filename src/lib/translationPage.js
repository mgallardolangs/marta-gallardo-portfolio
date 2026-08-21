export const TOOL_LOGO_KEYS = {
  'microsoft-office': 'microsoftOffice',
  'google-workspace': 'googleWorkspace',
  notion: 'notion',
  'ai-tools': 'aiTools',
  wordpress: 'wordpress',
  'google-search-console': 'googleSearchConsole',
  'google-business-profile': 'googleMyBusiness',
};

function localize(value, lang) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value[lang] ?? value.es ?? '';
}

export function getTranslationToolTiles(lang, siteData, translatedLabels = []) {
  const tools = siteData?.arsenal?.tools ?? [];
  const logos = siteData?.toolLogos ?? {};

  return tools.map((tool, index) => {
    const logoKey = tool.id;
    const legacyLogoKey = TOOL_LOGO_KEYS[tool.id] ?? '';
    const hasTranslatedLabel = Array.isArray(translatedLabels) && index in translatedLabels;
    const translatedLabel = hasTranslatedLabel ? translatedLabels[index] : undefined;

    return {
      id: tool.id,
      label: hasTranslatedLabel ? `${translatedLabel ?? ''}` : tool?.label?.[lang] ?? tool?.label?.es ?? '',
      logoKey,
      logoSrc: logos[tool.id] ?? logos[legacyLogoKey] ?? tool.logo ?? '',
    };
  });
}

export function getTranslationArsenalColumns(lang, siteData) {
  const languages = (siteData?.arsenal?.languages ?? []).map((language) => ({
    id: language.id,
    code: language.code,
    label: localize(language.label, lang),
    level: localize(language.level, lang),
  }));

  const tools = getTranslationToolTiles(lang, siteData);

  const skills = (siteData?.arsenal?.skills ?? []).map((skill) => ({
    id: skill.id,
    label: localize(skill.label, lang),
  }));

  return {
    languages,
    tools,
    skills,
  };
}
