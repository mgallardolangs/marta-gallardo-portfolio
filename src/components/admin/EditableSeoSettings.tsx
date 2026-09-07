import { SUPPORTED_LANGS } from './adminStore';
import { useAdminStore } from './useAdminStore';

const SEO_PAGE_KEYS = ['home', 'translationSeo', 'ugc', 'contact'] as const;
const SEO_FIELDS = ['title', 'description'] as const;

function getSeoInputId(page: string, field: string, locale: string) {
  return `admin-seo-${page}-${field}-${locale}`;
}

export default function EditableSeoSettings() {
  const store = useAdminStore();

  return (
    <div className="space-y-4" data-admin-seo-settings>
      <div className="space-y-1">
        <h2 className="font-heading text-2xl text-ink md:text-3xl">SEO localizable</h2>
        <p className="max-w-3xl font-body text-sm leading-6 text-ink-muted">
          Edita los metadatos guardados en <code>src/data/site.json</code>. Los títulos usan un campo de una línea y las descripciones admiten texto largo por idioma.
        </p>
      </div>

      <div className="space-y-4">
        {SEO_PAGE_KEYS.map((page) => (
          <fieldset key={page} className="border border-ink/10 bg-white p-4 md:p-5" data-admin-seo-page={page}>
            <legend className="px-2 font-body text-xs font-semibold uppercase tracking-[0.28em] text-amaranth">
              {page}
            </legend>

            <div className="space-y-5">
              {SEO_FIELDS.map((field) => (
                <div key={field} className="space-y-3" data-admin-seo-field={field}>
                  <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ink">
                    {field}
                  </p>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {SUPPORTED_LANGS.map((locale) => (
                      <label
                        key={locale}
                        htmlFor={getSeoInputId(page, field, locale)}
                        className="flex flex-col gap-2 border border-ink/10 bg-paper/60 p-3"
                      >
                        <span className="font-body text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                          {locale}
                        </span>

                        {field === 'title' ? (
                          <input
                            id={getSeoInputId(page, field, locale)}
                            type="text"
                            value={store.getSeoText(page, field, locale)}
                            onChange={(event) => store.setSeoText(page, field, locale, event.target.value)}
                            onBlur={() => store.normalizeSeoText(page, field, locale)}
                            className="rounded-none border border-ink/15 bg-white px-3 py-2 font-body text-sm text-ink outline-none transition focus:border-amaranth"
                          />
                        ) : (
                          <textarea
                            id={getSeoInputId(page, field, locale)}
                            value={store.getSeoText(page, field, locale)}
                            onChange={(event) => store.setSeoText(page, field, locale, event.target.value)}
                            onBlur={() => store.normalizeSeoText(page, field, locale)}
                            rows={4}
                            className="min-h-28 rounded-none border border-ink/15 bg-white px-3 py-2 font-body text-sm text-ink outline-none transition focus:border-amaranth"
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
