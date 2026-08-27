import { useCallback, useState } from 'react';
import type { SupportedLang } from './adminStore';
import { useAdminStore } from './useAdminStore';

export type AdminBlogListLocaleSummary = {
  title: string;
  tags: string[];
};

export type AdminBlogListGroup = {
  translationKey: string;
  slug: string;
  date: string;
  image?: string;
  position: string;
  locales: Partial<Record<SupportedLang, AdminBlogListLocaleSummary>>;
};

interface Props {
  initialGroupsJson: string;
}

function getPrimaryLocaleSummary(group: AdminBlogListGroup): AdminBlogListLocaleSummary | null {
  return group.locales.es ?? Object.values(group.locales)[0] ?? null;
}

export default function AdminBlogList({ initialGroupsJson }: Props) {
  const store = useAdminStore();
  const [posts, setPosts] = useState<AdminBlogListGroup[]>(() => JSON.parse(initialGroupsJson) as AdminBlogListGroup[]);
  const [pendingKey, setPendingKey] = useState('');
  const [error, setError] = useState<Record<string, string>>({});
  const [notices, setNotices] = useState<string[]>([]);

  const handleDelete = useCallback(async (group: AdminBlogListGroup) => {
    if (pendingKey) return;

    const confirmed = window.confirm('¿Seguro que quieres eliminar esta entrada de blog en todos los idiomas? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    const lockedKey = group.translationKey;
    setPendingKey(lockedKey);
    setError((current) => ({ ...current, [lockedKey]: '' }));

    try {
      const result = await store.deleteBlogPost({
        slug: group.slug,
        translationKey: group.translationKey,
        image: group.image || undefined,
      });

      if (result.status === 'post-deleted' || result.status === 'image-cleanup-failed') {
        setPosts((current) => current.filter((item) => item.translationKey !== group.translationKey));
        if (result.status === 'image-cleanup-failed') {
          setNotices((current) => [...current, result.message]);
        }
      } else {
        setError((current) => ({ ...current, [group.translationKey]: result.message }));
      }
    } catch (deleteError) {
      setError((current) => ({
        ...current,
        [group.translationKey]: deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la entrada.',
      }));
    } finally {
      setPendingKey((current) => (current === lockedKey ? '' : current));
    }
  }, [store, pendingKey]);

  if (posts.length === 0) {
    return <p className="border-b border-black/10 py-6 font-body text-sm text-ink-muted">No hay posts todavía.</p>;
  }

  return (
    <div className="border-t border-black/10">
      {notices.length > 0 && (
        <div className="space-y-2 border-b border-black/10 py-4">
          {notices.map((notice) => (
            <p key={notice} className="font-body text-sm text-amaranth">{notice}</p>
          ))}
        </div>
      )}

      {posts.map((group) => {
        const primary = getPrimaryLocaleSummary(group);
        const availableLocales = Object.keys(group.locales) as SupportedLang[];
        const rowError = error[group.translationKey];
        const isDeleting = pendingKey === group.translationKey;

        return (
          <article key={group.translationKey} className="grid gap-4 border-b border-black/10 py-5 md:grid-cols-[auto_140px_minmax(0,1fr)_auto_auto] md:items-start md:gap-6">
            <p className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">{group.position}</p>
            <p className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-accent-ink">
              {availableLocales.map((locale) => locale.toUpperCase()).join(' · ')}
            </p>
            <div className="space-y-2">
              <h2 className="font-heading text-2xl leading-tight text-ink">{primary?.title ?? group.slug}</h2>
              <div className="flex flex-wrap items-center gap-3 font-body text-[0.72rem] uppercase tracking-[0.18em] text-ink-muted">
                <span>Publicado</span>
                {(primary?.tags ?? []).map((tag) => (
                  <span key={tag} className="text-accent-ink">{tag}</span>
                ))}
              </div>
              {rowError && <p className="font-body text-xs text-amaranth">{rowError}</p>}
            </div>
            <time className="font-body text-[0.72rem] uppercase tracking-[0.18em] text-ink-muted">
              {group.date ? new Date(group.date).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
            </time>
            <div className="flex items-center gap-4 font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em]">
              <a href={`/admin/blog/edit/${group.translationKey}`} className="border-b border-black/10 pb-1 text-ink transition hover:border-amaranth hover:text-amaranth">Editar</a>
              {isDeleting ? (
                <span className="text-ink-faint">Eliminando…</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleDelete(group)}
                  disabled={pendingKey !== ''}
                  className="border-b border-black/10 pb-1 text-ink transition hover:border-amaranth hover:text-amaranth disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
