import { useState } from 'react';

import { EDITABLE_COLLECTION_LOCALES, type EditableCollectionLocale } from '../../lib/adminCollections.ts';
import EditableText from './EditableText';
import { useAdminStore } from './useAdminStore';

type LocaleFieldValues = Record<EditableCollectionLocale, string>;

const EXPERIENCE_BROWSER_TABS = ['education', 'experience'] as const;
type ExperienceBrowserTabId = (typeof EXPERIENCE_BROWSER_TABS)[number];

function createEmptyLocaleFields(): LocaleFieldValues {
  return { es: '', en: '', fr: '' };
}

function LocaleTextFields({
  idPrefix,
  legend,
  values,
  onChange,
  multiline = false,
}: {
  idPrefix: string;
  legend: string;
  values: LocaleFieldValues;
  onChange: (locale: EditableCollectionLocale, value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {EDITABLE_COLLECTION_LOCALES.map((locale) => (
        <label key={`${idPrefix}-${locale}`} className="flex flex-col gap-1 text-xs text-paper">
          <span className="font-body text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-paper/55">
            {legend} {locale.toUpperCase()}
          </span>
          {multiline ? (
            <textarea
              required
              rows={3}
              value={values[locale]}
              onChange={(event) => onChange(locale, event.target.value)}
              className="border border-paper/20 bg-paper/10 px-2 py-1.5 text-sm text-paper"
            />
          ) : (
            <input
              required
              value={values[locale]}
              onChange={(event) => onChange(locale, event.target.value)}
              className="border border-paper/20 bg-paper/10 px-2 py-1.5 text-sm text-paper"
            />
          )}
        </label>
      ))}
    </div>
  );
}

export default function AdminTranslationExperienceEditor() {
  const store = useAdminStore();
  const [activeTab, setActiveTab] = useState<ExperienceBrowserTabId>('education');

  const [studyFields, setStudyFields] = useState<LocaleFieldValues>(createEmptyLocaleFields);
  const [studyError, setStudyError] = useState('');

  const [cardHighlightFields, setCardHighlightFields] = useState<LocaleFieldValues>(createEmptyLocaleFields);
  const [cardTitleFields, setCardTitleFields] = useState<LocaleFieldValues>(createEmptyLocaleFields);
  const [cardTextFields, setCardTextFields] = useState<LocaleFieldValues>(createEmptyLocaleFields);
  const [cardError, setCardError] = useState('');

  const studies = store.getEducationStudies();
  const cards = store.getExperienceCards();

  const resetStudyForm = () => {
    setStudyFields(createEmptyLocaleFields());
    setStudyError('');
  };

  const submitStudy = () => {
    try {
      store.addEducationStudy(studyFields);
      resetStudyForm();
    } catch (error) {
      setStudyError(error instanceof Error ? error.message : 'No se pudo añadir el nuevo estudio.');
    }
  };

  const resetCardForm = () => {
    setCardHighlightFields(createEmptyLocaleFields());
    setCardTitleFields(createEmptyLocaleFields());
    setCardTextFields(createEmptyLocaleFields());
    setCardError('');
  };

  const submitCard = () => {
    try {
      store.addExperienceCard({
        highlight: cardHighlightFields,
        title: cardTitleFields,
        text: cardTextFields,
      });
      resetCardForm();
    } catch (error) {
      setCardError(error instanceof Error ? error.message : 'No se pudo añadir la nueva experiencia.');
    }
  };

  return (
    <section className="border border-ink bg-ink text-paper" data-admin-experience-browser>
      <div className="border-b border-paper/16 bg-paper/8 px-4 pt-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-amaranth" aria-hidden="true"></span>
            <div role="tablist" aria-label={store.getText('translationPage.browserTabsAriaLabel')} className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                role="tab"
                id="admin-experience-tab-education"
                aria-selected={activeTab === 'education'}
                aria-controls="admin-experience-panel-education"
                data-admin-experience-trigger="education"
                onClick={() => setActiveTab('education')}
                className={`rounded-t-[7px] border border-b-0 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] transition ${activeTab === 'education' ? 'border-paper bg-paper text-ink' : 'border-paper/18 bg-paper/14 text-paper/62 hover:bg-paper/18 hover:text-paper focus-visible:bg-paper/18 focus-visible:text-paper'}`}
              >
                {store.getText('translationPage.browserTabs.education')}
              </button>
              <button
                type="button"
                role="tab"
                id="admin-experience-tab-experience"
                aria-selected={activeTab === 'experience'}
                aria-controls="admin-experience-panel-experience"
                data-admin-experience-trigger="experience"
                onClick={() => setActiveTab('experience')}
                className={`rounded-t-[7px] border border-b-0 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] transition ${activeTab === 'experience' ? 'border-paper bg-paper text-ink' : 'border-paper/18 bg-paper/14 text-paper/62 hover:bg-paper/18 hover:text-paper focus-visible:bg-paper/18 focus-visible:text-paper'}`}
              >
                {store.getText('translationPage.browserTabs.experience')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 md:px-6 md:py-8">
        <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr]">
          <div className="space-y-5 border-b border-paper/16 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <EditableText i18nKey="translationPage.experienceStatement" as="p" className="font-heading text-3xl leading-[0.96] text-paper md:text-4xl" />
          </div>

          <div className="space-y-8">
            <div
              id="admin-experience-panel-education"
              role="tabpanel"
              aria-labelledby="admin-experience-tab-education"
              data-admin-experience-panel="education"
              className={activeTab === 'education' ? 'space-y-5' : 'hidden space-y-5'}
            >
              <EditableText i18nKey="translationPage.education.intro" as="div" className="text-base leading-8 text-paper/68" />
              <div className="space-y-4">
                {studies.map((_study, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="mt-3 h-2 w-2 rounded-full bg-amaranth" />
                    <EditableText i18nKey={`translationPage.education.studies.${index}`} as="span" className="text-base leading-8 text-paper" />
                  </div>
                ))}
              </div>

              <div className="space-y-3 border border-dashed border-paper/30 bg-paper/5 p-4" data-add-education-study>
                <p className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-paper/60">Añadir estudio</p>
                <LocaleTextFields
                  idPrefix="add-study"
                  legend="Estudio"
                  values={studyFields}
                  onChange={(locale, value) => setStudyFields((current) => ({ ...current, [locale]: value }))}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={submitStudy}
                    className="border border-ink/10 bg-amaranth px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-paper hover:text-ink"
                  >
                    Añadir estudio
                  </button>
                  <button
                    type="button"
                    onClick={resetStudyForm}
                    className="border border-paper/25 bg-transparent px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-paper"
                  >
                    Cancelar
                  </button>
                </div>
                {studyError && (
                  <p role="alert" className="text-xs text-amaranth">
                    {studyError}
                  </p>
                )}
              </div>
            </div>

            <div
              id="admin-experience-panel-experience"
              role="tabpanel"
              aria-labelledby="admin-experience-tab-experience"
              data-admin-experience-panel="experience"
              className={activeTab === 'experience' ? 'space-y-8' : 'hidden space-y-8'}
            >
              <EditableText i18nKey="translationPage.experience.intro" as="div" className="text-base leading-8 text-paper/68" />
              <div className="grid grid-cols-1 gap-px bg-paper/16 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((_card, index) => (
                  <article key={index} className="bg-ink px-5 py-6">
                    <EditableText i18nKey={`translationPage.experience.cards.${index}.highlight`} as="p" className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-amaranth" />
                    <EditableText i18nKey={`translationPage.experience.cards.${index}.title`} as="h3" className="mt-4 font-heading text-2xl text-paper" />
                    <EditableText i18nKey={`translationPage.experience.cards.${index}.text`} as="div" className="mt-4 text-sm leading-7 text-paper/72" />
                  </article>
                ))}
              </div>

              <div className="space-y-4 border border-dashed border-paper/30 bg-paper/5 p-4" data-add-experience-card>
                <p className="font-body text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-paper/60">Añadir experiencia</p>
                <LocaleTextFields
                  idPrefix="add-card-highlight"
                  legend="Cliente"
                  values={cardHighlightFields}
                  onChange={(locale, value) => setCardHighlightFields((current) => ({ ...current, [locale]: value }))}
                />
                <LocaleTextFields
                  idPrefix="add-card-title"
                  legend="Rol"
                  values={cardTitleFields}
                  onChange={(locale, value) => setCardTitleFields((current) => ({ ...current, [locale]: value }))}
                />
                <LocaleTextFields
                  idPrefix="add-card-text"
                  legend="Resumen"
                  values={cardTextFields}
                  onChange={(locale, value) => setCardTextFields((current) => ({ ...current, [locale]: value }))}
                  multiline
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={submitCard}
                    className="border border-ink/10 bg-amaranth px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-paper hover:text-ink"
                  >
                    Añadir experiencia
                  </button>
                  <button
                    type="button"
                    onClick={resetCardForm}
                    className="border border-paper/25 bg-transparent px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-paper"
                  >
                    Cancelar
                  </button>
                </div>
                {cardError && (
                  <p role="alert" className="text-xs text-amaranth">
                    {cardError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
