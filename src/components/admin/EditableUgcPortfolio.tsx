import EditableMedia from './EditableMedia';
import { useAdminStore } from './useAdminStore';

const EDITABLE_LANGS = ['es', 'en', 'fr'] as const;

const LOCALIZED_FIELDS = [
  { key: 'label', label: 'Label', rows: 1 },
  { key: 'title', label: 'Title', rows: 1 },
  { key: 'description', label: 'Description', rows: 3 },
  { key: 'format', label: 'Format', rows: 1 },
  { key: 'alt', label: 'Alt', rows: 3 },
] as const;

export default function EditableUgcPortfolio() {
  const store = useAdminStore();
  const items = store.getUgcPortfolio();

  return (
    <div className="space-y-6">
      <div className="space-y-2 border border-ink/10 bg-paper p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amaranth">UGC portfolio editor</p>
        <p className="max-w-3xl text-sm leading-6 text-ink/68">
          Twelve fixed slots keep the approved contact-sheet order. Edit ES / EN / FR copy here; Spanish updates also fill DE / IT / CA until those locales are revised in code.
        </p>
      </div>

      <div className="space-y-5">
        {items.map((item, index) => {
          const errors = store.getUgcPortfolioItemValidationErrors(item.id);

          return (
            <article key={item.id} className="space-y-5 border border-ink/10 bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
                <div>
                  <p className="text-xl text-ink">{item.id}</p>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink/52">
                    Slot {index + 1} of {items.length}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-ink">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink/52">Category</span>
                    <select
                      value={item.category}
                      onChange={(event) => store.updateUgcPortfolioField(item.id, 'category', event.target.value)}
                      className="border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                    >
                      <option value="travel">Travel</option>
                      <option value="languages">Languages</option>
                      <option value="art">Art</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-ink">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink/52">Type</span>
                    <select
                      value={item.type}
                      onChange={(event) => store.updateUgcPortfolioField(item.id, 'type', event.target.value)}
                      className="border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditableMedia
                      src={item.src}
                      mediaType={item.type}
                      acceptKind={item.type}
                      alt={item.alt.es}
                      label={item.type === 'video' ? '🎬 Change video' : '📷 Change image'}
                      emptyLabel={item.type === 'video' ? 'Upload MP4 / WebM / MOV' : 'Upload JPG / PNG / WebP / GIF'}
                      className="aspect-square border border-ink/10 bg-paper"
                      poster={item.poster}
                      onSelect={async (file) => {
                        await store.setUgcPortfolioMedia(item.id, file);
                      }}
                    />

                    <div className="space-y-3">
                      <div className="rounded-sm border border-ink/10 bg-paper px-4 py-3 text-sm leading-6 text-ink/68">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amaranth">Fixed slot</p>
                        <p>The slot stays in place even when the public filter hides it.</p>
                      </div>

                      {item.type === 'video' ? (
                        <EditableMedia
                          src={item.poster ?? ''}
                          mediaType="image"
                          acceptKind="image"
                          alt={`${item.alt.es} poster`}
                          label="🖼 Change poster"
                          emptyLabel="Poster required"
                          className="aspect-[4/5] border border-ink/10 bg-paper"
                          onSelect={async (file) => {
                            await store.setUgcPortfolioPoster(item.id, file);
                          }}
                        />
                      ) : (
                        <div className="rounded-sm border border-dashed border-ink/10 bg-paper px-4 py-3 text-sm leading-6 text-ink/52">
                          Poster upload appears only when the slot type is video.
                        </div>
                      )}
                    </div>
                  </div>

                  {errors.length > 0 ? (
                    <div className="space-y-1 border border-amaranth/24 bg-paper px-4 py-3 text-sm text-amaranth">
                      {errors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-5">
                  {LOCALIZED_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amaranth">
                        {field.label}
                      </p>
                      <div className="grid gap-4 md:grid-cols-3">
                        {EDITABLE_LANGS.map((lang) => {
                          const value = item[field.key][lang];

                          return (
                            <label key={`${item.id}-${field.key}-${lang}`} className="flex flex-col gap-2 text-sm text-ink">
                              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink/52">
                                {lang.toUpperCase()}
                              </span>
                              {field.key === 'description' ? (
                                <textarea
                                  value={value}
                                  rows={field.rows}
                                  onChange={(event) => store.updateUgcPortfolioField(item.id, 'description', event.target.value, lang)}
                                  className="min-h-28 border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                                />
                              ) : field.key === 'alt' ? (
                                <textarea
                                  value={value}
                                  rows={field.rows}
                                  onChange={(event) => store.updateUgcPortfolioField(item.id, 'alt', event.target.value, lang)}
                                  className="min-h-28 border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                                />
                              ) : field.key === 'label' ? (
                                <input
                                  value={value}
                                  onChange={(event) => store.updateUgcPortfolioField(item.id, 'label', event.target.value, lang)}
                                  className="border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                                />
                              ) : field.key === 'title' ? (
                                <input
                                  value={value}
                                  onChange={(event) => store.updateUgcPortfolioField(item.id, 'title', event.target.value, lang)}
                                  className="border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                                />
                              ) : field.key === 'format' ? (
                                <input
                                  value={value}
                                  onChange={(event) => store.updateUgcPortfolioField(item.id, 'format', event.target.value, lang)}
                                  className="border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                                />
                              ) : (
                                <input
                                  value={value}
                                  onChange={(event) => store.updateUgcPortfolioField(item.id, 'title', event.target.value, lang)}
                                  className="border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                                />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
