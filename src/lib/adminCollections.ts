import { applySpanishFallbackToCodeManagedLocales } from './orbitMedia.ts';
import type {
  LanguageItem,
  LocalizedText,
  SiteData,
  SkillItem,
  ToolItem,
} from './siteData.ts';

export const EDITABLE_COLLECTION_LOCALES = ['es', 'en', 'fr'] as const;
export type EditableCollectionLocale = (typeof EDITABLE_COLLECTION_LOCALES)[number];
export type EditableCollectionKind = 'languages' | 'tools' | 'skills';

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
  return missing.length > 0 ? `${label} requires ES/EN/FR values.` : null;
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

export function buildToolLogoUploadPath(id: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  return `/images/tools/${normalizeIdSegment(id) || 'tool-item'}.${extension}`;
}

export function getEditableCollectionValidationErrors(siteData: SiteData) {
  const errors: string[] = [];
  const arsenal = siteData.arsenal ?? { languages: [], tools: [], skills: [] };

  (arsenal.languages ?? []).forEach((item) => {
    if (validateEditableLocaleSeed(`Language ${item.id} label`, item.label as EditableLocaleSeed)) {
      errors.push(`Language ${item.id} requires ES/EN/FR labels.`);
    }
    if (validateEditableLocaleSeed(`Language ${item.id} level`, item.level as EditableLocaleSeed)) {
      errors.push(`Language ${item.id} requires ES/EN/FR levels.`);
    }
  });

  (arsenal.tools ?? []).forEach((item) => {
    if (validateEditableLocaleSeed(`Tool ${item.id} label`, item.label as EditableLocaleSeed)) {
      errors.push(`Tool ${item.id} requires ES/EN/FR labels.`);
    }
    if (!item.logo.trim()) {
      errors.push(`Tool ${item.id} requires a logo.`);
    }
  });

  (arsenal.skills ?? []).forEach((item) => {
    if (validateEditableLocaleSeed(`Skill ${item.id} label`, item.label as EditableLocaleSeed)) {
      errors.push(`Skill ${item.id} requires ES/EN/FR labels.`);
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
    const labelError = validateEditableLocaleSeed('Language label', languageInput.label);
    if (labelError) throw new Error(labelError);
    const levelError = validateEditableLocaleSeed('Language level', languageInput.level);
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
    const labelError = validateEditableLocaleSeed('Tool label', toolInput.label);
    if (labelError) throw new Error(labelError);

    const id = buildEditableCollectionId(kind, toolInput.label.es, existingIds);
    return {
      id,
      logo: toolInput.logo?.trim() ?? '',
      label: createCollectionLocalizedText(toolInput.label),
    };
  }

  const skillInput = input as AddSkillCollectionItemInput;
  const labelError = validateEditableLocaleSeed('Skill label', skillInput.label);
  if (labelError) throw new Error(labelError);

  return {
    id: buildEditableCollectionId(kind, skillInput.label.es, existingIds),
    label: createCollectionLocalizedText(skillInput.label),
  };
}
