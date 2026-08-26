import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { parseMarkdownOutline, insertMarkdownHeading } from '../../lib/blogOutline.ts';
import {
  applyBlogToolbarAction,
  clearBlogImagePreviewState,
  createBlogImagePreviewState,
  type BlogImagePreviewState,
  type BlogToolbarAction,
} from '../../lib/blogPostFormState.ts';
import { ADMIN_BLOG_LANGS, isAdminBlogLang, type AdminBlogLang } from './adminStore';
import { useAdminStore } from './useAdminStore';

const inputClass = 'w-full border border-black/10 bg-paper px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amaranth';
const labelClass = 'mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-warm-gray';
const toolbarButtonClass = 'border border-black/10 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink transition hover:border-amaranth hover:text-amaranth';
const blogLanguageLabels: Record<AdminBlogLang, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
};
const emptyFeaturedImageState: BlogImagePreviewState = { file: null, previewUrl: '' };

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BlogPostForm() {
  const store = useAdminStore();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState('');
  const [lang, setLang] = useState<AdminBlogLang>(() => (isAdminBlogLang(store.currentLang) ? store.currentLang : 'es'));
  const [body, setBody] = useState('# Nuevo post\n\nEscribe aquí...');
  const [featuredImageState, setFeaturedImageState] = useState<BlogImagePreviewState>(emptyFeaturedImageState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successPath, setSuccessPath] = useState('');

  const slug = useMemo(() => slugify(title), [title]);
  const outline = useMemo(() => parseMarkdownOutline(body), [body]);

  const createPreviewUrl = useCallback((file: File) => URL.createObjectURL(file), []);
  const revokePreviewUrl = useCallback((url: string) => URL.revokeObjectURL(url), []);

  useEffect(() => () => {
    clearBlogImagePreviewState(featuredImageState, revokePreviewUrl);
  }, [featuredImageState, revokePreviewUrl]);

  const handleToolbarAction = useCallback((action: BlogToolbarAction) => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const selection = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };

    if (action === 'h2' || action === 'h3') {
      insertMarkdownHeading(body, selection.start, selection.end, action === 'h2' ? 2 : 3);
    }

    const nextState = applyBlogToolbarAction(body, selection, action);
    setBody(nextState.markdown);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextState.selection.start, nextState.selection.end);
    });
  }, [body]);

  const handleFeaturedImageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    setFeaturedImageState((currentState) => {
      const clearedState = clearBlogImagePreviewState(currentState, revokePreviewUrl);
      if (!nextFile) return clearedState;
      return createBlogImagePreviewState(nextFile, createPreviewUrl);
    });
  }, [createPreviewUrl, revokePreviewUrl]);

  const clearFeaturedImage = useCallback(() => {
    setFeaturedImageState((currentState) => clearBlogImagePreviewState(currentState, revokePreviewUrl));
  }, [revokePreviewUrl]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessPath('');

    if (!title.trim() || !description.trim() || !body.trim()) {
      setError('Completa el título, la descripción y el cuerpo antes de publicar.');
      return;
    }

    if (!isAdminBlogLang(lang)) {
      setError('Las entradas de blog solo se pueden crear en ES, EN o FR.');
      return;
    }

    setIsSubmitting(true);
    try {
      const path = await store.createBlogPost({
        slug,
        title: title.trim(),
        description: description.trim(),
        date,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        lang,
        body,
        featuredImage: featuredImageState.file,
      });
      setSuccessPath(path);
      setTitle('');
      setDescription('');
      setTags('');
      setBody('# Nuevo post\n\nEscribe aquí...');
      setFeaturedImageState((currentState) => clearBlogImagePreviewState(currentState, revokePreviewUrl));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la entrada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6 border border-black/10 bg-paper p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-title">Título</label>
          <input id="blog-title" value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-description">Descripción</label>
          <textarea id="blog-description" value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} min-h-28`} />
        </div>

        <div>
          <label className={labelClass} htmlFor="blog-date">Fecha</label>
          <input id="blog-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="blog-language">Idioma</label>
          <select
            id="blog-language"
            value={lang}
            onChange={(event) => {
              const nextLang = event.target.value;
              if (isAdminBlogLang(nextLang)) {
                setLang(nextLang);
              }
            }}
            className={inputClass}
          >
            {ADMIN_BLOG_LANGS.map((locale) => (
              <option key={locale} value={locale}>{blogLanguageLabels[locale]}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-tags">Etiquetas (separadas por comas)</label>
          <input id="blog-tags" value={tags} onChange={(event) => setTags(event.target.value)} className={inputClass} placeholder="ugc, seo, translation" />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-slug">Slug</label>
          <input id="blog-slug" value={slug} readOnly className={`${inputClass} text-warm-gray`} />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-featured-image">Imagen destacada</label>
          <input id="blog-featured-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFeaturedImageChange} className={inputClass} />
          <p className="mt-2 text-xs text-warm-gray">JPEG, PNG, WebP o GIF · máx. 2 MB · se sube antes del archivo Markdown.</p>
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

        <div className="md:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-black/10 pb-3">
            <button type="button" onClick={() => handleToolbarAction('h2')} className={toolbarButtonClass}>Sección H2</button>
            <button type="button" onClick={() => handleToolbarAction('h3')} className={toolbarButtonClass}>Subsección H3</button>
            <button type="button" onClick={() => handleToolbarAction('bold')} className={toolbarButtonClass}>Negrita</button>
            <button type="button" onClick={() => handleToolbarAction('link')} className={toolbarButtonClass}>Enlace</button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <label className={labelClass} htmlFor="blog-body">Cuerpo en Markdown</label>
              <textarea
                id="blog-body"
                ref={bodyRef}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className={`${inputClass} min-h-[22rem] font-mono text-xs`}
              />
            </div>

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
          </div>
        </div>
      </div>

      {error && <p className="border border-amaranth px-4 py-3 text-sm text-amaranth">{error}</p>}
      {successPath && <p className="border border-black px-4 py-3 text-sm text-ink">Se creó {successPath}. Publica el sitio para reconstruir el blog.</p>}

      <div className="flex flex-col gap-4 border-t border-black/10 pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-warm-gray">Las entradas se confirman mediante Netlify Git Gateway.</p>
        <button type="submit" disabled={isSubmitting} className="border border-black bg-black px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-paper transition hover:border-amaranth hover:bg-amaranth hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
          {isSubmitting ? 'Creando…' : 'Crear entrada'}
        </button>
      </div>
    </form>
  );
}
