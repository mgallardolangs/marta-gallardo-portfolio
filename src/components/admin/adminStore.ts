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
  previewSrc: string;
  base64Content: string;
};

type DraftPayload = {
  i18n: Record<string, I18nTree>;
  images: ImagesTree;
  currentLang: SupportedLang;
  pendingImages: Record<string, PendingImage>;
};

type AdminSnapshot = {
  initialized: boolean;
  currentLang: SupportedLang;
  isDirty: boolean;
  pendingCount: number;
  isPublishing: boolean;
  publishSuccess: boolean;
  publishError: string;
  getText: (key: string) => string;
  getImageSrc: (key: string) => string;
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
  private snapshot: AdminSnapshot = {
    initialized: false,
    currentLang: 'es',
    isDirty: false,
    pendingCount: 0,
    isPublishing: false,
    publishSuccess: false,
    publishError: '',
    getText: (key: string) => this.getText(key),
    getImageSrc: (key: string) => this.getImageSrc(key),
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

  setText(key: string, value: string): void {
    if (!this.initialized) return;
    const langTree = this.i18n[this.currentLang];
    if (!langTree) return;
    deepSet(langTree, key, value);
    this.publishSuccessState = false;
    this.publishErrorState = '';
    this.emit();
  }

  getImageSrc(key: string): string {
    const pending = this.pendingImages[key];
    if (pending) return pending.previewSrc;
    const value = deepGet(this.images, key);
    return typeof value === 'string' ? value : '';
  }

  async setImage(key: string, file: File, uploadPath: string): Promise<void> {
    if (!this.initialized) return;
    const dataUrl = await fileToDataUrl(file);
    const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] ?? '' : dataUrl;
    this.pendingImages[key] = {
      path: uploadPath,
      previewSrc: dataUrl,
      base64Content,
    };
    deepSet(this.images, key, uploadPath);
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
    const payload: DraftPayload = {
      i18n: this.i18n,
      images: this.images,
      currentLang: this.currentLang,
      pendingImages: this.pendingImages,
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  }

  loadDraft(): void {
    if (typeof window === 'undefined' || !this.initialized) return;
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as Partial<DraftPayload>;
      if (draft.i18n) this.i18n = draft.i18n;
      if (draft.images) this.images = draft.images;
      if (draft.currentLang) this.currentLang = draft.currentLang;
      if (draft.pendingImages) this.pendingImages = draft.pendingImages;
      this.emit();
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }

  async publish(): Promise<void> {
    if (!this.initialized) return;
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

  private emit(): void {
    const textDiffs = Object.keys(this.i18n).reduce((total, lang) => {
      return total + countLeafDiffs(this.i18n[lang], this.originalI18n[lang]);
    }, 0);
    const imageDiffs = countLeafDiffs(this.images, this.originalImages);
    const pendingCount = textDiffs + imageDiffs;

    this.snapshot = {
      initialized: this.initialized,
      currentLang: this.currentLang,
      isDirty: pendingCount > 0,
      pendingCount,
      isPublishing: this.isPublishingState,
      publishSuccess: this.publishSuccessState,
      publishError: this.publishErrorState,
      getText: (key: string) => this.getText(key),
      getImageSrc: (key: string) => this.getImageSrc(key),
    };

    this.listeners.forEach((listener) => listener());
  }
}

export const adminStore = new AdminStore();
