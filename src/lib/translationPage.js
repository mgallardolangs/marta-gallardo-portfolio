export const TOOL_LOGO_KEYS = {
  'microsoft-office': 'microsoftOffice',
  'google-workspace': 'googleWorkspace',
  notion: 'notion',
  'ai-tools': 'aiTools',
  wordpress: 'wordpress',
  'google-search-console': 'googleSearchConsole',
  'google-business-profile': 'googleMyBusiness',
};

export function getTranslationToolTiles(lang, siteData) {
  const tools = siteData?.arsenal?.tools ?? [];
  const logos = siteData?.toolLogos ?? {};

  return tools.map((tool) => ({
    id: tool.id,
    label: tool?.label?.[lang] ?? tool?.label?.es ?? '',
    logoKey: TOOL_LOGO_KEYS[tool.id] ?? '',
    logoSrc: logos[TOOL_LOGO_KEYS[tool.id]] ?? tool.logo ?? '',
  }));
}
