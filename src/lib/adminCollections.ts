import { applySpanishFallbackToCodeManagedLocales } from './orbitMedia.ts';
import type {
  LanguageItem,
  LocalizedText,
  SkillGroup,
  SiteData,
  SkillItem,
  ToolItem,
} from './siteData.ts';

export const EDITABLE_COLLECTION_LOCALES = ['es', 'en', 'fr'] as const;
export const EDITABLE_SKILL_GROUPS = ['translation', 'seo'] as const;
export const TOOL_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'] as const;
export const TOOL_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export type EditableCollectionLocale = (typeof EDITABLE_COLLECTION_LOCALES)[number];
export type EditableCollectionKind = 'languages' | 'tools' | 'skills';
export type EditableSkillGroup = (typeof EDITABLE_SKILL_GROUPS)[number];

type EditableLocaleSeed = Record<EditableCollectionLocale, string>;

export type AddLanguageCollectionItemInput = {
  label: EditableLocaleSeed;
  level: EditableLocaleSeed;
};

export type AddToolCollectionItemInput = {
  label: EditableLocaleSeed;
  logo?: string;
};

export type AddSkillCollectionItemInput = {
  group: SkillGroup;
  label: EditableLocaleSeed;
};

export type AddEditableCollectionItemInput =
  | AddLanguageCollectionItemInput
  | AddToolCollectionItemInput
  | AddSkillCollectionItemInput;

type EditableCollectionItemMap = {
  languages: LanguageItem;
  tools: ToolItem;
  skills: SkillItem;
};

function normalizeIdSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isSkillGroup(value: string): value is SkillGroup {
  return EDITABLE_SKILL_GROUPS.includes(value as EditableSkillGroup);
}

function isToolLogoType(type: string) {
  return TOOL_LOGO_TYPES.includes(type as (typeof TOOL_LOGO_TYPES)[number]);
}

function getToolLogoExtension(file: File) {
  const mappedExtension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  }[file.type];

  if (mappedExtension) return mappedExtension;

  const fallbackExtension = file.name.split('.').pop()?.toLowerCase();
  if (fallbackExtension === 'jpeg') return 'jpg';
  if (fallbackExtension && ['jpg', 'png', 'webp', 'gif', 'svg'].includes(fallbackExtension)) {
    return fallbackExtension;
  }
  return 'png';
}

export function createCollectionLocalizedText(seed: EditableLocaleSeed): LocalizedText {
  return applySpanishFallbackToCodeManagedLocales({
    es: seed.es.trim(),
    en: seed.en.trim(),
    fr: seed.fr.trim(),
    de: '',
    it: '',
    ca: '',
  });
}

export function updateCollectionLocalizedText(
  current: LocalizedText,
  lang: EditableCollectionLocale,
  value: string,
): LocalizedText {
  const next = { ...current };
  const previousSpanish = next.es;
  next[lang] = value;

  if (lang !== 'es') {
    return next;
  }

  return {
    ...next,
    de: next.de === previousSpanish || !next.de.trim() ? value : next.de,
    it: next.it === previousSpanish || !next.it.trim() ? value : next.it,
    ca: next.ca === previousSpanish || !next.ca.trim() ? value : next.ca,
  };
}

export function validateEditableLocaleSeed(label: string, seed: Partial<EditableLocaleSeed>) {
  const missing = EDITABLE_COLLECTION_LOCALES.filter((locale) => !seed[locale]?.trim());
  return missing.length > 0 ? `${label} necesita valores en ES/EN/FR.` : null;
}

export function buildEditableCollectionId(
  kind: EditableCollectionKind,
  seed: string,
  existingIds: string[],
) {
  const prefix = kind === 'languages' ? 'language' : kind === 'tools' ? 'tool' : 'skill';
  const baseId = `${prefix}-${normalizeIdSegment(seed) || prefix}`;
  if (!existingIds.includes(baseId)) return baseId;

  let suffix = 2;
  while (existingIds.includes(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export function buildLanguageCodeFromId(id: string) {
  return id.replace(/^language-/, '') || id;
}

export function validateToolLogoUpload(file: File) {
  if (!isToolLogoType(file.type)) {
    return 'Los logos de herramientas deben usar formato JPG, PNG, WebP, GIF o SVG.';
  }

  if (file.size > TOOL_LOGO_MAX_BYTES) {
    return 'Los logos de herramientas deben pesar 2MB o menos.';
  }

  return null;
}

export function buildToolLogoUploadPath(id: string, file: File) {
  return `/images/tools/${normalizeIdSegment(id) || 'tool-item'}.${getToolLogoExtension(file)}`;
}

/**
 * Gate used by the arsenal editor's drag-and-drop drop handler: skills may only
 * reorder within their own translation/seo group, so a drop across groups is
 * rejected (returns null) instead of silently reshuffling groups.
 */
export function resolveSkillReorderIndices(
  skills: SkillItem[],
  fromIndex: number,
  targetIndex: number,
): { fromIndex: number; targetIndex: number } | null {
  const source = skills[fromIndex];
  const target = skills[targetIndex];
  if (!source || !target || source.group !== target.group) return null;
  return { fromIndex, targetIndex };
}

export function getEditableCollectionValidationErrors(siteData: SiteData) {
  const errors: string[] = [];
  const arsenal = siteData.arsenal ?? { languages: [], tools: [], skills: [] };

  (arsenal.languages ?? []).forEach((item) => {
    if (validateEditableLocaleSeed(`El idioma ${item.id} necesita etiquetas`, item.label as EditableLocaleSeed)) {
      errors.push(`El idioma ${item.id} necesita etiquetas en ES/EN/FR.`);
    }
    if (validateEditableLocaleSeed(`El idioma ${item.id} necesita niveles`, item.level as EditableLocaleSeed)) {
      errors.push(`El idioma ${item.id} necesita niveles en ES/EN/FR.`);
    }
  });

  (arsenal.tools ?? []).forEach((item) => {
    if (validateEditableLocaleSeed(`La herramienta ${item.id} necesita etiquetas`, item.label as EditableLocaleSeed)) {
      errors.push(`La herramienta ${item.id} necesita etiquetas en ES/EN/FR.`);
    }
    if (!item.logo.trim()) {
      errors.push(`La herramienta ${item.id} necesita un logo.`);
    }
  });

  (arsenal.skills ?? []).forEach((item) => {
    if (validateEditableLocaleSeed(`La habilidad ${item.id} necesita etiquetas`, item.label as EditableLocaleSeed)) {
      errors.push(`La habilidad ${item.id} necesita etiquetas en ES/EN/FR.`);
    }
    if (!isSkillGroup(item.group)) {
      errors.push(`La habilidad ${item.id} necesita un grupo de traducción o seo.`);
    }
  });

  return errors;
}

export function createEditableCollectionItem(
  kind: EditableCollectionKind,
  input: AddEditableCollectionItemInput,
  existingIds: string[],
): EditableCollectionItemMap[EditableCollectionKind] {
  if (kind === 'languages') {
    const languageInput = input as AddLanguageCollectionItemInput;
    const labelError = validateEditableLocaleSeed('La etiqueta del idioma', languageInput.label);
    if (labelError) throw new Error(labelError);
    const levelError = validateEditableLocaleSeed('El nivel del idioma', languageInput.level);
    if (levelError) throw new Error(levelError);

    const id = buildEditableCollectionId(kind, languageInput.label.es, existingIds);
    return {
      id,
      code: buildLanguageCodeFromId(id),
      label: createCollectionLocalizedText(languageInput.label),
      level: createCollectionLocalizedText(languageInput.level),
    };
  }

  if (kind === 'tools') {
    const toolInput = input as AddToolCollectionItemInput;
    const labelError = validateEditableLocaleSeed('La etiqueta de la herramienta', toolInput.label);
    if (labelError) throw new Error(labelError);

    const id = buildEditableCollectionId(kind, toolInput.label.es, existingIds);
    return {
      id,
      logo: toolInput.logo?.trim() ?? '',
      label: createCollectionLocalizedText(toolInput.label),
    };
  }

  const skillInput = input as AddSkillCollectionItemInput;
  const labelError = validateEditableLocaleSeed('La etiqueta de la habilidad', skillInput.label);
  if (labelError) throw new Error(labelError);
  if (!isSkillGroup(skillInput.group)) {
    throw new Error('El grupo de la habilidad es obligatorio y debe ser translation o seo.');
  }

  return {
    id: buildEditableCollectionId(kind, skillInput.label.es, existingIds),
    group: skillInput.group,
    label: createCollectionLocalizedText(skillInput.label),
  };
}
