import {
  createOrbitMediaDraft,
  applySpanishFallbackToCodeManagedLocales,
  isOrbitImageSource,
  isOrbitVideoSource,
  validateOrbitMediaItem,
  type OrbitAdminLang,
} from '../../lib/orbitMedia.ts';
import {
  buildToolLogoUploadPath,
  createEditableCollectionItem,
  getEditableCollectionValidationErrors,
  type AddEditableCollectionItemInput,
  type EditableCollectionKind,
  type EditableCollectionLocale,
  updateCollectionLocalizedText,
} from '../../lib/adminCollections.ts';
import type {
  LanguageItem,
  LocalizedText,
  OrbitMedia,
  SiteData,
  SkillItem,
  ToolItem,
} from '../../lib/siteData.ts';

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
  getImageSrc: (key: string) => string;
  getOrbitMedia: () => OrbitMedia[];
  getOrbitItemValidationErrors: (itemId: string) => string[];
  getEditableCollection: (kind: EditableCollectionKind) => Array<LanguageItem | ToolItem | SkillItem>;
};

const DRAFT_STORAGE_KEY = 'marta-inline-editor-draft';

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function buildMarkdownPost(post: {
  title: string;
  description: string;
  date: string;
  tags: string[];
  lang: AdminBlogLang;
  body: string;
}): string {
  const quoted = (value: string) => JSON.stringify(value);
  const tags = `[${post.tags.map((tag) => JSON.stringify(tag)).join(', ')}]`;
  return `---\ntitle: ${quoted(post.title)}\ndescription: ${quoted(post.description)}\ndate: ${quoted(post.date)}\ntags: ${tags}\nlang: ${quoted(post.lang)}\n---\n\n${post.body.trim()}\n`;
}

function getOrbitPendingKey(itemId: string, field: 'src' | 'poster') {
  return `orbit.${itemId}.${field}`;
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
  return `${count} pending upload${count === 1 ? '' : 's'}`;
}

function getDraftRestoreMessage(count: number) {
  return count === 1
    ? 'Draft restored. 1 pending upload was not saved locally and must be reselected before publishing.'
    : `Draft restored. ${count} pending uploads were not saved locally and must be reselected before publishing.`;
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
    getImageSrc: (key: string) => this.getImageSrc(key),
    getOrbitMedia: () => this.getOrbitMedia(),
    getOrbitItemValidationErrors: (itemId: string) => this.getOrbitItemValidationErrors(itemId),
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

  private getPersistedOrbitMedia(): OrbitMedia[] {
    const orbitMedia = deepGet(this.images, 'orbitMedia');
    if (!Array.isArray(orbitMedia)) return [];

    return cloneValue(orbitMedia as OrbitMedia[]);
  }

  setText(key: string, value: string): void {
    if (!this.initialized) return;
    const langTree = this.i18n[this.currentLang];
    if (!langTree) return;
    deepSet(langTree, key, value);
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

    collection.push(nextItem);

    if (kind === 'tools') {
      const tool = nextItem as ToolItem;
      deepSet(this.images, `toolLogos.${tool.id}`, tool.logo);
    }

    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
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
    const collection = this.getMutableEditableCollection(kind);
    const targetIndex = index + delta;

    if (index < 0 || index >= collection.length || targetIndex < 0 || targetIndex >= collection.length) {
      return;
    }

    const [item] = collection.splice(index, 1);
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

  async setEditableToolLogo(index: number, file: File): Promise<void> {
    const tools = this.getMutableEditableCollection('tools') as ToolItem[];
    const item = tools[index];
    if (!item) return;
    await this.setImage(`toolLogos.${item.id}`, file, buildToolLogoUploadPath(item.id, file));
  }

  getImageSrc(key: string): string {
    const pending = this.pendingImages[key];
    if (pending) return pending.previewSrc;
    const value = deepGet(this.images, key);
    return typeof value === 'string' ? value : '';
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

    if (type === 'image') {
      if (!isOrbitImageSource(item.src)) {
        item.src = '/images/site/orbit-placeholder-profile.svg';
        delete this.pendingImages[getOrbitPendingKey(item.id, 'src')];
      }
      item.poster = null;
      delete this.pendingImages[getOrbitPendingKey(item.id, 'poster')];
    } else if (!isOrbitVideoSource(item.src)) {
      item.src = '';
      delete this.pendingImages[getOrbitPendingKey(item.id, 'src')];
    }
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
        this.draftMessageState = `Draft saved locally. ${getPendingUploadCountLabel(payload.pendingUploads.length)} must be reselected after reload before publishing.`;
      } else {
        this.draftToneState = 'success';
        this.draftMessageState = 'Draft saved locally.';
      }
    } catch (error) {
      this.draftToneState = 'error';
      this.draftMessageState = error instanceof Error && error.name === 'QuotaExceededError'
        ? 'Draft could not be saved locally. Changes are still open in this tab; copy important text before reloading.'
        : 'Draft could not be saved locally. Changes are still open in this tab; copy important text before reloading.';
    }
    this.emit();
  }

  loadDraft(): void {
    if (typeof window === 'undefined' || !this.initialized) return;
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as Partial<LegacyDraftPayload>;
      if (draft.i18n) this.i18n = draft.i18n;
      if (draft.images) {
        this.images = cloneValue(draft.images);
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
    if (!this.initialized) return;
    const orbitValidationErrors = this.getOrbitValidationErrors();
    if (orbitValidationErrors.length > 0) {
      this.publishErrorState = orbitValidationErrors.join(' ');
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

    if (!this.token) {
      this.publishErrorState = 'Login required before publishing.';
      this.publishSuccessState = false;
      this.emit();
      return;
    }

    this.isPublishingState = true;
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();

    try {
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

      for (const [imageKey, pendingImage] of Object.entries(this.pendingImages)) {
        await this.writeRepositoryFile(
          pendingImage.path,
          pendingImage.base64Content,
          `chore(admin): upload ${imageKey}`,
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
      this.publishErrorState = error instanceof Error ? error.message : 'Publish failed';
      this.publishSuccessState = false;
    } finally {
      this.isPublishingState = false;
      this.emit();
    }
  }

  async createBlogPost(post: {
    slug: string;
    title: string;
    description: string;
    date: string;
    tags: string[];
    lang: AdminBlogLang;
    body: string;
  }): Promise<string> {
    if (!this.token) {
      throw new Error('Login required before creating blog posts.');
    }

    if (!isAdminBlogLang(post.lang)) {
      throw new Error('Blog posts can only be created in ES, EN, or FR.');
    }

    const slug = post.slug.trim();
    if (!slug) throw new Error('A slug is required.');

    const path = `src/content/blog/${slug}.md`;
    const markdown = buildMarkdownPost(post);
    await this.writeRepositoryFile(
      path,
      utf8ToBase64(markdown),
      `feat(blog): create ${slug}`,
    );
    return path;
  }

  private async writeRepositoryFile(path: string, content: string, message: string): Promise<void> {
    const sha = await this.fetchFileSha(path);
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
      throw new Error(`Failed to publish ${path}: ${details}`);
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
      throw new Error(`Failed to load ${path}: ${details}`);
    }

    const data = (await response.json()) as { sha?: string };
    return data.sha ?? null;
  }

  private getMutableOrbitMedia(): OrbitMedia[] {
    const orbitMedia = deepGet(this.images, 'orbitMedia');
    if (Array.isArray(orbitMedia)) return orbitMedia as OrbitMedia[];

    const nextOrbitMedia: OrbitMedia[] = [];
    deepSet(this.images, 'orbitMedia', nextOrbitMedia);
    return nextOrbitMedia;
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

      deepSet(images, key, pendingImage.previousSitePath ?? '');
    }

    return {
      i18n: this.i18n,
      images,
      currentLang: this.currentLang,
      pendingUploads,
    };
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

  private emit(): void {
    const textDiffs = Object.keys(this.i18n).reduce((total, lang) => {
      return total + countLeafDiffs(this.i18n[lang], this.originalI18n[lang]);
    }, 0);
    const imageDiffs = countLeafDiffs(this.images, this.originalImages);
    const pendingCount = textDiffs + imageDiffs;
    const orbitValidationErrors = this.getOrbitValidationErrors();

    this.snapshot = {
      initialized: this.initialized,
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
      getImageSrc: (key: string) => this.getImageSrc(key),
      getOrbitMedia: () => this.getOrbitMedia(),
      getOrbitItemValidationErrors: (itemId: string) => this.getOrbitItemValidationErrors(itemId),
      getEditableCollection: (kind: EditableCollectionKind) => this.getEditableCollection(kind),
    };

    this.listeners.forEach((listener) => listener());
  }
}

export const adminStore = new AdminStore();
