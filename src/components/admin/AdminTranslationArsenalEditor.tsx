import { useMemo, useRef, useState } from 'react';

import {
  EDITABLE_COLLECTION_LOCALES,
  resolveSkillReorderIndices,
  validateToolLogoUpload,
  type EditableCollectionKind,
  type EditableCollectionLocale,
} from '../../lib/adminCollections.ts';
import { localize } from '../../lib/siteData.ts';
import type { LanguageItem, SkillGroup, SkillItem, ToolItem } from '../../lib/siteData.ts';
import { useAdminStore } from './useAdminStore';

type LocaleFieldState = Record<EditableCollectionLocale, string>;
type AddTarget = 'languages' | 'tools' | SkillGroup;
type ItemEditorTarget = { kind: EditableCollectionKind; id: string };
type DragSource = { kind: EditableCollectionKind; index: number };

function createEmptyFields(): LocaleFieldState {
  return { es: '', en: '', fr: '' };
}

function SkillGroupSelect({ value, onChange }: { value: SkillGroup; onChange: (group: SkillGroup) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as SkillGroup)}
      className="border border-ink/15 bg-white px-2 py-1.5 text-xs text-ink"
      data-item-editor-field="group"
    >
      <option value="translation">translation — Traducción / localización</option>
      <option value="seo">seo — SEO / contenido</option>
    </select>
  );
}

function LocaleLabelFields({
  idPrefix,
  values,
  onChange,
  legend,
}: {
  idPrefix: string;
  values: LocaleFieldState;
  onChange: (locale: EditableCollectionLocale, value: string) => void;
  legend: string;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {EDITABLE_COLLECTION_LOCALES.map((locale) => (
        <label key={`${idPrefix}-${locale}`} className="flex flex-col gap-1 text-xs text-ink">
          <span className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {legend} {locale.toUpperCase()}
          </span>
          <input
            value={values[locale]}
            onChange={(event) => onChange(locale, event.target.value)}
            className="border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink"
          />
        </label>
      ))}
    </div>
  );
}

export default function AdminTranslationArsenalEditor() {
  const store = useAdminStore();
  const languages = store.getEditableCollection('languages') as LanguageItem[];
  const tools = store.getEditableCollection('tools') as ToolItem[];
  const skills = store.getEditableCollection('skills') as SkillItem[];

  const [editingItem, setEditingItem] = useState<ItemEditorTarget | null>(null);
  const [activeAdd, setActiveAdd] = useState<AddTarget | null>(null);
  const [addLabelFields, setAddLabelFields] = useState<LocaleFieldState>(createEmptyFields);
  const [addLevelFields, setAddLevelFields] = useState<LocaleFieldState>(createEmptyFields);
  const [addToolFile, setAddToolFile] = useState<File | null>(null);
  const [selectedToolFileName, setSelectedToolFileName] = useState('');
  const [addError, setAddError] = useState('');
  const [itemError, setItemError] = useState('');
  const dragSourceRef = useRef<DragSource | null>(null);

  const groupedSkills = useMemo(() => ({
    translation: skills
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.group === 'translation'),
    seo: skills
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.group === 'seo'),
  }), [skills]);

  const titles = {
    languages: store.getText('translationPage.arsenal.languagesTitle'),
    tools: store.getText('translationPage.arsenal.toolsTitle'),
    skills: store.getText('translationPage.arsenal.skillsTitle'),
    translation: store.getText('translationPage.skillGroups.translation'),
    seo: store.getText('translationPage.skillGroups.seo'),
  };

  const resetAddForm = () => {
    setAddLabelFields(createEmptyFields());
    setAddLevelFields(createEmptyFields());
    setAddToolFile(null);
    setSelectedToolFileName('');
    setAddError('');
    setActiveAdd(null);
  };

  const openAdd = (target: AddTarget) => {
    setEditingItem(null);
    setActiveAdd(target);
    setAddError('');
    setSelectedToolFileName('');
  };

  const openItemEditor = (kind: EditableCollectionKind, id: string) => {
    setActiveAdd(null);
    setItemError('');
    setSelectedToolFileName('');
    setEditingItem({ kind, id });
  };

  const closeItemEditor = () => {
    setItemError('');
    setEditingItem(null);
  };

  const submitAdd = async () => {
    if (!activeAdd) return;
    const kind: EditableCollectionKind = activeAdd === 'languages' || activeAdd === 'tools' ? activeAdd : 'skills';

    if (!addLabelFields.es.trim() || !addLabelFields.en.trim() || !addLabelFields.fr.trim()) {
      setAddError('Completa los valores en ES/EN/FR antes de añadir este elemento.');
      return;
    }

    if (kind === 'languages' && (!addLevelFields.es.trim() || !addLevelFields.en.trim() || !addLevelFields.fr.trim())) {
      setAddError('Completa los niveles en ES/EN/FR antes de añadir este idioma.');
      return;
    }

    if (kind === 'tools' && !addToolFile) {
      setAddError('Selecciona un logo antes de añadir esta herramienta.');
      return;
    }

    if (kind === 'tools' && addToolFile) {
      const toolLogoError = validateToolLogoUpload(addToolFile);
      if (toolLogoError) {
        setAddError(toolLogoError);
        return;
      }
    }

    try {
      const nextIndex = store.addEditableCollectionItem(
        kind,
        kind === 'languages'
          ? { label: addLabelFields, level: addLevelFields }
          : kind === 'tools'
            ? { label: addLabelFields, logo: '' }
            : { group: activeAdd as SkillGroup, label: addLabelFields },
      );

      if (kind === 'tools' && addToolFile && nextIndex >= 0) {
        await store.setEditableToolLogo(nextIndex, addToolFile);
      }

      resetAddForm();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'No se pudo añadir este elemento.');
    }
  };

  const handleDragStart = (event: React.DragEvent, kind: EditableCollectionKind, index: number) => {
    dragSourceRef.current = { kind, index };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${kind}:${index}`);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    dragSourceRef.current = null;
  };

  const handleDrop = (event: React.DragEvent, kind: EditableCollectionKind, targetIndex: number) => {
    event.preventDefault();
    const source = dragSourceRef.current;
    dragSourceRef.current = null;
    if (!source || source.kind !== kind) return;

    if (kind === 'skills') {
      const resolved = resolveSkillReorderIndices(skills, source.index, targetIndex);
      if (!resolved) return;
      store.reorderEditableCollectionItem('skills', resolved.fromIndex, resolved.targetIndex);
      return;
    }

    store.reorderEditableCollectionItem(kind, source.index, targetIndex);
  };

  const renderAddComposer = () => {
    if (!activeAdd) return null;
    const isLanguage = activeAdd === 'languages';
    const isTool = activeAdd === 'tools';

    return (
      <div className="mt-3 space-y-3 border border-dashed border-ink/30 bg-paper/70 p-4" data-add-composer={activeAdd}>
        <LocaleLabelFields idPrefix={`add-${activeAdd}`} legend="Etiqueta" values={addLabelFields} onChange={(locale, value) => setAddLabelFields((current) => ({ ...current, [locale]: value }))} />

        {isLanguage && (
          <LocaleLabelFields idPrefix="add-language-level" legend="Nivel" values={addLevelFields} onChange={(locale, value) => setAddLevelFields((current) => ({ ...current, [locale]: value }))} />
        )}

        {isTool && (
          <label className="flex flex-col gap-1 text-xs text-ink">
            <span className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">Logo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setAddToolFile(file);
                setSelectedToolFileName(file?.name ?? '');
              }}
              className="border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink"
            />
            <span data-selected-file-name className="text-xs text-ink-faint">
              {addToolFile?.name ?? 'Seleccionar archivo'}
            </span>
          </label>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void submitAdd()}
            className="border border-ink/10 bg-amaranth px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-paper"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={resetAddForm}
            className="border border-ink/10 bg-white px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink"
          >
            Cancelar
          </button>
          {addError && <p className="text-xs text-amaranth">{addError}</p>}
        </div>
      </div>
    );
  };

  const renderLanguageItemEditor = () => {
    if (editingItem?.kind !== 'languages') return null;
    const index = languages.findIndex((item) => item.id === editingItem.id);
    const item = languages[index];
    if (!item) return null;

    return (
      <div className="mt-3 space-y-3 border border-dashed border-ink/30 bg-paper/70 p-4" data-item-editor="languages">
        <LocaleLabelFields
          idPrefix={`edit-language-${item.id}`}
          legend="Etiqueta"
          values={{ es: item.label.es, en: item.label.en, fr: item.label.fr }}
          onChange={(locale, value) => store.updateEditableCollectionText('languages', index, 'label', locale, value)}
        />
        <LocaleLabelFields
          idPrefix={`edit-language-level-${item.id}`}
          legend="Nivel"
          values={{ es: item.level.es, en: item.level.en, fr: item.level.fr }}
          onChange={(locale, value) => store.updateEditableCollectionText('languages', index, 'level', locale, value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-move-item="up" disabled={index === 0} onClick={() => store.moveEditableCollectionItem('languages', index, -1)} className="border border-ink/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink disabled:cursor-not-allowed disabled:opacity-40">↑ Subir</button>
          <button type="button" data-move-item="down" disabled={index === languages.length - 1} onClick={() => store.moveEditableCollectionItem('languages', index, 1)} className="border border-ink/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink disabled:cursor-not-allowed disabled:opacity-40">↓ Bajar</button>
          <button type="button" onClick={closeItemEditor} className="border border-ink/10 bg-white px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink">Hecho</button>
          <button
            type="button"
            data-remove-item
            onClick={() => { store.removeEditableCollectionItem('languages', index); closeItemEditor(); }}
            className="border border-amaranth/30 bg-paper px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amaranth transition hover:bg-amaranth hover:text-ink"
          >
            Quitar
          </button>
        </div>
      </div>
    );
  };

  const renderToolItemEditor = () => {
    if (editingItem?.kind !== 'tools') return null;
    const index = tools.findIndex((item) => item.id === editingItem.id);
    const item = tools[index];
    if (!item) return null;

    return (
      <div className="mt-3 space-y-3 border border-dashed border-ink/30 bg-paper/70 p-4" data-item-editor="tools">
        <LocaleLabelFields
          idPrefix={`edit-tool-${item.id}`}
          legend="Etiqueta"
          values={{ es: item.label.es, en: item.label.en, fr: item.label.fr }}
          onChange={(locale, value) => store.updateEditableCollectionText('tools', index, 'label', locale, value)}
        />
        <label className="flex flex-col gap-1 text-xs text-ink">
          <span className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">Cambiar logo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setSelectedToolFileName(file.name);
              setItemError('');
              try {
                await store.setEditableToolLogo(index, file);
              } catch (error) {
                setItemError(error instanceof Error ? error.message : 'No se pudo cambiar este logo.');
              }
            }}
            className="border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink"
          />
          <span data-selected-file-name className="text-xs text-ink-faint">
            {selectedToolFileName || 'Seleccionar archivo'}
          </span>
        </label>
        {itemError && (
          <p role="alert" data-item-editor-error className="text-xs text-amaranth">
            {itemError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-move-item="up" disabled={index === 0} onClick={() => store.moveEditableCollectionItem('tools', index, -1)} className="border border-ink/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink disabled:cursor-not-allowed disabled:opacity-40">↑ Subir</button>
          <button type="button" data-move-item="down" disabled={index === tools.length - 1} onClick={() => store.moveEditableCollectionItem('tools', index, 1)} className="border border-ink/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink disabled:cursor-not-allowed disabled:opacity-40">↓ Bajar</button>
          <button type="button" onClick={closeItemEditor} className="border border-ink/10 bg-white px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink">Hecho</button>
          <button
            type="button"
            data-remove-item
            onClick={() => { store.removeEditableCollectionItem('tools', index); closeItemEditor(); }}
            className="border border-amaranth/30 bg-paper px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amaranth transition hover:bg-amaranth hover:text-ink"
          >
            Quitar
          </button>
        </div>
      </div>
    );
  };

  const renderSkillItemEditor = (group: SkillGroup) => {
    if (editingItem?.kind !== 'skills') return null;
    const index = skills.findIndex((skillItem) => skillItem.id === editingItem.id);
    const item = skills[index];
    if (!item || item.group !== group) return null;
    const position = groupedSkills[group].findIndex((entry) => entry.item.id === item.id);

    return (
      <div className="mt-3 space-y-3 border border-dashed border-ink/30 bg-paper/70 p-4" data-item-editor="skills">
        <label className="flex flex-col gap-1 text-xs text-ink">
          <span className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">Grupo</span>
          <SkillGroupSelect value={item.group} onChange={(nextGroup) => store.updateEditableCollectionSkillGroup(index, nextGroup)} />
        </label>
        <LocaleLabelFields
          idPrefix={`edit-skill-${item.id}`}
          legend="Etiqueta"
          values={{ es: item.label.es, en: item.label.en, fr: item.label.fr }}
          onChange={(locale, value) => store.updateEditableCollectionText('skills', index, 'label', locale, value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-move-item="up" disabled={position === 0} onClick={() => store.moveEditableCollectionItem('skills', index, -1)} className="border border-ink/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink disabled:cursor-not-allowed disabled:opacity-40">↑ Subir</button>
          <button type="button" data-move-item="down" disabled={position === groupedSkills[group].length - 1} onClick={() => store.moveEditableCollectionItem('skills', index, 1)} className="border border-ink/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink disabled:cursor-not-allowed disabled:opacity-40">↓ Bajar</button>
          <button type="button" onClick={closeItemEditor} className="border border-ink/10 bg-white px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink">Hecho</button>
          <button
            type="button"
            data-remove-item
            onClick={() => { store.removeEditableCollectionItem('skills', index); closeItemEditor(); }}
            className="border border-amaranth/30 bg-paper px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amaranth transition hover:bg-amaranth hover:text-ink"
          >
            Quitar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-ink" data-admin-arsenal-editor>
      <div className="grid gap-0 lg:grid-cols-3">
        <article className="border-b border-ink p-5 lg:border-b-0 lg:border-r" data-admin-arsenal-panel="languages">
          <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-amaranth">{titles.languages}</p>
          <span className="mt-4 block h-px bg-ink/12"></span>
          <div className="mt-5" data-arsenal-items>
            {languages.map((language, index) => (
              <div
                key={language.id}
                className="group relative flex items-center justify-between gap-4 border-b border-ink/10 py-3 last:border-b-0"
                data-arsenal-item
                data-language-row
                data-item-id={language.id}
                data-item-index={index}
                draggable
                onDragStart={(event) => handleDragStart(event, 'languages', index)}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, 'languages', index)}
                onDragEnd={handleDragEnd}
              >
                <p className="font-heading text-2xl text-ink">{localize(language.label, store.currentLang)}</p>
                <p className="text-sm font-medium text-amaranth">{localize(language.level, store.currentLang)}</p>

                <span data-drag-handle aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 pl-1 text-xs text-ink-faint opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">⠿</span>
                <button
                  type="button"
                  data-edit-item
                  onClick={() => openItemEditor('languages', language.id)}
                  aria-label={`Editar ${localize(language.label, store.currentLang)}`}
                  className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center bg-paper text-xs text-ink opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                >
                  ✎
                </button>
              </div>
            ))}
          </div>

          {renderLanguageItemEditor()}

          <button
            type="button"
            data-collection-add="languages"
            onClick={() => openAdd('languages')}
            className="mt-4 flex w-full items-center justify-center gap-2 border border-dashed border-ink/30 px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint transition hover:border-amaranth hover:text-amaranth"
          >
            + Añadir idioma
          </button>
          {activeAdd === 'languages' && renderAddComposer()}
        </article>

        <article className="border-b border-ink p-5 lg:border-b-0 lg:border-r" data-admin-arsenal-panel="tools">
          <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-amaranth">{titles.tools}</p>
          <span className="mt-4 block h-px bg-ink/12"></span>
          <div className="mt-5 grid grid-cols-3 gap-2" data-arsenal-items>
            {tools.map((tool, index) => (
              <div
                key={tool.id}
                className="group relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-3 bg-ink px-3 py-4 text-center text-paper transition hover:bg-amaranth hover:text-ink"
                data-arsenal-item
                data-tool-tile
                data-item-id={tool.id}
                data-item-index={index}
                draggable
                onDragStart={(event) => handleDragStart(event, 'tools', index)}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, 'tools', index)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex h-10 w-10 items-center justify-center">
                  <img
                    src={tool.logo}
                    alt=""
                    width={24}
                    height={24}
                    loading="lazy"
                    decoding="async"
                    className="h-6 max-h-[24px] w-6 max-w-[24px] object-contain"
                  />
                </div>
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-paper transition group-hover:text-ink">{localize(tool.label, store.currentLang)}</p>

                <span data-drag-handle aria-hidden="true" className="pointer-events-none absolute left-1 top-1 text-paper/70 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">⠿</span>
                <button
                  type="button"
                  data-edit-item
                  onClick={() => openItemEditor('tools', tool.id)}
                  aria-label={`Editar ${localize(tool.label, store.currentLang)}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-paper text-[0.65rem] text-ink opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                >
                  ✎
                </button>
              </div>
            ))}

            <button
              type="button"
              data-collection-add="tools"
              onClick={() => openAdd('tools')}
              className="flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-2 border border-dashed border-ink/30 px-3 py-4 text-center text-ink-faint transition hover:border-amaranth hover:text-amaranth"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em]">Añadir herramienta</span>
            </button>
          </div>

          {renderToolItemEditor()}
          {activeAdd === 'tools' && renderAddComposer()}
        </article>

        <article className="p-5" data-admin-arsenal-panel="skills">
          <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-amaranth">{titles.skills}</p>
          <span className="mt-4 block h-px bg-ink/12"></span>
          <div className="mt-5 grid gap-6 md:grid-cols-2" data-arsenal-items>
            <div className="space-y-3" data-skill-group="translation">
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink-muted">{titles.translation}</p>
              <div className="flex flex-col gap-2">
                {groupedSkills.translation.map(({ item, index }) => (
                  <span
                    key={item.id}
                    className="group relative border border-ink/12 px-3 py-2 text-[0.68rem] uppercase tracking-[0.08em] text-ink"
                    data-arsenal-item
                    data-skill-chip
                    data-skill-group="translation"
                    data-item-id={item.id}
                    data-item-index={index}
                    draggable
                    onDragStart={(event) => handleDragStart(event, 'skills', index)}
                    onDragOver={handleDragOver}
                    onDrop={(event) => handleDrop(event, 'skills', index)}
                    onDragEnd={handleDragEnd}
                  >
                    {localize(item.label, store.currentLang)}
                    <span data-drag-handle aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 pl-1 text-[0.6rem] text-ink-faint opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">⠿</span>
                    <button
                      type="button"
                      data-edit-item
                      onClick={() => openItemEditor('skills', item.id)}
                      aria-label={`Editar ${localize(item.label, store.currentLang)}`}
                      className="absolute inset-y-0 right-0 flex items-center bg-paper px-2 text-ink opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                    >
                      ✎
                    </button>
                  </span>
                ))}
                {renderSkillItemEditor('translation')}
                <button
                  type="button"
                  data-collection-add="skills-translation"
                  onClick={() => openAdd('translation')}
                  className="border border-dashed border-ink/25 px-3 py-2 text-left text-[0.68rem] uppercase tracking-[0.08em] text-ink-faint transition hover:border-amaranth hover:text-amaranth"
                >
                  + Añadir habilidad
                </button>
                {activeAdd === 'translation' && renderAddComposer()}
              </div>
            </div>

            <div className="space-y-3" data-skill-group="seo">
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink-muted">{titles.seo}</p>
              <div className="flex flex-col gap-2">
                {groupedSkills.seo.map(({ item, index }) => (
                  <span
                    key={item.id}
                    className="group relative border border-ink/12 px-3 py-2 text-[0.68rem] uppercase tracking-[0.08em] text-ink"
                    data-arsenal-item
                    data-skill-chip
                    data-skill-group="seo"
                    data-item-id={item.id}
                    data-item-index={index}
                    draggable
                    onDragStart={(event) => handleDragStart(event, 'skills', index)}
                    onDragOver={handleDragOver}
                    onDrop={(event) => handleDrop(event, 'skills', index)}
                    onDragEnd={handleDragEnd}
                  >
                    {localize(item.label, store.currentLang)}
                    <span data-drag-handle aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 pl-1 text-[0.6rem] text-ink-faint opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">⠿</span>
                    <button
                      type="button"
                      data-edit-item
                      onClick={() => openItemEditor('skills', item.id)}
                      aria-label={`Editar ${localize(item.label, store.currentLang)}`}
                      className="absolute inset-y-0 right-0 flex items-center bg-paper px-2 text-ink opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                    >
                      ✎
                    </button>
                  </span>
                ))}
                {renderSkillItemEditor('seo')}
                <button
                  type="button"
                  data-collection-add="skills-seo"
                  onClick={() => openAdd('seo')}
                  className="border border-dashed border-ink/25 px-3 py-2 text-left text-[0.68rem] uppercase tracking-[0.08em] text-ink-faint transition hover:border-amaranth hover:text-amaranth"
                >
                  + Añadir habilidad
                </button>
                {activeAdd === 'seo' && renderAddComposer()}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
