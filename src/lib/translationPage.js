export const TOOL_LOGO_KEYS = {
  'microsoft-office': 'microsoftOffice',
  'google-workspace': 'googleWorkspace',
  notion: 'notion',
  'ai-tools': 'aiTools',
  wordpress: 'wordpress',
  'google-search-console': 'googleSearchConsole',
  'google-business-profile': 'googleMyBusiness',
};

const LEGACY_TOOL_GROUPS = {
  'microsoft-office': 'translation',
  'google-workspace': 'translation',
  notion: 'translation',
  'ai-tools': 'translation',
  'tool-claude': 'translation',
  wordpress: 'seo',
  'google-search-console': 'seo',
  'google-business-profile': 'seo',
};

const ARSENAL_GROUP_ORDER = ['translation', 'seo'];

export function getArsenalToolGroup(tool) {
  if (tool?.group === 'translation' || tool?.group === 'seo') return tool.group;
  return LEGACY_TOOL_GROUPS[tool?.id] ?? null;
}

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

function localizeSkill(skill, lang) {
  return {
    id: skill.id,
    group: skill.group,
    label: localize(skill.label, lang),
  };
}

export function getTranslationArsenalColumns(lang, siteData, filter) {
  const languages = (siteData?.arsenal?.languages ?? []).map((language) => ({
    id: language.id,
    code: language.code,
    label: localize(language.label, lang),
    level: localize(language.level, lang),
  }));

  const tools = getTranslationToolTiles(lang, siteData);

  const skills = (siteData?.arsenal?.skills ?? []).map((skill) => localizeSkill(skill, lang));
  const groupedSkills = {
    translation: skills.filter((skill) => skill.group === 'translation'),
    seo: skills.filter((skill) => skill.group === 'seo'),
  };

  if (filter === 'translation' || filter === 'seo') {
    const filteredToolIds = new Set(
      (siteData?.arsenal?.tools ?? [])
        .filter((tool) => getArsenalToolGroup(tool) === filter)
        .map((tool) => tool.id),
    );
    return {
      languages,
      tools: tools.filter((tool) => filteredToolIds.has(tool.id)),
      skills: groupedSkills[filter],
      skillGroups: { [filter]: groupedSkills[filter] },
    };
  }

  return {
    languages,
    tools,
    skills,
    skillGroups: groupedSkills,
  };
}
