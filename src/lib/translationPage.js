export const TOOL_LOGO_KEYS = {
  'microsoft-office': 'microsoftOffice',
  'google-workspace': 'googleWorkspace',
  notion: 'notion',
  'ai-tools': 'aiTools',
  wordpress: 'wordpress',
  'google-search-console': 'googleSearchConsole',
  'google-business-profile': 'googleMyBusiness',
};

export function getTranslationToolTiles(lang, siteData, translatedLabels = []) {
  const tools = siteData?.arsenal?.tools ?? [];
  const logos = siteData?.toolLogos ?? {};

  return tools.map((tool, index) => {
    const logoKey = TOOL_LOGO_KEYS[tool.id] ?? '';
    const hasTranslatedLabel = Array.isArray(translatedLabels) && index in translatedLabels;
    const translatedLabel = hasTranslatedLabel ? translatedLabels[index] : undefined;

    return {
      id: tool.id,
      label: hasTranslatedLabel ? `${translatedLabel ?? ''}` : tool?.label?.[lang] ?? tool?.label?.es ?? '',
      logoKey,
      logoSrc: logos[logoKey] ?? tool.logo ?? '',
    };
  });
}
