import { useMemo, useState } from 'react';

import {
  EDITABLE_COLLECTION_LOCALES,
  validateToolLogoUpload,
  type EditableCollectionKind,
} from '../../lib/adminCollections.ts';
import type { LanguageItem, SkillItem, ToolItem } from '../../lib/siteData.ts';
import EditableMedia from './EditableMedia';
import { useAdminStore } from './useAdminStore';

type Props = {
  kind: EditableCollectionKind;
  title: string;
  description: string;
};

type LocaleFieldState = Record<(typeof EDITABLE_COLLECTION_LOCALES)[number], string>;

function createEmptyFields() {
  return { es: '', en: '', fr: '' };
}

export default function EditableCollection({ kind, title, description }: Props) {
  const store = useAdminStore();
  const items = store.getEditableCollection(kind) as Array<LanguageItem | ToolItem | SkillItem>;
  const [isAdding, setIsAdding] = useState(false);
  const [labelFields, setLabelFields] = useState<LocaleFieldState>(createEmptyFields);
  const [levelFields, setLevelFields] = useState<LocaleFieldState>(createEmptyFields);
  const [toolFile, setToolFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const buttonLabel = useMemo(() => {
    if (kind === 'languages') return 'Add language';
    if (kind === 'tools') return 'Add tool';
    return 'Add skill';
  }, [kind]);

  const resetForm = () => {
    setLabelFields(createEmptyFields());
    setLevelFields(createEmptyFields());
    setToolFile(null);
    setError('');
    setIsAdding(false);
  };

  const addItem = async () => {
    if (!labelFields.es.trim() || !labelFields.en.trim() || !labelFields.fr.trim()) {
      setError('Complete ES/EN/FR values before adding this item.');
      return;
    }

    if (kind === 'languages' && (!levelFields.es.trim() || !levelFields.en.trim() || !levelFields.fr.trim())) {
      setError('Complete ES/EN/FR levels before adding this language.');
      return;
    }

    if (kind === 'tools' && !toolFile) {
      setError('Select a logo before adding this tool.');
      return;
    }

    if (kind === 'tools' && toolFile) {
      const toolLogoError = validateToolLogoUpload(toolFile);
      if (toolLogoError) {
        setError(toolLogoError);
        return;
      }
    }

    try {
      const nextIndex = store.addEditableCollectionItem(
        kind,
        kind === 'languages'
          ? { label: labelFields, level: levelFields }
          : kind === 'tools'
            ? { label: labelFields, logo: '' }
            : { label: labelFields },
      );

      if (kind === 'tools' && toolFile && nextIndex >= 0) {
        await store.setEditableToolLogo(nextIndex, toolFile);
      }

      resetForm();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Could not add this item.');
    }
  };

  return (
    <section className="space-y-5 border border-black/10 bg-white p-6 shadow-[0_18px_48px_rgba(6,4,3,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h3 className="font-heading text-3xl text-ink">{title}</h3>
          <p className="max-w-3xl text-sm leading-6 text-ink-muted">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding((current) => !current)}
          className="inline-flex items-center gap-2 border border-black/10 bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-paper transition hover:bg-amaranth hover:text-ink"
        >
          {buttonLabel}
        </button>
      </div>

      {isAdding && (
        <div className="grid gap-4 border border-black/10 bg-paper p-4 lg:grid-cols-3">
          {EDITABLE_COLLECTION_LOCALES.map((locale) => (
            <label key={`${kind}-${locale}-label`} className="flex flex-col gap-2 text-sm text-ink">
              <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">
                Label {locale.toUpperCase()}
              </span>
              <input
                value={labelFields[locale]}
                onChange={(event) => setLabelFields((current) => ({ ...current, [locale]: event.target.value }))}
                className="border border-black/10 bg-white px-3 py-2 text-sm text-ink"
              />
            </label>
          ))}

          {kind === 'languages' && EDITABLE_COLLECTION_LOCALES.map((locale) => (
            <label key={`${kind}-${locale}-level`} className="flex flex-col gap-2 text-sm text-ink">
              <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">
                Level {locale.toUpperCase()}
              </span>
              <input
                value={levelFields[locale]}
                onChange={(event) => setLevelFields((current) => ({ ...current, [locale]: event.target.value }))}
                className="border border-black/10 bg-white px-3 py-2 text-sm text-ink"
              />
            </label>
          ))}

          {kind === 'tools' && (
            <label className="flex flex-col gap-2 text-sm text-ink lg:col-span-3">
              <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">Logo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={(event) => setToolFile(event.target.files?.[0] ?? null)}
                className="border border-black/10 bg-white px-3 py-2 text-sm text-ink"
              />
            </label>
          )}

          <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
            <button
              type="button"
              onClick={() => void addItem()}
              className="inline-flex items-center gap-2 border border-black/10 bg-amaranth px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-ink transition hover:bg-ink hover:text-paper"
            >
              Save item
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-ink transition"
            >
              Cancel
            </button>
            {error && <p className="text-sm text-amaranth">{error}</p>}
          </div>
        </div>
      )}

      <div className={`grid gap-5 ${kind === 'skills' ? 'md:grid-cols-2 xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
        {items.map((item, index) => (
          <article key={item.id} className="space-y-4 border border-black/10 bg-paper p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-heading text-xl text-ink">{item.id}</p>
                <p className="text-xs uppercase tracking-[0.24em] text-ink-faint">
                  {kind.slice(0, -1)} {index + 1} of {items.length}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => store.moveEditableCollectionItem(kind, index, -1)}
                  disabled={index === 0}
                  className="border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↑ Move
                </button>
                <button
                  type="button"
                  onClick={() => store.moveEditableCollectionItem(kind, index, 1)}
                  disabled={index === items.length - 1}
                  className="border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↓ Move
                </button>
                <button
                  type="button"
                  onClick={() => store.removeEditableCollectionItem(kind, index)}
                  className="border border-amaranth/30 bg-paper px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amaranth transition hover:bg-amaranth hover:text-ink"
                >
                  Remove
                </button>
              </div>
            </div>

            {kind === 'tools' && (
              <EditableMedia
                src={(item as ToolItem).logo}
                mediaType="image"
                acceptKind="tool-logo"
                alt={(item as ToolItem).label[store.currentLang] ?? (item as ToolItem).label.es}
                label="🖼 Change logo"
                emptyLabel="Upload logo"
                className="aspect-[3/2] border border-black/10"
                onSelect={async (file) => {
                  await store.setEditableToolLogo(index, file);
                }}
              />
            )}

            <div className="grid gap-4 md:grid-cols-3">
              {EDITABLE_COLLECTION_LOCALES.map((locale) => (
                <label key={`${item.id}-${locale}-label`} className="flex flex-col gap-2 text-sm text-ink">
                  <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">
                    Label {locale.toUpperCase()}
                  </span>
                  <input
                    value={item.label[locale]}
                    onChange={(event) => store.updateEditableCollectionText(kind, index, 'label', locale, event.target.value)}
                    className="border border-black/10 bg-white px-3 py-2 text-sm text-ink"
                  />
                </label>
              ))}
            </div>

            {kind === 'languages' && (
              <div className="grid gap-4 md:grid-cols-3">
                {EDITABLE_COLLECTION_LOCALES.map((locale) => (
                  <label key={`${item.id}-${locale}-level`} className="flex flex-col gap-2 text-sm text-ink">
                    <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">
                      Level {locale.toUpperCase()}
                    </span>
                    <input
                      value={(item as LanguageItem).level[locale]}
                      onChange={(event) => store.updateEditableCollectionText(kind, index, 'level', locale, event.target.value)}
                      className="border border-black/10 bg-white px-3 py-2 text-sm text-ink"
                    />
                  </label>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
