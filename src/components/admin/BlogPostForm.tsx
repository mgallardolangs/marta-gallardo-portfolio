import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { parseMarkdownOutline, insertMarkdownHeading } from '../../lib/blogOutline.ts';
import {
  applyBlogToolbarAction,
  clearBlogImagePreviewState,
  createBlogImagePreviewState,
  type BlogImagePreviewState,
  type BlogToolbarAction,
} from '../../lib/blogPostFormState.ts';
import type { BlogTranslationsInput, SupportedLang } from './adminStore';
import { useAdminStore } from './useAdminStore';

const inputClass = 'w-full border border-black/10 bg-paper px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amaranth';
const labelClass = 'mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-warm-gray';
const toolbarButtonClass = 'border border-black/10 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink transition hover:border-amaranth hover:text-amaranth';
const tabButtonClass = (isActive: boolean) => `border border-b-0 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] transition ${isActive ? 'border-black bg-black text-paper' : 'border-black/10 bg-paper text-ink-muted hover:border-black/40 hover:text-ink'}`;

const LOCALE_NATIVE_LABELS: Record<SupportedLang, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ca: 'Català',
};

const DEFAULT_BODY_PLACEHOLDER = '# Nuevo post\n\nEscribe aquí...';

const emptyFeaturedImageState: BlogImagePreviewState = { file: null, previewUrl: '' };

export type BlogPostFormLocaleValues = {
  title: string;
  description: string;
  tags: string;
  body: string;
};

export type BlogPostFormInitialTranslation = {
  title: string;
  description: string;
  tags: string[];
  body: string;
};

export type BlogPostFormInitialPost = {
  translationKey: string;
  slug: string;
  date: string;
  image?: string;
  translations: Partial<Record<SupportedLang, BlogPostFormInitialTranslation>>;
};

type BlogPostFormProps = {
  mode: 'create' | 'edit';
  visibleLocales: SupportedLang[];
  initialPost?: BlogPostFormInitialPost;
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getDefaultDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyLocaleValues(): BlogPostFormLocaleValues {
  return { title: '', description: '', tags: '', body: DEFAULT_BODY_PLACEHOLDER };
}

function toLocaleValues(translation: BlogPostFormInitialTranslation | undefined): BlogPostFormLocaleValues {
  if (!translation) return createEmptyLocaleValues();
  return {
    title: translation.title,
    description: translation.description,
    tags: translation.tags.join(', '),
    body: translation.body,
  };
}

function createInitialTranslationsMap(locales: readonly SupportedLang[]): Partial<Record<SupportedLang, BlogPostFormLocaleValues>> {
  return Object.fromEntries(locales.map((locale) => [locale, createEmptyLocaleValues()]));
}

function buildTranslationsPayload(translations: Partial<Record<SupportedLang, BlogPostFormLocaleValues>>): BlogTranslationsInput {
  return Object.fromEntries(
    (Object.entries(translations) as [SupportedLang, BlogPostFormLocaleValues][]).map(([locale, values]) => [
      locale,
      {
        title: values.title.trim(),
        description: values.description.trim(),
        tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        body: values.body,
      },
    ]),
  );
}

export default function BlogPostForm({ mode, visibleLocales: initialVisibleLocales, initialPost }: BlogPostFormProps) {
  const store = useAdminStore();
  const bodyRefs = useRef<Partial<Record<SupportedLang, HTMLTextAreaElement | null>>>({});

  const visibleLocales = store.getPublicLanguagePicker();
  const [activeLocale, setActiveLocale] = useState<SupportedLang>(() => initialVisibleLocales[0] ?? 'es');
  const effectiveActiveLocale = visibleLocales.includes(activeLocale) ? activeLocale : (visibleLocales[0] ?? 'es');

  const [translations, setTranslations] = useState<Partial<Record<SupportedLang, BlogPostFormLocaleValues>>>(() => {
    if (mode === 'edit' && initialPost) {
      return Object.fromEntries(
        (Object.entries(initialPost.translations) as [SupportedLang, BlogPostFormInitialTranslation][])
          .map(([locale, translation]) => [locale, toLocaleValues(translation)]),
      );
    }

    return createInitialTranslationsMap(initialVisibleLocales);
  });

  const [date, setDate] = useState(() => (mode === 'edit' && initialPost ? initialPost.date : getDefaultDate()));
  const [featuredImageState, setFeaturedImageState] = useState<BlogImagePreviewState>(emptyFeaturedImageState);
  const [removeImage, setRemoveImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successPath, setSuccessPath] = useState('');

  const derivedSlug = useMemo(() => slugify(translations.es?.title ?? ''), [translations.es?.title]);
  const slug = mode === 'edit' && initialPost ? initialPost.slug : derivedSlug;

  const activeValues = translations[effectiveActiveLocale] ?? createEmptyLocaleValues();
  const outline = useMemo(() => parseMarkdownOutline(activeValues.body), [activeValues.body]);

  const createPreviewUrl = useCallback((file: File) => URL.createObjectURL(file), []);
  const revokePreviewUrl = useCallback((url: string) => URL.revokeObjectURL(url), []);

  const updateLocaleField = useCallback((locale: SupportedLang, field: keyof BlogPostFormLocaleValues, value: string) => {
    setTranslations((current) => ({
      ...current,
      [locale]: { ...(current[locale] ?? createEmptyLocaleValues()), [field]: value },
    }));
  }, []);

  const handleToolbarAction = useCallback((action: BlogToolbarAction) => {
    const textarea = bodyRefs.current[effectiveActiveLocale];
    if (!textarea) return;

    const selection = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
    const currentBody = (translations[effectiveActiveLocale] ?? createEmptyLocaleValues()).body;

    if (action === 'h2' || action === 'h3') {
      insertMarkdownHeading(currentBody, selection.start, selection.end, action === 'h2' ? 2 : 3);
    }

    const nextState = applyBlogToolbarAction(currentBody, selection, action);
    updateLocaleField(effectiveActiveLocale, 'body', nextState.markdown);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextState.selection.start, nextState.selection.end);
    });
  }, [effectiveActiveLocale, translations, updateLocaleField]);

  const handleFeaturedImageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    setFeaturedImageState((currentState) => {
      const clearedState = clearBlogImagePreviewState(currentState, revokePreviewUrl);
      if (!nextFile) return clearedState;
      return createBlogImagePreviewState(nextFile, createPreviewUrl);
    });
    if (nextFile) setRemoveImage(false);
  }, [createPreviewUrl, revokePreviewUrl]);

  const clearFeaturedImage = useCallback(() => {
    setFeaturedImageState((currentState) => clearBlogImagePreviewState(currentState, revokePreviewUrl));
  }, [revokePreviewUrl]);

  const handleRemoveCurrentImage = useCallback(() => {
    setRemoveImage(true);
    setFeaturedImageState((currentState) => clearBlogImagePreviewState(currentState, revokePreviewUrl));
  }, [revokePreviewUrl]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessPath('');
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const path = await store.createBlogPost({
          slug,
          date,
          translations: buildTranslationsPayload(translations),
          featuredImage: featuredImageState.file,
        });
        setSuccessPath(path);
        setTranslations(createInitialTranslationsMap(visibleLocales));
        setDate(getDefaultDate());
        setFeaturedImageState((currentState) => clearBlogImagePreviewState(currentState, revokePreviewUrl));
        setRemoveImage(false);
      } else {
        const path = await store.updateBlogPost({
          slug,
          date,
          translations: buildTranslationsPayload(translations),
          featuredImage: featuredImageState.file,
          currentImage: initialPost?.image,
          removeImage,
        });
        setSuccessPath(path);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : (mode === 'edit' ? 'No se pudo actualizar la entrada.' : 'No se pudo crear la entrada.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentImage = mode === 'edit' ? initialPost?.image : undefined;
  const showCurrentImage = Boolean(currentImage) && !removeImage && !featuredImageState.previewUrl;

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6 border border-black/10 bg-paper p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="blog-date">Fecha</label>
          <input id="blog-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="blog-slug">Slug</label>
          <input id="blog-slug" value={slug} readOnly={mode === 'edit'} className={`${inputClass} text-warm-gray`} />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-featured-image">Imagen destacada</label>
          <input id="blog-featured-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFeaturedImageChange} className={inputClass} />
          <p className="mt-2 text-xs text-warm-gray">JPEG, PNG, WebP o GIF · máx. 2 MB · se sube antes de los archivos Markdown.</p>
        </div>

        {featuredImageState.previewUrl && (
          <div className="md:col-span-2 border border-black/10 p-4" data-blog-image-preview>
            <img src={featuredImageState.previewUrl} alt="Vista previa de la imagen destacada" className="aspect-[16/10] w-full object-cover" />
            <div className="mt-3 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-warm-gray">
              <span>{featuredImageState.file?.name}</span>
              <button type="button" onClick={clearFeaturedImage} className={toolbarButtonClass}>Quitar imagen</button>
            </div>
          </div>
        )}

        {showCurrentImage && currentImage && (
          <div className="md:col-span-2 border border-black/10 p-4" data-blog-image-preview>
            <img src={currentImage} alt="Imagen destacada actual" className="aspect-[16/10] w-full object-cover" />
            <div className="mt-3 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-warm-gray">
              <span>Imagen actual</span>
              <button type="button" onClick={handleRemoveCurrentImage} className={toolbarButtonClass}>Eliminar imagen</button>
            </div>
          </div>
        )}

        {removeImage && !featuredImageState.previewUrl && (
          <p className="md:col-span-2 text-xs text-amaranth">Se eliminará la imagen actual al guardar. <button type="button" onClick={() => setRemoveImage(false)} className="underline">Deshacer</button></p>
        )}

        <div className="md:col-span-2 space-y-4">
          <div role="tablist" aria-label="Idiomas de la traducción" className="flex flex-wrap gap-1">
            {visibleLocales.map((locale) => (
              <button
                key={locale}
                type="button"
                role="tab"
                id={`admin-blog-tab-${locale}`}
                aria-selected={effectiveActiveLocale === locale}
                aria-controls={`admin-blog-panel-${locale}`}
                onClick={() => setActiveLocale(locale)}
                className={tabButtonClass(effectiveActiveLocale === locale)}
              >
                {locale.toUpperCase()} · {LOCALE_NATIVE_LABELS[locale]}
              </button>
            ))}
          </div>

          {visibleLocales.map((locale) => {
            const values = translations[locale] ?? createEmptyLocaleValues();
            const isActive = effectiveActiveLocale === locale;

            return (
              <div
                key={locale}
                role="tabpanel"
                id={`admin-blog-panel-${locale}`}
                aria-labelledby={`admin-blog-tab-${locale}`}
                className={isActive ? 'space-y-6 border border-black/10 p-5' : 'hidden'}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelClass} htmlFor={`blog-title-${locale}`}>Título</label>
                    <input
                      id={`blog-title-${locale}`}
                      required
                      value={values.title}
                      onChange={(event) => updateLocaleField(locale, 'title', event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass} htmlFor={`blog-description-${locale}`}>Descripción</label>
                    <textarea
                      id={`blog-description-${locale}`}
                      required
                      value={values.description}
                      onChange={(event) => updateLocaleField(locale, 'description', event.target.value)}
                      className={`${inputClass} min-h-28`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass} htmlFor={`blog-tags-${locale}`}>Etiquetas (separadas por comas)</label>
                    <input
                      id={`blog-tags-${locale}`}
                      required
                      value={values.tags}
                      onChange={(event) => updateLocaleField(locale, 'tags', event.target.value)}
                      className={inputClass}
                      placeholder="ugc, seo, translation"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="flex flex-wrap gap-2 border-b border-black/10 pb-3">
                      <button type="button" onClick={() => handleToolbarAction('h2')} className={toolbarButtonClass}>Sección H2</button>
                      <button type="button" onClick={() => handleToolbarAction('h3')} className={toolbarButtonClass}>Subsección H3</button>
                      <button type="button" onClick={() => handleToolbarAction('bold')} className={toolbarButtonClass}>Negrita</button>
                      <button type="button" onClick={() => handleToolbarAction('link')} className={toolbarButtonClass}>Enlace</button>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                      <div>
                        <label className={labelClass} htmlFor={`blog-body-${locale}`}>Cuerpo en Markdown</label>
                        <textarea
                          id={`blog-body-${locale}`}
                          required
                          ref={(element) => { bodyRefs.current[locale] = element; }}
                          value={values.body}
                          onChange={(event) => updateLocaleField(locale, 'body', event.target.value)}
                          className={`${inputClass} min-h-[22rem] font-mono text-xs`}
                        />
                      </div>

                      {isActive && (
                        <aside className="border border-black/10 p-4">
                          <p className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent-ink">Índice en vivo</p>
                          {outline.length > 0 ? (
                            <ol className="mt-4 space-y-3">
                              {outline.map((section) => (
                                <li key={section.id} className="space-y-2">
                                  <div className="font-body text-sm text-ink">
                                    <span className="mr-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent-ink">{section.number}</span>
                                    {section.text}
                                  </div>
                                  {section.children.length > 0 && (
                                    <ol className="space-y-2 pl-4">
                                      {section.children.map((child) => (
                                        <li key={child.id} className="font-body text-sm text-warm-gray">
                                          <span className="mr-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent-ink">{child.number}</span>
                                          {child.text}
                                        </li>
                                      ))}
                                    </ol>
                                  )}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="mt-4 text-sm text-warm-gray">Añade encabezados H2 y H3 para construir el índice.</p>
                          )}
                        </aside>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="border border-amaranth px-4 py-3 text-sm text-amaranth">{error}</p>}
      {successPath && (
        <p className="border border-black px-4 py-3 text-sm text-ink">
          {mode === 'edit' ? `Se actualizó ${successPath}.` : `Se creó ${successPath}.`} Publica el sitio para reconstruir el blog.
        </p>
      )}

      <div className="flex flex-col gap-4 border-t border-black/10 pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-warm-gray">Las entradas se confirman mediante Netlify Git Gateway.</p>
        <button type="submit" disabled={isSubmitting} className="border border-black bg-black px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-paper transition hover:border-amaranth hover:bg-amaranth hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
          {mode === 'edit'
            ? (isSubmitting ? 'Guardando…' : 'Guardar cambios')
            : (isSubmitting ? 'Creando…' : 'Crear entrada')}
        </button>
      </div>
    </form>
  );
}
