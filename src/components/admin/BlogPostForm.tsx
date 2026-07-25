import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAdminStore } from './useAdminStore';

type LangOption = 'es' | 'en' | 'fr' | 'de' | 'it' | 'ca';

const inputClass = 'w-full rounded-2xl border border-blush-100 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold focus:ring-2 focus:ring-blush-100';
const labelClass = 'mb-2 block text-sm font-medium text-warm-gray';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState('');
  const [lang, setLang] = useState<LangOption>((store.currentLang as LangOption) || 'es');
  const [body, setBody] = useState('# Nuevo post\n\nEscribe aquí...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successPath, setSuccessPath] = useState('');

  const slug = useMemo(() => slugify(title), [title]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessPath('');

    if (!title.trim() || !description.trim() || !body.trim()) {
      setError('Complete title, description, and body before publishing.');
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
      });
      setSuccessPath(path);
      setTitle('');
      setDescription('');
      setTags('');
      setBody('# Nuevo post\n\nEscribe aquí...');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create the post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6 rounded-[2rem] border border-blush-100 bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-title">Title</label>
          <input id="blog-title" value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-description">Description</label>
          <textarea id="blog-description" value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} min-h-28`} />
        </div>

        <div>
          <label className={labelClass} htmlFor="blog-date">Date</label>
          <input id="blog-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="blog-language">Language</label>
          <select id="blog-language" value={lang} onChange={(event) => setLang(event.target.value as LangOption)} className={inputClass}>
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="ca">Català</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-tags">Tags (comma separated)</label>
          <input id="blog-tags" value={tags} onChange={(event) => setTags(event.target.value)} className={inputClass} placeholder="ugc, seo, translation" />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-slug">Slug</label>
          <input id="blog-slug" value={slug} readOnly className={`${inputClass} bg-blush-50 text-warm-gray`} />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="blog-body">Markdown body</label>
          <textarea id="blog-body" value={body} onChange={(event) => setBody(event.target.value)} className={`${inputClass} min-h-[20rem] font-mono text-xs`} />
        </div>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {successPath && <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">Created {successPath}. Publish the site to rebuild the blog.</p>}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-warm-gray">Posts are committed through Netlify Git Gateway.</p>
        <button type="submit" disabled={isSubmitting} className="rounded-full bg-rose-gold px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {isSubmitting ? 'Creating...' : 'Create post'}
        </button>
      </div>
    </form>
  );
}
