import {
  createOrbitMediaDraft,
  applySpanishFallbackToCodeManagedLocales,
  validateOrbitMediaItem,
  type OrbitAdminLang,
} from '../../lib/orbitMedia.ts';
import {
  applySpanishFallbackToUgcLocales,
  validateUgcMediaUpload,
  validateUgcPortfolioItem,
} from '../../lib/ugcPortfolio.ts';
import {
  buildToolLogoUploadPath,
  createEditableCollectionItem,
  EDITABLE_SKILL_GROUPS,
  getEditableCollectionValidationErrors,
  validateToolLogoUpload,
  type AddEditableCollectionItemInput,
  type EditableCollectionKind,
  type EditableCollectionLocale,
  updateCollectionLocalizedText,
} from '../../lib/adminCollections.ts';
import type {
  LanguageItem,
  LocalizedText,
  OrbitMedia,
  SkillGroup,
  SiteData,
  SkillItem,
  ToolItem,
  UgcCategory,
  UgcPortfolioItem,
} from '../../lib/siteData.ts';
import { getPublicLanguagePicker } from '../../lib/siteData.ts';

type Listener = () => void;
export const SUPPORTED_LANGS = ['es', 'en', 'fr', 'de', 'it', 'ca'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const ADMIN_BLOG_LANGS = ['es', 'en', 'fr'] as const;
export type AdminBlogLang = (typeof ADMIN_BLOG_LANGS)[number];

export function isAdminBlogLang(lang: string): lang is AdminBlogLang {
  return ADMIN_BLOG_LANGS.includes(lang as AdminBlogLang);
}

type I18nTree = Record<string, unknown>;
type ImagesTree = Record<string, unknown>;

type PendingImage = {
  path: string;
  sitePath: string;
  previousSitePath: string | null;
  previewSrc: string;
  base64Content: string;
};

type DraftPendingUpload = {
  key: string;
};

type DraftPayload = {
  i18n: Record<string, I18nTree>;
  images: ImagesTree;
  currentLang: SupportedLang;
  pendingUploads: DraftPendingUpload[];
};

type LegacyDraftPayload = DraftPayload & {
  pendingImages?: Record<string, PendingImage>;
};

type AdminSnapshot = {
  initialized: boolean;
  isAuthenticated: boolean;
  currentLang: SupportedLang;
  isDirty: boolean;
  pendingCount: number;
  isPublishing: boolean;
  publishSuccess: boolean;
  publishError: string;
  draftTone: '' | 'success' | 'warning' | 'error';
  draftMessage: string;
  orbitValidationErrors: string[];
  getText: (key: string) => string;
  getEducationStudies: () => TranslationExperienceStudy[];
  getExperienceCards: () => TranslationExperienceCard[];
  getImageSrc: (key: string) => string;
  getOrbitMedia: () => OrbitMedia[];
  getUgcPortfolio: () => UgcPortfolioItem[];
  getOrbitItemValidationErrors: (itemId: string) => string[];
  getUgcPortfolioItemValidationErrors: (itemId: string) => string[];
  getEditableCollection: (kind: EditableCollectionKind) => Array<LanguageItem | ToolItem | SkillItem>;
};

export type TranslationExperienceSeed = {
  es: string;
  en: string;
  fr: string;
};

export type TranslationExperienceStudy = string;

export type TranslationExperienceCard = {
  highlight: string;
  title: string;
  text: string;
};

export type TranslationExperienceCardInput = {
  highlight: TranslationExperienceSeed;
  title: TranslationExperienceSeed;
  text: TranslationExperienceSeed;
};

const DRAFT_STORAGE_KEY = 'marta-inline-editor-draft';
const EXPERIENCE_EDITOR_LANGS = ['es', 'en', 'fr'] as const;
const EXPERIENCE_FALLBACK_LANGS = ['de', 'it', 'ca'] as const;
const TRANSLATION_EXPERIENCE_FALLBACK_SYNC_KEY_PATTERN = /^(?:translationPage\.education\.studies\.\d+|translationPage\.experience\.cards\.\d+\.(?:highlight|title|text))$/;

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDraftValue(base: unknown, draft: unknown): unknown {
  if (Array.isArray(draft)) {
    return cloneValue(draft);
  }

  if (!isObjectRecord(draft)) {
    return draft;
  }

  const merged = isObjectRecord(base) ? cloneValue(base) : {};
  Object.entries(draft).forEach(([key, value]) => {
    merged[key] = mergeDraftValue(merged[key], value);
  });
  return merged;
}

function pathSegments(path: string): Array<string | number> {
  return path
    .split('.')
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

function deepGet(source: unknown, path: string): unknown {
  return pathSegments(path).reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) return undefined;
    if (typeof segment === 'number' && Array.isArray(current)) {
      return current[segment];
    }
    if (typeof current === 'object') {
      return (current as Record<string, unknown>)[String(segment)];
    }
    return undefined;
  }, source);
}

function deepSet(source: unknown, path: string, value: unknown): void {
  const segments = pathSegments(path);
  if (segments.length === 0 || typeof source !== 'object' || source === null) return;

  let current: unknown = source;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];

    if (typeof current !== 'object' || current === null) return;

    if (typeof segment === 'number' && Array.isArray(current)) {
      if (current[segment] === undefined) {
        current[segment] = typeof nextSegment === 'number' ? [] : {};
      }
      current = current[segment];
      continue;
    }

    const record = current as Record<string, unknown>;
    const key = String(segment);
    if (record[key] === undefined) {
      record[key] = typeof nextSegment === 'number' ? [] : {};
    }
    current = record[key];
  }

  const last = segments[segments.length - 1];
  if (typeof current !== 'object' || current === null) return;

  if (typeof last === 'number' && Array.isArray(current)) {
    current[last] = value;
    return;
  }

  (current as Record<string, unknown>)[String(last)] = value;
}

function countLeafDiffs(current: unknown, original: unknown): number {
  if (typeof current !== 'object' || current === null || typeof original !== 'object' || original === null) {
    return current === original ? 0 : 1;
  }

  if (Array.isArray(current) || Array.isArray(original)) {
    const currentList = Array.isArray(current) ? current : [];
    const originalList = Array.isArray(original) ? original : [];
    const size = Math.max(currentList.length, originalList.length);
    let total = 0;
    for (let index = 0; index < size; index += 1) {
      total += countLeafDiffs(currentList[index], originalList[index]);
    }
    return total;
  }

  const keys = new Set([
    ...Object.keys(current as Record<string, unknown>),
    ...Object.keys(original as Record<string, unknown>),
  ]);

  let total = 0;
  keys.forEach((key) => {
    total += countLeafDiffs(
      (current as Record<string, unknown>)[key],
      (original as Record<string, unknown>)[key],
    );
  });
  return total;
}

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function getSkillInsertIndex(skills: SkillItem[], group: SkillGroup): number {
  if (group === 'translation') {
    const firstSeoIndex = skills.findIndex((skill) => skill.group === 'seo');
    return firstSeoIndex === -1 ? skills.length : firstSeoIndex;
  }

  for (let index = skills.length - 1; index >= 0; index -= 1) {
    if (skills[index]?.group === 'seo') {
      return index + 1;
    }
  }

  return skills.length;
}

const BLOG_FEATURED_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const BLOG_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;
const BLOG_FEATURED_IMAGE_MIME_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpeg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

async function fileToDataUrl(file: File): Promise<string> {
  const mimeType = file.type || 'application/octet-stream';
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function validateBlogFeaturedImage(featuredImage: File): void {
  if (!BLOG_FEATURED_IMAGE_MIME_TYPES.has(featuredImage.type)) {
    throw new Error('La imagen destacada debe ser un archivo JPEG, PNG, WebP o GIF.');
  }

  if (featuredImage.size > BLOG_FEATURED_IMAGE_MAX_BYTES) {
    throw new Error(`La imagen destacada debe pesar 2 MB o menos (máximo ${BLOG_FEATURED_IMAGE_MAX_BYTES} bytes).`);
  }
}

function getBlogFeaturedImageExtension(featuredImage: File): string {
  const filenameExtension = featuredImage.name.split('.').pop()?.toLowerCase() ?? '';
  if ((BLOG_IMAGE_EXTENSIONS as readonly string[]).includes(filenameExtension)) {
    return filenameExtension;
  }

  return BLOG_FEATURED_IMAGE_MIME_TYPES.get(featuredImage.type) ?? 'webp';
}

function getBlogFeaturedImagePaths(slug: string, featuredImage: File) {
  const safeSlug = slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'blog-post';
  const extension = getBlogFeaturedImageExtension(featuredImage);

  return {
    repositoryPath: `public/images/blog/${safeSlug}.${extension}`,
    publicPath: `/images/blog/${safeSlug}.${extension}`,
  };
}

export type BlogLocaleTranslation = {
  title: string;
  description: string;
  tags: string[];
  body: string;
};

export type BlogTranslationsInput = Partial<Record<SupportedLang, Partial<BlogLocaleTranslation>>>;

export type BlogPostCreateInput = {
  slug: string;
  date: string;
  translations: BlogTranslationsInput;
  featuredImage?: File | null;
};

export type BlogPostUpdateInput = BlogPostCreateInput & {
  currentImage?: string;
  removeImage?: boolean;
};

/**
 * The authoritative outcome of updateBlogPost: translationKey stays fixed for the
 * logical post, while image reflects the actually-persisted shared image path after
 * a replace, a removal (undefined), or an unchanged currentImage — callers should
 * adopt this value as their new source of truth instead of trusting stale props.
 */
export type BlogPostUpdateResult = {
  translationKey: string;
  image?: string;
};

export type BlogPostDeleteInput = {
  slug: string;
  translationKey?: string;
  image?: string;
};

export type BlogPostDeleteStatus = 'post-deleted' | 'locale-delete-failed' | 'image-cleanup-failed';

export type BlogPostDeleteResult = {
  status: BlogPostDeleteStatus;
  message: string;
  remainingPaths: string[];
};

const BLOG_LOCALE_FIELD_MESSAGES: Record<'title' | 'description' | 'tags' | 'body', (locale: string) => string> = {
  title: (locale) => `Completa el título de la traducción ${locale}.`,
  description: (locale) => `Completa la descripción de la traducción ${locale}.`,
  tags: (locale) => `Completa las etiquetas de la traducción ${locale}.`,
  body: (locale) => `Completa el cuerpo de la traducción ${locale}.`,
};

const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates the slug against the canonical `[a-z0-9]+(-[a-z0-9]+)*` shape before any
 * repository path is built from it, rejecting slashes, `..` traversal segments, spaces,
 * uppercase letters, accents, or any other character outside that pattern.
 */
function validateBlogSlug(slug: string): string {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) throw new Error('El slug es obligatorio.');
  if (!BLOG_SLUG_PATTERN.test(trimmedSlug)) {
    throw new Error(
      'El slug solo puede contener minúsculas, números y guiones simples (sin espacios, mayúsculas, acentos ni barras).',
    );
  }
  return trimmedSlug;
}

function validateBlogDate(date: string): void {
  if (!date || !date.trim()) throw new Error('La fecha es obligatoria.');
}

/**
 * Ensures every currently-visible locale (per publicLanguagePicker) has a complete
 * translation before any repository read/write, naming the missing field and the
 * uppercase locale code in the thrown Spanish error.
 */
function validateVisibleBlogTranslations(translations: BlogTranslationsInput, visibleLocales: SupportedLang[]): void {
  for (const locale of visibleLocales) {
    const localeLabel = locale.toUpperCase();
    const translation = translations[locale];

    if (!translation?.title?.trim()) throw new Error(BLOG_LOCALE_FIELD_MESSAGES.title(localeLabel));
    if (!translation.description?.trim()) throw new Error(BLOG_LOCALE_FIELD_MESSAGES.description(localeLabel));
    if (!Array.isArray(translation.tags) || translation.tags.length === 0) {
      throw new Error(BLOG_LOCALE_FIELD_MESSAGES.tags(localeLabel));
    }
    if (!translation.body?.trim()) throw new Error(BLOG_LOCALE_FIELD_MESSAGES.body(localeLabel));
  }
}

function getBlogLocaleMarkdownPaths(slug: string): Record<SupportedLang, string> {
  return Object.fromEntries(
    SUPPORTED_LANGS.map((locale) => [locale, `src/content/blog/${slug}/${locale}.md`]),
  ) as Record<SupportedLang, string>;
}

const BLOG_OWNED_IMAGE_PATTERN = new RegExp(`^/images/blog/([a-z0-9]+(?:-[a-z0-9]+)*)\\.(${BLOG_IMAGE_EXTENSIONS.join('|')})$`);

/**
 * Returns the repository path for a public blog image only when it is exactly
 * `/images/blog/<slug>.<allowed-extension>` for the given slug — never a shared
 * `/images/site/...` asset, another slug's blog image, or a path containing a query,
 * fragment, or traversal segment. Anything else returns null so callers never delete
 * an asset they don't own.
 */
function getOwnedBlogImageRepositoryPath(slug: string, publicPath: string | null | undefined): string | null {
  if (!publicPath) return null;
  if (publicPath.includes('..') || publicPath.includes('?') || publicPath.includes('#')) return null;

  const match = BLOG_OWNED_IMAGE_PATTERN.exec(publicPath);
  if (!match) return null;

  const [, fileSlug, extension] = match;
  if (fileSlug !== slug) return null;

  return `public/images/blog/${slug}.${extension}`;
}

function buildBlogLocaleMarkdown(post: {
  slug: string;
  translationKey: string;
  title: string;
  description: string;
  date: string;
  image?: string;
  tags: string[];
  lang: SupportedLang;
  body: string;
}): string {
  const quoted = (value: string) => JSON.stringify(value);
  const tags = `[${post.tags.map((tag) => JSON.stringify(tag)).join(', ')}]`;
  const imageLine = post.image ? `image: ${quoted(post.image)}\n` : '';
  return `---\nslug: ${quoted(post.slug)}\ntranslationKey: ${quoted(post.translationKey)}\ntitle: ${quoted(post.title)}\ndescription: ${quoted(post.description)}\ndate: ${quoted(post.date)}\n${imageLine}tags: ${tags}\nlang: ${quoted(post.lang)}\n---\n\n${post.body.trim()}\n`;
}

/**
 * Reads back a locale Markdown file written by buildBlogLocaleMarkdown so hidden
 * locales can preserve their own localized title/description/tags/body untouched
 * (and every locale can agree on the same translationKey) during an edit.
 */
function parseBlogLocaleMarkdown(
  markdown: string,
): BlogLocaleTranslation & { slug: string; translationKey: string; date: string; image?: string } {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const frontmatterBlock = frontmatterMatch?.[1] ?? '';
  const body = (frontmatterMatch?.[2] ?? markdown).replace(/^\n+/, '').trimEnd();

  const getStringField = (field: string): string => {
    const match = frontmatterBlock.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
    if (!match) return '';
    try {
      return JSON.parse(match[1].trim());
    } catch {
      return match[1].trim();
    }
  };

  const tagsMatch = frontmatterBlock.match(/^tags:\s*(\[.*\])\s*$/m);
  let tags: string[] = [];
  if (tagsMatch) {
    try {
      const parsed = JSON.parse(tagsMatch[1]);
      if (Array.isArray(parsed)) tags = parsed.map(String);
    } catch {
      tags = [];
    }
  }

  return {
    slug: getStringField('slug'),
    translationKey: getStringField('translationKey'),
    date: getStringField('date'),
    image: getStringField('image') || undefined,
    title: getStringField('title'),
    description: getStringField('description'),
    tags,
    body,
  };
}

/**
 * Resolves the translation a locale should receive for a create/upsert write: the
 * submitted translation for any currently-visible locale, or the fresh Spanish
 * translation as a fallback for every hidden locale — shared by the write loop and
 * the pre-write duplicate/idempotency comparison so both always agree.
 */
function resolveBlogLocaleTranslation(
  locale: SupportedLang,
  visibleLocales: SupportedLang[],
  translations: BlogTranslationsInput,
  esTranslation: BlogLocaleTranslation,
): BlogLocaleTranslation {
  return (visibleLocales.includes(locale) ? translations[locale] : esTranslation) as BlogLocaleTranslation;
}

function normalizeBlogTextForComparison(value: string): string {
  return value.trim();
}

function normalizeBlogTagsForComparison(tags: string[]): string {
  return JSON.stringify(tags.map((tag) => tag.trim()));
}

function blogLocaleMatchesSharedIdentity(
  parsed: ReturnType<typeof parseBlogLocaleMarkdown>,
  shared: { slug: string; translationKey: string },
): boolean {
  return parsed.slug === shared.slug && parsed.translationKey === shared.translationKey;
}

/**
 * True only when a parsed, already-existing locale Markdown file carries exactly the
 * shared slug/translationKey/date/image and the (trimmed) title/description/tags/body
 * that createBlogPost would write for that locale. Used to tell a safe, idempotent
 * create retry (every locale already matches) apart from a genuine duplicate-slug
 * collision (some locale differs, or its slug/translationKey doesn't match the target)
 * before any repository write happens.
 */
function blogLocaleMatchesExpected(
  parsed: ReturnType<typeof parseBlogLocaleMarkdown>,
  expected: BlogLocaleTranslation,
  shared: { slug: string; translationKey: string; date: string; image?: string },
): boolean {
  return (
    blogLocaleMatchesSharedIdentity(parsed, shared) &&
    parsed.date === shared.date &&
    (parsed.image ?? undefined) === (shared.image ?? undefined) &&
    normalizeBlogTextForComparison(parsed.title) === normalizeBlogTextForComparison(expected.title) &&
    normalizeBlogTextForComparison(parsed.description) === normalizeBlogTextForComparison(expected.description) &&
    normalizeBlogTagsForComparison(parsed.tags) === normalizeBlogTagsForComparison(expected.tags) &&
    normalizeBlogTextForComparison(parsed.body) === normalizeBlogTextForComparison(expected.body)
  );
}

function getBlogDuplicateSlugMessage(slug: string): string {
  return `Ya existe una entrada de blog con el slug "${slug}" pero con contenido diferente. Elige otro slug o edita la entrada existente en lugar de crear una nueva.`;
}

function base64ToUtf8(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function getOrbitPendingKey(itemId: string, field: 'src' | 'poster') {
  return `orbit.${itemId}.${field}`;
}

function getUgcPendingKey(itemId: string, field: 'src' | 'poster') {
  return `ugc.${itemId}.${field}`;
}

function buildUgcUploadPath(itemId: string, field: 'src' | 'poster', file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || (field === 'poster' ? 'jpg' : 'webp');
  const safeId = itemId.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'ugc-item';
  return `/images/ugc/${safeId}${field === 'poster' ? '-poster' : ''}.${extension}`;
}

function normalizeUploadPath(uploadPath: string) {
  if (uploadPath.startsWith('public/')) {
    return {
      path: uploadPath,
      sitePath: `/${uploadPath.replace(/^public\//, '')}`,
    };
  }

  if (uploadPath.startsWith('/')) {
    return {
      path: `public${uploadPath}`,
      sitePath: uploadPath,
    };
  }

  return {
    path: uploadPath,
    sitePath: uploadPath.startsWith('/') ? uploadPath : `/${uploadPath}`,
  };
}

function getPendingUploadCountLabel(count: number) {
  return count === 1 ? '1 archivo pendiente' : `${count} archivos pendientes`;
}

function getDraftRestoreMessage(count: number) {
  return count === 1
    ? 'Borrador restaurado. 1 archivo pendiente no se guardó localmente; deberás volver a seleccionarlo antes de publicar.'
    : `Borrador restaurado. Los ${count} archivos pendientes no se guardaron localmente; deberás volver a seleccionarlos antes de publicar.`;
}

function normalizeDraftPublicLanguagePicker(
  draftPicker: unknown,
  originalImages: ImagesTree,
): SupportedLang[] {
  if (Array.isArray(draftPicker)) {
    const selectedLocales = new Set(
      draftPicker.filter((locale): locale is SupportedLang => SUPPORTED_LANGS.includes(locale as SupportedLang)),
    );

    if (selectedLocales.size > 0) {
      selectedLocales.add('es');
      return SUPPORTED_LANGS.filter((locale) => selectedLocales.has(locale));
    }
  }

  return getPublicLanguagePicker(originalImages as Partial<SiteData>) as SupportedLang[];
}

export class AdminStore {
  private listeners = new Set<Listener>();
  private initialized = false;
  private token = '';
  private currentLang: SupportedLang = 'es';
  private i18n: Record<string, I18nTree> = {};
  private originalI18n: Record<string, I18nTree> = {};
  private images: ImagesTree = {};
  private originalImages: ImagesTree = {};
  private pendingImages: Record<string, PendingImage> = {};
  private isPublishingState = false;
  private publishSuccessState = false;
  private publishErrorState = '';
  private draftToneState: '' | 'success' | 'warning' | 'error' = '';
  private draftMessageState = '';
  private snapshot: AdminSnapshot = {
    initialized: false,
    isAuthenticated: false,
    currentLang: 'es',
    isDirty: false,
    pendingCount: 0,
    isPublishing: false,
    publishSuccess: false,
    publishError: '',
    draftTone: '',
    draftMessage: '',
    orbitValidationErrors: [],
    getText: (key: string) => this.getText(key),
    getEducationStudies: () => this.getEducationStudies(),
    getExperienceCards: () => this.getExperienceCards(),
    getImageSrc: (key: string) => this.getImageSrc(key),
    getOrbitMedia: () => this.getOrbitMedia(),
    getUgcPortfolio: () => this.getUgcPortfolio(),
    getOrbitItemValidationErrors: (itemId: string) => this.getOrbitItemValidationErrors(itemId),
    getUgcPortfolioItemValidationErrors: (itemId: string) => this.getUgcPortfolioItemValidationErrors(itemId),
    getEditableCollection: (kind: EditableCollectionKind) => this.getEditableCollection(kind),
  };

  isInitialized(): boolean {
    return this.initialized;
  }

  init(i18n: Record<string, I18nTree>, images: ImagesTree, lang: string, token: string): void {
    if (!this.initialized) {
      this.i18n = cloneValue(i18n);
      this.originalI18n = cloneValue(i18n);
      this.images = cloneValue(images);
      this.originalImages = cloneValue(images);
      this.currentLang = (lang || this.currentLang) as SupportedLang;
      this.initialized = true;
    }

    if (token) {
      this.token = token;
      this.publishErrorState = '';
    }
    this.emit();
  }

  setAuthToken(token: string): void {
    if (!token || token === this.token) return;
    this.token = token;
    this.publishErrorState = '';
    this.emit();
  }

  clearAuthToken(): void {
    this.token = '';
    this.publishErrorState = '';
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): AdminSnapshot {
    return this.snapshot;
  }

  getText(key: string): string {
    const source = this.i18n[this.currentLang] ?? this.i18n.es ?? {};
    const value = deepGet(source, key);
    return typeof value === 'string' ? value : '';
  }

  getEducationStudies(): TranslationExperienceStudy[] {
    const studies = deepGet(this.i18n[this.currentLang] ?? this.i18n.es ?? {}, 'translationPage.education.studies');
    if (!Array.isArray(studies)) return [];

    return cloneValue(
      studies.filter((study): study is TranslationExperienceStudy => typeof study === 'string'),
    );
  }

  getExperienceCards(): TranslationExperienceCard[] {
    const cards = deepGet(this.i18n[this.currentLang] ?? this.i18n.es ?? {}, 'translationPage.experience.cards');
    if (!Array.isArray(cards)) return [];

    return cloneValue(
      cards.flatMap((card) => {
        if (!isObjectRecord(card)) return [];

        const highlight = typeof card.highlight === 'string' ? card.highlight : '';
        const title = typeof card.title === 'string' ? card.title : '';
        const text = typeof card.text === 'string' ? card.text : '';

        return [{ highlight, title, text }];
      }),
    );
  }

  getOrbitMedia(): OrbitMedia[] {
    const orbitMedia = this.getPersistedOrbitMedia();
    return orbitMedia.map((item) => {
      const srcPreview = this.pendingImages[getOrbitPendingKey(item.id, 'src')]?.previewSrc;
      const posterPreview = this.pendingImages[getOrbitPendingKey(item.id, 'poster')]?.previewSrc;

      return {
        ...item,
        src: srcPreview ?? item.src,
        poster: posterPreview ?? item.poster ?? null,
      };
    });
  }

  getUgcPortfolio(): UgcPortfolioItem[] {
    const ugcPortfolio = this.getPersistedUgcPortfolio();

    return ugcPortfolio.map((item) => {
      const srcPreview = this.pendingImages[getUgcPendingKey(item.id, 'src')]?.previewSrc;
      const posterPreview = this.pendingImages[getUgcPendingKey(item.id, 'poster')]?.previewSrc;

      return {
        ...item,
        src: srcPreview ?? item.src,
        poster: posterPreview ?? item.poster,
      };
    });
  }

  getEditableCollection(kind: EditableCollectionKind): Array<LanguageItem | ToolItem | SkillItem> {
    const collection = this.getPersistedEditableCollection(kind);

    if (kind !== 'tools') {
      return collection;
    }

    return (collection as ToolItem[]).map((tool) => ({
      ...tool,
      logo: this.getImageSrc(`toolLogos.${tool.id}`) || tool.logo,
    }));
  }

  getPublicLanguagePicker(): SupportedLang[] {
    return getPublicLanguagePicker(this.images as Partial<SiteData>) as SupportedLang[];
  }

  private getPersistedOrbitMedia(): OrbitMedia[] {
    const orbitMedia = deepGet(this.images, 'orbitMedia');
    if (!Array.isArray(orbitMedia)) return [];

    return cloneValue(orbitMedia as OrbitMedia[]);
  }

  private getValidatedTranslationSeed(seed: TranslationExperienceSeed, errorMessage: string): TranslationExperienceSeed {
    const trimmedSeed = {
      es: typeof seed.es === 'string' ? seed.es.trim() : '',
      en: typeof seed.en === 'string' ? seed.en.trim() : '',
      fr: typeof seed.fr === 'string' ? seed.fr.trim() : '',
    };

    if (EXPERIENCE_EDITOR_LANGS.some((locale) => !trimmedSeed[locale])) {
      throw new Error(errorMessage);
    }

    return trimmedSeed;
  }

  private getMutableEducationStudies(lang: SupportedLang): string[] {
    const studies = deepGet(this.i18n, `${lang}.translationPage.education.studies`);
    if (Array.isArray(studies)) return studies as string[];

    const nextStudies: string[] = [];
    deepSet(this.i18n, `${lang}.translationPage.education.studies`, nextStudies);
    return nextStudies;
  }

  private getMutableExperienceCards(lang: SupportedLang): TranslationExperienceCard[] {
    const cards = deepGet(this.i18n, `${lang}.translationPage.experience.cards`);
    if (Array.isArray(cards)) return cards as TranslationExperienceCard[];

    const nextCards: TranslationExperienceCard[] = [];
    deepSet(this.i18n, `${lang}.translationPage.experience.cards`, nextCards);
    return nextCards;
  }

  private syncTranslationExperienceFallbacks(key: string, previousSpanishValue: unknown, nextSpanishValue: string): void {
    EXPERIENCE_FALLBACK_LANGS.forEach((lang) => {
      const langTree = this.i18n[lang];
      if (!langTree) return;

      const parkedValue = deepGet(langTree, key);
      if ((typeof parkedValue === 'string' && parkedValue.trim() === '') || parkedValue === previousSpanishValue) {
        deepSet(langTree, key, nextSpanishValue);
      }
    });
  }

  setText(key: string, value: string): void {
    if (!this.initialized) return;
    const langTree = this.i18n[this.currentLang];
    if (!langTree) return;
    const shouldSyncTranslationExperienceFallbacks = this.currentLang === 'es'
      && TRANSLATION_EXPERIENCE_FALLBACK_SYNC_KEY_PATTERN.test(key);
    const previousSpanishValue = shouldSyncTranslationExperienceFallbacks ? deepGet(langTree, key) : undefined;
    deepSet(langTree, key, value);
    if (shouldSyncTranslationExperienceFallbacks) {
      this.syncTranslationExperienceFallbacks(key, previousSpanishValue, value);
    }
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  addEducationStudy(seed: TranslationExperienceSeed): void {
    if (!this.initialized) return;

    const trimmedSeed = this.getValidatedTranslationSeed(
      seed,
      'El bloque education requiere valores ES/EN/FR no vacíos antes de añadir un estudio.',
    );
    const localizedStudies: Record<SupportedLang, string> = {
      ...trimmedSeed,
      de: trimmedSeed.es,
      it: trimmedSeed.es,
      ca: trimmedSeed.es,
    };

    [...EXPERIENCE_EDITOR_LANGS, ...EXPERIENCE_FALLBACK_LANGS].forEach((lang) => {
      this.getMutableEducationStudies(lang).push(localizedStudies[lang]);
    });

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  addExperienceCard(input: TranslationExperienceCardInput): void {
    if (!this.initialized) return;

    const highlight = this.getValidatedTranslationSeed(
      input.highlight,
      'La experience card requiere highlight con valores ES/EN/FR no vacíos.',
    );
    const title = this.getValidatedTranslationSeed(
      input.title,
      'La experience card requiere title con valores ES/EN/FR no vacíos.',
    );
    const text = this.getValidatedTranslationSeed(
      input.text,
      'La experience card requiere text con valores ES/EN/FR no vacíos.',
    );
    const localizedCards: Record<SupportedLang, TranslationExperienceCard> = {
      es: { highlight: highlight.es, title: title.es, text: text.es },
      en: { highlight: highlight.en, title: title.en, text: text.en },
      fr: { highlight: highlight.fr, title: title.fr, text: text.fr },
      de: { highlight: highlight.es, title: title.es, text: text.es },
      it: { highlight: highlight.es, title: title.es, text: text.es },
      ca: { highlight: highlight.es, title: title.es, text: text.es },
    };

    [...EXPERIENCE_EDITOR_LANGS, ...EXPERIENCE_FALLBACK_LANGS].forEach((lang) => {
      this.getMutableExperienceCards(lang).push(cloneValue(localizedCards[lang]));
    });

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  addEditableCollectionItem(kind: EditableCollectionKind, input: AddEditableCollectionItemInput): number {
    if (!this.initialized) return -1;
    const collection = this.getMutableEditableCollection(kind);
    const nextItem = createEditableCollectionItem(
      kind,
      input,
      collection.map((item) => String((item as { id: string }).id)),
    );

    if (kind === 'skills') {
      const skills = collection as SkillItem[];
      const insertIndex = getSkillInsertIndex(skills, (nextItem as SkillItem).group);
      skills.splice(insertIndex, 0, nextItem as SkillItem);
    } else {
      collection.push(nextItem);
    }

    if (kind === 'tools') {
      const tool = nextItem as ToolItem;
      deepSet(this.images, `toolLogos.${tool.id}`, tool.logo);
    }

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
    if (kind === 'skills') {
      return (collection as SkillItem[]).findIndex((item) => item.id === (nextItem as SkillItem).id);
    }
    return collection.length - 1;
  }

  removeEditableCollectionItem(kind: EditableCollectionKind, index: number): void {
    if (!this.initialized) return;
    const collection = this.getMutableEditableCollection(kind);
    const [removedItem] = collection.splice(index, 1);

    if (kind === 'tools' && removedItem && typeof removedItem === 'object') {
      const toolId = (removedItem as ToolItem).id;
      delete this.pendingImages[`toolLogos.${toolId}`];
      const toolLogos = deepGet(this.images, 'toolLogos');
      if (toolLogos && typeof toolLogos === 'object') {
        delete (toolLogos as Record<string, unknown>)[toolId];
      }
    }

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  moveEditableCollectionItem(kind: EditableCollectionKind, index: number, delta: number): void {
    if (!this.initialized || delta === 0) return;
    this.reorderEditableCollectionItem(kind, index, index + delta);
  }

  reorderEditableCollectionItem(kind: EditableCollectionKind, fromIndex: number, targetIndex: number): void {
    if (!this.initialized) return;
    const collection = this.getMutableEditableCollection(kind);

    if (
      fromIndex === targetIndex ||
      fromIndex < 0 ||
      fromIndex >= collection.length ||
      targetIndex < 0 ||
      targetIndex >= collection.length
    ) {
      return;
    }

    const [item] = collection.splice(fromIndex, 1);
    collection.splice(targetIndex, 0, item);
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  updateEditableCollectionText(
    kind: EditableCollectionKind,
    index: number,
    field: 'label' | 'level',
    lang: EditableCollectionLocale,
    value: string,
  ): void {
    const collection = this.getMutableEditableCollection(kind);
    const item = collection[index] as (LanguageItem | ToolItem | SkillItem | undefined);
    if (!item || !(field in item)) return;

    const localized = item[field];
    if (!localized || typeof localized !== 'object') return;

    item[field] = updateCollectionLocalizedText(localized as LocalizedText, lang, value) as never;
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  updateEditableCollectionSkillGroup(index: number, group: SkillGroup): void {
    if (!this.initialized || !EDITABLE_SKILL_GROUPS.includes(group)) return;
    const collection = this.getMutableEditableCollection('skills') as SkillItem[];
    const item = collection[index];
    if (!item || item.group === group) return;

    const [nextItem] = collection.splice(index, 1);
    nextItem.group = group;
    const insertIndex = getSkillInsertIndex(collection, group);
    collection.splice(insertIndex, 0, nextItem);

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  async setEditableToolLogo(index: number, file: File): Promise<void> {
    const tools = this.getMutableEditableCollection('tools') as ToolItem[];
    const item = tools[index];
    if (!item) return;
    const validationError = validateToolLogoUpload(file);
    if (validationError) {
      throw new Error(validationError);
    }
    await this.setImage(`toolLogos.${item.id}`, file, buildToolLogoUploadPath(item.id, file));
  }

  getImageSrc(key: string): string {
    const pending = this.pendingImages[key];
    if (pending) return pending.previewSrc;
    const value = deepGet(this.images, key);
    return typeof value === 'string' ? value : '';
  }

  setPublicLanguageVisibility(lang: SupportedLang, visible: boolean): void {
    if (!this.initialized) return;

    const nextVisibleLangs = new Set(this.getPublicLanguagePicker());
    if (lang === 'es') {
      nextVisibleLangs.add('es');
    } else if (visible) {
      nextVisibleLangs.add(lang);
    } else {
      nextVisibleLangs.delete(lang);
    }

    const nextPicker = getPublicLanguagePicker({
      publicLanguagePicker: SUPPORTED_LANGS.filter((locale) => nextVisibleLangs.has(locale)),
    }) as SupportedLang[];

    if (JSON.stringify(nextPicker) === JSON.stringify(this.getPublicLanguagePicker())) {
      return;
    }

    deepSet(this.images, 'publicLanguagePicker', nextPicker);
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  addOrbitMediaItem(): void {
    if (!this.initialized) return;
    const orbitMedia = this.getMutableOrbitMedia();
    orbitMedia.push(createOrbitMediaDraft(orbitMedia.map((item) => item.id)));
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  removeOrbitMediaItem(index: number): void {
    if (!this.initialized) return;
    const orbitMedia = this.getMutableOrbitMedia();
    const [removedItem] = orbitMedia.splice(index, 1);
    if (removedItem) {
      delete this.pendingImages[getOrbitPendingKey(removedItem.id, 'src')];
      delete this.pendingImages[getOrbitPendingKey(removedItem.id, 'poster')];
    }
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  moveOrbitMediaItem(index: number, delta: number): void {
    if (!this.initialized || delta === 0) return;
    const orbitMedia = this.getMutableOrbitMedia();
    const targetIndex = index + delta;

    if (index < 0 || index >= orbitMedia.length || targetIndex < 0 || targetIndex >= orbitMedia.length) {
      return;
    }

    const [item] = orbitMedia.splice(index, 1);
    orbitMedia.splice(targetIndex, 0, item);
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  updateOrbitMediaType(index: number, type: OrbitMedia['type']): void {
    const item = this.getMutableOrbitMedia()[index];
    if (!item) return;
    item.type = type;
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  updateOrbitMediaHref(index: number, href: string | null): void {
    const item = this.getMutableOrbitMedia()[index];
    if (!item) return;
    const trimmedHref = href?.trim() ?? '';
    item.href = trimmedHref ? (trimmedHref.startsWith('/') ? trimmedHref : `/${trimmedHref}`) : null;
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  updateOrbitMediaPoster(index: number, poster: string | null): void {
    const item = this.getMutableOrbitMedia()[index];
    if (!item) return;
    item.poster = poster && poster.trim() ? poster.trim() : null;
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  updateOrbitMediaText(index: number, field: 'label' | 'alt', lang: OrbitAdminLang, value: string): void {
    const item = this.getMutableOrbitMedia()[index];
    if (!item) return;

    const localized = { ...item[field] } as LocalizedText;
    const previousSpanish = localized.es;
    localized[lang] = value;

    if (lang === 'es') {
      item[field] = applySpanishFallbackToCodeManagedLocales({
        ...localized,
        de: localized.de === previousSpanish || !localized.de.trim() ? value : localized.de,
        it: localized.it === previousSpanish || !localized.it.trim() ? value : localized.it,
        ca: localized.ca === previousSpanish || !localized.ca.trim() ? value : localized.ca,
      });
    } else {
      item[field] = localized;
    }

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  async setOrbitMediaFile(index: number, field: 'src' | 'poster', file: File, uploadPath: string): Promise<void> {
    const item = this.getMutableOrbitMedia()[index];
    if (!item) return;

    const pendingKey = getOrbitPendingKey(item.id, field);
    const existingPending = this.pendingImages[pendingKey];
    const normalizedPath = normalizeUploadPath(uploadPath);
    const dataUrl = await fileToDataUrl(file);
    const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] ?? '' : dataUrl;
    this.pendingImages[pendingKey] = {
      path: normalizedPath.path,
      sitePath: normalizedPath.sitePath,
      previousSitePath: existingPending?.previousSitePath ?? (field === 'src' ? item.src : item.poster ?? null),
      previewSrc: dataUrl,
      base64Content,
    };

    if (field === 'src') {
      item.src = normalizedPath.sitePath;
    } else {
      item.poster = normalizedPath.sitePath;
    }

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  updateUgcPortfolioField(
    itemId: string,
    field: 'category' | 'type' | 'label' | 'title' | 'description' | 'format' | 'alt',
    value: string,
    lang?: OrbitAdminLang,
  ): void {
    const item = this.getMutableUgcPortfolio().find((candidate) => candidate.id === itemId);
    if (!item) return;

    if (field === 'category') {
      item.category = value as UgcCategory;
    } else if (field === 'type') {
      item.type = value as UgcPortfolioItem['type'];
    } else {
      if (!lang) return;

      const localized = { ...item[field] } as LocalizedText;
      const previousSpanish = localized.es;
      localized[lang] = value;
      item[field] = lang === 'es'
        ? applySpanishFallbackToUgcLocales(localized, previousSpanish)
        : localized;
    }

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  async setUgcPortfolioMedia(itemId: string, file: File): Promise<void> {
    const item = this.getMutableUgcPortfolio().find((candidate) => candidate.id === itemId);
    if (!item) return;

    const validationError = validateUgcMediaUpload(file, item.type);
    if (validationError) {
      throw new Error(validationError);
    }

    await this.setPendingUgcAsset(item, 'src', file, buildUgcUploadPath(item.id, 'src', file));
  }

  async setUgcPortfolioPoster(itemId: string, file: File): Promise<void> {
    const item = this.getMutableUgcPortfolio().find((candidate) => candidate.id === itemId);
    if (!item) return;
    if (item.type !== 'video') {
      throw new Error('La carga de póster solo está disponible para elementos UGC de vídeo.');
    }

    const validationError = validateUgcMediaUpload(file, 'image');
    if (validationError) {
      throw new Error(validationError);
    }

    await this.setPendingUgcAsset(item, 'poster', file, buildUgcUploadPath(item.id, 'poster', file));
  }

  clearUgcPortfolioPoster(itemId: string): void {
    const item = this.getMutableUgcPortfolio().find((candidate) => candidate.id === itemId);
    if (!item) return;

    delete this.pendingImages[getUgcPendingKey(item.id, 'poster')];
    item.poster = null;
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  async setImage(key: string, file: File, uploadPath: string): Promise<void> {
    if (!this.initialized) return;
    const existingPending = this.pendingImages[key];
    const currentValue = deepGet(this.images, key);
    const normalizedPath = normalizeUploadPath(uploadPath);
    const dataUrl = await fileToDataUrl(file);
    const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] ?? '' : dataUrl;
    this.pendingImages[key] = {
      path: normalizedPath.path,
      sitePath: normalizedPath.sitePath,
      previousSitePath: existingPending?.previousSitePath ?? (typeof currentValue === 'string' ? currentValue : null),
      previewSrc: dataUrl,
      base64Content,
    };
    deepSet(this.images, key, normalizedPath.sitePath);
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  setLang(lang: string): void {
    this.currentLang = lang as SupportedLang;
    this.emit();
  }

  saveDraft(): void {
    if (typeof window === 'undefined' || !this.initialized) return;
    try {
      const payload = this.buildDraftPayload();
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      if (payload.pendingUploads.length > 0) {
        this.draftToneState = 'warning';
        this.draftMessageState = `Borrador guardado localmente. Si recargas antes de publicar, tendrás que volver a seleccionar ${getPendingUploadCountLabel(payload.pendingUploads.length)}.`;
      } else {
        this.draftToneState = 'success';
        this.draftMessageState = 'Borrador guardado localmente.';
      }
    } catch {
      this.draftToneState = 'error';
      this.draftMessageState = 'No se pudo guardar el borrador localmente. Los cambios siguen abiertos en esta pestaña; copia el texto importante antes de recargar.';
    }
    this.emit();
  }

  loadDraft(): void {
    if (typeof window === 'undefined' || !this.initialized) return;
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as Partial<LegacyDraftPayload>;
      if (draft.i18n) this.i18n = mergeDraftValue(this.i18n, draft.i18n) as Record<string, I18nTree>;
      this.restoreCodeManagedHeroMarks();
      if (draft.images) {
        this.images = mergeDraftValue(this.images, draft.images) as ImagesTree;
        deepSet(
          this.images,
          'publicLanguagePicker',
          normalizeDraftPublicLanguagePicker(
            deepGet(draft.images, 'publicLanguagePicker'),
            this.originalImages,
          ),
        );
      }
      if (draft.currentLang) this.currentLang = draft.currentLang;
      this.pendingImages = {};
      if (draft.pendingImages && draft.images) {
        this.scrubLegacyPendingDraftImages(draft.pendingImages);
      }
      const pendingUploadCount = draft.pendingUploads?.length ?? Object.keys(draft.pendingImages ?? {}).length;
      if (pendingUploadCount > 0) {
        this.draftToneState = 'warning';
        this.draftMessageState = getDraftRestoreMessage(pendingUploadCount);
      } else {
        this.draftToneState = '';
        this.draftMessageState = '';
      }
      this.emit();
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }

  async publish(): Promise<void> {
    if (!this.initialized || this.isPublishingState) return;
    const orbitValidationErrors = this.getOrbitValidationErrors();
    if (orbitValidationErrors.length > 0) {
      this.publishErrorState = orbitValidationErrors.join(' ');
      this.publishSuccessState = false;
      this.emit();
      return;
    }

    const ugcValidationErrors = this.getUgcPortfolioValidationErrors();
    if (ugcValidationErrors.length > 0) {
      this.publishErrorState = ugcValidationErrors.join(' ');
      this.publishSuccessState = false;
      this.emit();
      return;
    }

    this.syncToolLogoPaths();
    const editableCollectionErrors = getEditableCollectionValidationErrors(this.images as SiteData);
    if (editableCollectionErrors.length > 0) {
      this.publishErrorState = editableCollectionErrors.join(' ');
      this.publishSuccessState = false;
      this.emit();
      return;
    }

    this.isPublishingState = true;
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();

    try {
      await this.refreshIdentityToken();
      if (!this.token) {
        throw new Error('Debes iniciar sesión antes de publicar.');
      }

      for (const [imageKey, pendingImage] of Object.entries(this.pendingImages)) {
        await this.writeRepositoryFile(
          pendingImage.path,
          pendingImage.base64Content,
          `chore(admin): upload ${imageKey}`,
        );
      }

      const changedLangs = Object.keys(this.i18n).filter(
        (lang) => JSON.stringify(this.i18n[lang]) !== JSON.stringify(this.originalI18n[lang]),
      );

      for (const lang of changedLangs) {
        await this.writeRepositoryFile(
          `src/i18n/${lang}.json`,
          utf8ToBase64(`${JSON.stringify(this.i18n[lang], null, 2)}\n`),
          `chore(admin): update ${lang} translations`,
        );
      }

      if (JSON.stringify(this.images) !== JSON.stringify(this.originalImages)) {
        await this.writeRepositoryFile(
          'src/data/site.json',
          utf8ToBase64(`${JSON.stringify(this.images, null, 2)}\n`),
          'chore(admin): update site data',
        );
      }

      this.originalI18n = cloneValue(this.i18n);
      this.originalImages = cloneValue(this.images);
      this.pendingImages = {};
      this.publishSuccessState = true;
      this.publishErrorState = '';
      this.draftToneState = '';
      this.draftMessageState = '';
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch (error) {
      this.publishErrorState = error instanceof Error ? error.message : 'Error al publicar';
      this.publishSuccessState = false;
    } finally {
      this.isPublishingState = false;
      this.emit();
    }
  }

  /**
   * Creates (or retry-upserts) every locale Markdown file for one logical blog post.
   * Visible locales (per getPublicLanguagePicker) use their submitted translation;
   * every hidden locale always gets the fresh Spanish translation as a fallback.
   *
   * Before any image upload or Markdown write, every one of the six locale paths is
   * read first. A partial prior attempt may continue retry-safe only when every
   * existing locale file already agrees on the target slug/translationKey; if any
   * existing file parses as a different logical post, the create is rejected in
   * Spanish as a duplicate-slug collision before touching the shared image or any
   * Markdown writes. If all six already exist and belong to the target logical post,
   * their parsed content is compared against what this call would write: an exact
   * match (slug/translationKey/date/image plus trimmed title/description/tags/body)
   * is a safe idempotent retry that performs zero writes, while any difference is
   * rejected instead of silently overwriting an existing published post.
   */
  async createBlogPost(post: BlogPostCreateInput): Promise<string> {
    await this.refreshIdentityToken();

    if (!this.token) {
      throw new Error('Debes iniciar sesión antes de crear entradas de blog.');
    }

    const slug = validateBlogSlug(post.slug);
    validateBlogDate(post.date);
    const visibleLocales = this.getPublicLanguagePicker();
    validateVisibleBlogTranslations(post.translations, visibleLocales);

    if (post.featuredImage) {
      validateBlogFeaturedImage(post.featuredImage);
    }

    const translationKey = slug;
    const localePaths = getBlogLocaleMarkdownPaths(slug);
    const esTranslation = post.translations.es as BlogLocaleTranslation;
    // The deterministic path the shared image WOULD get, computed without uploading
    // anything yet, so a duplicate-slug preflight can compare it against what already
    // exists before any repository write.
    const pendingImagePath = post.featuredImage
      ? getBlogFeaturedImagePaths(slug, post.featuredImage).publicPath
      : undefined;

    // Preflight: read every locale path's current content before writing or uploading
    // anything, so an already-fully-published post under this slug can be detected and
    // either treated as an idempotent retry or rejected as a duplicate-slug collision.
    const existingFilesByLocale = {} as Record<SupportedLang, { sha: string; content: string } | null>;
    const parsedExistingFilesByLocale = {} as Record<SupportedLang, ReturnType<typeof parseBlogLocaleMarkdown> | null>;
    for (const locale of SUPPORTED_LANGS) {
      const existingFile = await this.fetchRepositoryFile(localePaths[locale]);
      existingFilesByLocale[locale] = existingFile;
      parsedExistingFilesByLocale[locale] = existingFile ? parseBlogLocaleMarkdown(existingFile.content) : null;
    }

    const existingLocaleCount = SUPPORTED_LANGS.filter((locale) => existingFilesByLocale[locale]).length;
    const hasMismatchedExistingLogicalIdentity = SUPPORTED_LANGS.some((locale) => {
      const parsed = parsedExistingFilesByLocale[locale];
      return parsed ? !blogLocaleMatchesSharedIdentity(parsed, { slug, translationKey }) : false;
    });

    if (hasMismatchedExistingLogicalIdentity) {
      throw new Error(getBlogDuplicateSlugMessage(slug));
    }

    if (existingLocaleCount === SUPPORTED_LANGS.length) {
      const isIdenticalLogicalPost = SUPPORTED_LANGS.every((locale) => {
        const parsed = parsedExistingFilesByLocale[locale];
        if (!parsed) return false;
        const expectedTranslation = resolveBlogLocaleTranslation(locale, visibleLocales, post.translations, esTranslation);

        return blogLocaleMatchesExpected(parsed, expectedTranslation, {
          slug,
          translationKey,
          date: post.date,
          image: pendingImagePath,
        });
      });

      if (isIdenticalLogicalPost) {
        return translationKey;
      }

      throw new Error(getBlogDuplicateSlugMessage(slug));
    }

    let imagePath: string | undefined;
    if (post.featuredImage) {
      const { repositoryPath, publicPath } = getBlogFeaturedImagePaths(slug, post.featuredImage);
      const dataUrl = await fileToDataUrl(post.featuredImage);
      const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] ?? '' : dataUrl;
      await this.writeRepositoryFile(repositoryPath, base64Content, `feat(blog): upload ${slug} image`);
      imagePath = publicPath;
    }

    for (const locale of SUPPORTED_LANGS) {
      const path = localePaths[locale];
      const existingFile = existingFilesByLocale[locale];
      const translation = resolveBlogLocaleTranslation(locale, visibleLocales, post.translations, esTranslation);

      const markdown = buildBlogLocaleMarkdown({
        slug,
        translationKey,
        title: translation.title,
        description: translation.description,
        date: post.date,
        image: imagePath,
        tags: translation.tags,
        lang: locale,
        body: translation.body,
      });

      await this.putRepositoryFile(path, utf8ToBase64(markdown), `feat(blog): create ${path}`, existingFile?.sha || null);
    }

    return translationKey;
  }

  /**
   * Upserts every locale Markdown file for an existing logical post. The slug and
   * translationKey stay fixed; visible locales apply the submitted translation while
   * hidden locales preserve their own existing localized content (Spanish-falling-back
   * only when a hidden locale file doesn't exist yet). The shared image is replaced
   * before any locale write; whenever the previous image differs from the new one
   * (replaced with a new upload, or explicitly removed) and was actually owned by this
   * slug (`/images/blog/<slug>.<ext>`, never a shared `/images/site/...` asset or
   * another slug's image), its cleanup is deferred until every locale file has been
   * rewritten successfully.
   */
  async updateBlogPost(post: BlogPostUpdateInput): Promise<BlogPostUpdateResult> {
    await this.refreshIdentityToken();

    if (!this.token) {
      throw new Error('Debes iniciar sesión antes de editar entradas de blog.');
    }

    const slug = validateBlogSlug(post.slug);
    validateBlogDate(post.date);
    const visibleLocales = this.getPublicLanguagePicker();
    validateVisibleBlogTranslations(post.translations, visibleLocales);

    if (post.featuredImage) {
      validateBlogFeaturedImage(post.featuredImage);
    }

    let imagePath = post.currentImage;
    let ownedImageRepositoryPathToRemove: string | null = null;

    if (post.featuredImage) {
      const { repositoryPath, publicPath } = getBlogFeaturedImagePaths(slug, post.featuredImage);
      const dataUrl = await fileToDataUrl(post.featuredImage);
      const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] ?? '' : dataUrl;
      await this.writeRepositoryFile(repositoryPath, base64Content, `feat(blog): upload ${slug} image`);
      imagePath = publicPath;
      if (post.currentImage && post.currentImage !== publicPath) {
        ownedImageRepositoryPathToRemove = getOwnedBlogImageRepositoryPath(slug, post.currentImage);
      }
    } else if (post.removeImage) {
      imagePath = undefined;
      ownedImageRepositoryPathToRemove = getOwnedBlogImageRepositoryPath(slug, post.currentImage);
    }

    const localePaths = getBlogLocaleMarkdownPaths(slug);
    const esTranslation = post.translations.es as BlogLocaleTranslation;
    let sharedTranslationKey = '';

    for (const locale of SUPPORTED_LANGS) {
      const path = localePaths[locale];
      const existingFile = await this.fetchRepositoryFile(path);
      const existingTranslation = existingFile ? parseBlogLocaleMarkdown(existingFile.content) : null;

      if (existingTranslation?.translationKey && !sharedTranslationKey) {
        sharedTranslationKey = existingTranslation.translationKey;
      }

      const submittedTranslation = post.translations[locale];
      const translation = (visibleLocales.includes(locale) && submittedTranslation
        ? submittedTranslation
        : existingTranslation ?? esTranslation) as BlogLocaleTranslation;

      const markdown = buildBlogLocaleMarkdown({
        slug,
        translationKey: sharedTranslationKey || slug,
        title: translation.title,
        description: translation.description,
        date: post.date,
        image: imagePath,
        tags: translation.tags,
        lang: locale,
        body: translation.body,
      });

      await this.putRepositoryFile(path, utf8ToBase64(markdown), `feat(blog): update ${path}`, existingFile?.sha ?? null);
    }

    if (ownedImageRepositoryPathToRemove) {
      await this.deleteRepositoryFile(ownedImageRepositoryPathToRemove, `chore(blog): remove ${slug} image`);
    }

    return { translationKey: sharedTranslationKey || slug, image: imagePath };
  }

  /**
   * Deletes every locale Markdown file belonging to one logical post, then the owned
   * shared image (only once every locale file is gone, and only when `post.image` is
   * actually owned by this slug — never a shared `/images/site/...` asset, another
   * slug's blog image, or a traversal-like path). A locale delete failure keeps
   * the post row intact by returning the still-remaining paths in Spanish instead of
   * throwing, so the admin UI can retry; deletions already missing (404) count as done.
   */
  async deleteBlogPost(post: BlogPostDeleteInput): Promise<BlogPostDeleteResult> {
    await this.refreshIdentityToken();

    if (!this.token) {
      throw new Error('Debes iniciar sesión antes de eliminar entradas de blog.');
    }

    const slug = validateBlogSlug(post.slug);
    const localePaths = getBlogLocaleMarkdownPaths(slug);
    const remainingPaths: string[] = [];

    for (const locale of SUPPORTED_LANGS) {
      const path = localePaths[locale];
      try {
        await this.deleteRepositoryFile(path, `chore(blog): delete ${path}`);
      } catch {
        remainingPaths.push(path);
      }
    }

    if (remainingPaths.length > 0) {
      return {
        status: 'locale-delete-failed',
        message: `No se pudieron eliminar todos los idiomas de la entrada. Quedan pendientes: ${remainingPaths.join(', ')}.`,
        remainingPaths,
      };
    }

    if (post.image) {
      const imageRepositoryPath = getOwnedBlogImageRepositoryPath(slug, post.image);
      if (imageRepositoryPath) {
        try {
          await this.deleteRepositoryFile(imageRepositoryPath, `chore(blog): remove ${slug} image`);
        } catch (error) {
          const details = error instanceof Error ? error.message : 'la imagen destacada no se pudo eliminar';
          return {
            status: 'image-cleanup-failed',
            message: `La entrada se eliminó, pero no se pudo eliminar la imagen destacada: ${details}`,
            remainingPaths: [imageRepositoryPath],
          };
        }
      }
    }

    return { status: 'post-deleted', message: 'La entrada del blog se eliminó correctamente.', remainingPaths: [] };
  }

  private async refreshIdentityToken(): Promise<void> {
    if (typeof window === 'undefined') return;

    const identity = (window as typeof window & {
      netlifyIdentity?: {
        currentUser?: () => unknown;
        refresh?: () => Promise<string>;
      };
    }).netlifyIdentity;

    if (!identity?.currentUser?.() || !identity.refresh) return;

    try {
      const token = await identity.refresh();
      if (!token) throw new Error('Missing refreshed token');
      this.token = token;
    } catch {
      // The stored token is no longer valid — clear it immediately so the
      // snapshot flips to unauthenticated. The enclosing publish() call emits
      // once in its finally block so auth gates react to this state change.
      this.token = '';
      throw new Error('La sesión de administrador ha expirado. Cierra sesión y vuelve a iniciarla; tus cambios sin publicar siguen abiertos.');
    }
  }

  private async writeRepositoryFile(path: string, content: string, message: string): Promise<void> {
    const sha = await this.fetchFileSha(path);
    await this.putRepositoryFile(path, content, message, sha);
  }

  private async putRepositoryFile(path: string, content: string, message: string, sha: string | null = null): Promise<void> {
    const response = await fetch(`/.netlify/git/github/contents/${encodeURI(path)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content,
        sha: sha ?? undefined,
      }),
    });

    if (!response.ok) {
      let details = response.statusText;
      try {
        const data = (await response.json()) as { message?: string };
        if (data?.message) details = data.message;
      } catch {
        details = await response.text();
      }
      throw new Error(`No se pudo publicar ${path}: ${details}`);
    }
  }

  private async fetchFileSha(path: string): Promise<string | null> {
    const response = await fetch(`/.netlify/git/github/contents/${encodeURI(path)}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      let details = response.statusText;
      try {
        const data = (await response.json()) as { message?: string };
        if (data?.message) details = data.message;
      } catch {
        details = await response.text();
      }
      throw new Error(`No se pudo cargar ${path}: ${details}`);
    }

    const data = (await response.json()) as { sha?: string };
    return data.sha ?? null;
  }

  private async fetchRepositoryFile(path: string): Promise<{ sha: string; content: string } | null> {
    const response = await fetch(`/.netlify/git/github/contents/${encodeURI(path)}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      let details = response.statusText;
      try {
        const data = (await response.json()) as { message?: string };
        if (data?.message) details = data.message;
      } catch {
        details = await response.text();
      }
      throw new Error(`No se pudo cargar ${path}: ${details}`);
    }

    const data = (await response.json()) as { sha?: string; content?: string };
    return {
      sha: data.sha ?? '',
      content: typeof data.content === 'string' ? base64ToUtf8(data.content) : '',
    };
  }

  private async deleteRepositoryFile(path: string, message: string): Promise<void> {
    const sha = await this.fetchFileSha(path);
    if (sha === null) return;

    const response = await fetch(`/.netlify/git/github/contents/${encodeURI(path)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, sha }),
    });

    if (!response.ok && response.status !== 404) {
      let details = response.statusText;
      try {
        const data = (await response.json()) as { message?: string };
        if (data?.message) details = data.message;
      } catch {
        details = await response.text();
      }
      throw new Error(`No se pudo eliminar ${path}: ${details}`);
    }
  }

  private getMutableOrbitMedia(): OrbitMedia[] {
    const orbitMedia = deepGet(this.images, 'orbitMedia');
    if (Array.isArray(orbitMedia)) return orbitMedia as OrbitMedia[];

    const nextOrbitMedia: OrbitMedia[] = [];
    deepSet(this.images, 'orbitMedia', nextOrbitMedia);
    return nextOrbitMedia;
  }

  private getPersistedUgcPortfolio(): UgcPortfolioItem[] {
    const ugcPortfolio = deepGet(this.images, 'ugcPortfolio');
    if (!Array.isArray(ugcPortfolio)) return [];

    return cloneValue(ugcPortfolio as UgcPortfolioItem[]);
  }

  private getMutableUgcPortfolio(): UgcPortfolioItem[] {
    const ugcPortfolio = deepGet(this.images, 'ugcPortfolio');
    if (Array.isArray(ugcPortfolio)) return ugcPortfolio as UgcPortfolioItem[];

    const nextUgcPortfolio: UgcPortfolioItem[] = [];
    deepSet(this.images, 'ugcPortfolio', nextUgcPortfolio);
    return nextUgcPortfolio;
  }

  private async setPendingUgcAsset(
    item: UgcPortfolioItem,
    field: 'src' | 'poster',
    file: File,
    uploadPath: string,
  ): Promise<void> {
    const pendingKey = getUgcPendingKey(item.id, field);
    const existingPending = this.pendingImages[pendingKey];
    const normalizedPath = normalizeUploadPath(uploadPath);
    const dataUrl = await fileToDataUrl(file);
    const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] ?? '' : dataUrl;

    this.pendingImages[pendingKey] = {
      path: normalizedPath.path,
      sitePath: normalizedPath.sitePath,
      previousSitePath: existingPending?.previousSitePath ?? (field === 'src' ? item.src : item.poster),
      previewSrc: dataUrl,
      base64Content,
    };

    if (field === 'src') {
      item.src = normalizedPath.sitePath;
    } else {
      item.poster = normalizedPath.sitePath;
    }

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  private getPersistedEditableCollection(kind: EditableCollectionKind): Array<LanguageItem | ToolItem | SkillItem> {
    const collection = deepGet(this.images, `arsenal.${kind}`);
    if (!Array.isArray(collection)) return [];
    return cloneValue(collection as Array<LanguageItem | ToolItem | SkillItem>);
  }

  private getMutableEditableCollection(kind: EditableCollectionKind): Array<LanguageItem | ToolItem | SkillItem> {
    const collection = deepGet(this.images, `arsenal.${kind}`);
    if (Array.isArray(collection)) return collection as Array<LanguageItem | ToolItem | SkillItem>;

    const nextCollection: Array<LanguageItem | ToolItem | SkillItem> = [];
    deepSet(this.images, `arsenal.${kind}`, nextCollection);
    return nextCollection;
  }

  private syncToolLogoPaths(): void {
    const toolLogos = deepGet(this.images, 'toolLogos');
    const tools = deepGet(this.images, 'arsenal.tools');
    if (!toolLogos || typeof toolLogos !== 'object' || !Array.isArray(tools)) return;

    (tools as ToolItem[]).forEach((tool) => {
      const mappedLogo = (toolLogos as Record<string, unknown>)[tool.id];
      if (typeof mappedLogo === 'string' && mappedLogo.trim()) {
        tool.logo = mappedLogo;
      }
    });
  }

  private buildDraftPayload(): DraftPayload {
    const images = cloneValue(this.images);
    const pendingUploads = Object.keys(this.pendingImages).map((key) => ({ key }));

    for (const [key, pendingImage] of Object.entries(this.pendingImages)) {
      const orbitMatch = key.match(/^orbit\.(.+)\.(src|poster)$/);
      if (orbitMatch) {
        const [, itemId, field] = orbitMatch;
        const orbitMedia = deepGet(images, 'orbitMedia');
        if (Array.isArray(orbitMedia)) {
          const item = orbitMedia.find((candidate) => (
            candidate !== null
            && typeof candidate === 'object'
            && (candidate as OrbitMedia).id === itemId
          )) as OrbitMedia | undefined;
          if (item) {
            if (field === 'src') {
              item.src = pendingImage.previousSitePath ?? '';
            } else {
              item.poster = pendingImage.previousSitePath;
            }
          }
        }
        continue;
      }

      const ugcMatch = key.match(/^ugc\.(.+)\.(src|poster)$/);
      if (ugcMatch) {
        const [, itemId, field] = ugcMatch;
        const ugcPortfolio = deepGet(images, 'ugcPortfolio');
        if (Array.isArray(ugcPortfolio)) {
          const item = ugcPortfolio.find((candidate) => (
            candidate !== null
            && typeof candidate === 'object'
            && (candidate as UgcPortfolioItem).id === itemId
          )) as UgcPortfolioItem | undefined;

          if (item) {
            if (field === 'src') {
              item.src = pendingImage.previousSitePath ?? '';
            } else {
              item.poster = pendingImage.previousSitePath;
            }
          }
        }
        continue;
      }

      deepSet(images, key, pendingImage.previousSitePath ?? '');
    }

    return {
      i18n: this.i18n,
      images,
      currentLang: this.currentLang,
      pendingUploads,
    };
  }

  private restoreCodeManagedHeroMarks(): void {
    SUPPORTED_LANGS.forEach((lang) => {
      const originalHeroMark = deepGet(this.originalI18n[lang], 'translationPage.heroMark');
      if (typeof originalHeroMark !== 'string') return;

      deepSet(this.i18n, `${lang}.translationPage.heroMark`, originalHeroMark);
    });
  }

  private scrubLegacyPendingDraftImages(pendingImages: Record<string, PendingImage>): void {
    for (const [key, pendingImage] of Object.entries(pendingImages)) {
      const orbitMatch = key.match(/^orbit\.(.+)\.(src|poster)$/);
      if (orbitMatch) {
        const [, itemId, field] = orbitMatch;
        const orbitMedia = deepGet(this.images, 'orbitMedia');
        const originalOrbitMedia = deepGet(this.originalImages, 'orbitMedia');
        if (Array.isArray(orbitMedia) && Array.isArray(originalOrbitMedia)) {
          const item = orbitMedia.find((candidate) => (
            candidate !== null
            && typeof candidate === 'object'
            && (candidate as OrbitMedia).id === itemId
          )) as OrbitMedia | undefined;
          const originalItem = originalOrbitMedia.find((candidate) => (
            candidate !== null
            && typeof candidate === 'object'
            && (candidate as OrbitMedia).id === itemId
          )) as OrbitMedia | undefined;

          if (item) {
            if (field === 'src') {
              item.src = pendingImage.previousSitePath ?? originalItem?.src ?? item.src;
            } else {
              item.poster = pendingImage.previousSitePath ?? originalItem?.poster ?? item.poster ?? null;
            }
          }
        }
        continue;
      }

      const ugcMatch = key.match(/^ugc\.(.+)\.(src|poster)$/);
      if (ugcMatch) {
        const [, itemId, field] = ugcMatch;
        const ugcPortfolio = deepGet(this.images, 'ugcPortfolio');
        const originalUgcPortfolio = deepGet(this.originalImages, 'ugcPortfolio');
        if (Array.isArray(ugcPortfolio) && Array.isArray(originalUgcPortfolio)) {
          const item = ugcPortfolio.find((candidate) => (
            candidate !== null
            && typeof candidate === 'object'
            && (candidate as UgcPortfolioItem).id === itemId
          )) as UgcPortfolioItem | undefined;
          const originalItem = originalUgcPortfolio.find((candidate) => (
            candidate !== null
            && typeof candidate === 'object'
            && (candidate as UgcPortfolioItem).id === itemId
          )) as UgcPortfolioItem | undefined;

          if (item) {
            if (field === 'src') {
              item.src = pendingImage.previousSitePath ?? originalItem?.src ?? item.src;
            } else {
              item.poster = pendingImage.previousSitePath ?? originalItem?.poster ?? item.poster ?? null;
            }
          }
        }
        continue;
      }

      const originalValue = deepGet(this.originalImages, key);
      deepSet(
        this.images,
        key,
        pendingImage.previousSitePath ?? (typeof originalValue === 'string' ? originalValue : ''),
      );
    }
  }

  private getOrbitValidationErrors(): string[] {
    return this.getPersistedOrbitMedia().flatMap((item) => (
      validateOrbitMediaItem(item).map((error) => `${item.id}: ${error}`)
    ));
  }

  private getOrbitItemValidationErrors(itemId: string): string[] {
    const item = this.getPersistedOrbitMedia().find((candidate) => candidate.id === itemId);
    return item ? validateOrbitMediaItem(item) : [];
  }

  private getUgcPortfolioValidationErrors(): string[] {
    return this.getPersistedUgcPortfolio().flatMap((item) => (
      validateUgcPortfolioItem(item).map((error) => `${item.id}: ${error}`)
    ));
  }

  private getUgcPortfolioItemValidationErrors(itemId: string): string[] {
    const item = this.getPersistedUgcPortfolio().find((candidate) => candidate.id === itemId);
    return item ? validateUgcPortfolioItem(item) : [];
  }

  private emit(): void {
    const textDiffs = Object.keys(this.i18n).reduce((total, lang) => {
      return total + countLeafDiffs(this.i18n[lang], this.originalI18n[lang]);
    }, 0);
    const imageDiffs = countLeafDiffs(this.images, this.originalImages);
    const pendingCount = textDiffs + imageDiffs;
    const orbitValidationErrors = this.getOrbitValidationErrors();

    this.snapshot = {
      initialized: this.initialized,
      isAuthenticated: Boolean(this.token),
      currentLang: this.currentLang,
      isDirty: pendingCount > 0,
      pendingCount,
      isPublishing: this.isPublishingState,
      publishSuccess: this.publishSuccessState,
      publishError: this.publishErrorState,
      draftTone: this.draftToneState,
      draftMessage: this.draftMessageState,
      orbitValidationErrors,
      getText: (key: string) => this.getText(key),
      getEducationStudies: () => this.getEducationStudies(),
      getExperienceCards: () => this.getExperienceCards(),
      getImageSrc: (key: string) => this.getImageSrc(key),
      getOrbitMedia: () => this.getOrbitMedia(),
      getUgcPortfolio: () => this.getUgcPortfolio(),
      getOrbitItemValidationErrors: (itemId: string) => this.getOrbitItemValidationErrors(itemId),
      getUgcPortfolioItemValidationErrors: (itemId: string) => this.getUgcPortfolioItemValidationErrors(itemId),
      getEditableCollection: (kind: EditableCollectionKind) => this.getEditableCollection(kind),
    };

    this.listeners.forEach((listener) => listener());
  }
}

export const adminStore = new AdminStore();
