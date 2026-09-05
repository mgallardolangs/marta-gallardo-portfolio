import EditableMedia from './EditableMedia';
import EditableVideoEmbed, { VIDEO_EMBED_LABEL } from './EditableVideoEmbed';
import { useAdminStore } from './useAdminStore';

const EDITABLE_LANGS = ['es', 'en', 'fr'] as const;

const LOCALIZED_FIELDS = [
  { key: 'label', label: 'Etiqueta', rows: 1 },
  { key: 'title', label: 'Título', rows: 1 },
  { key: 'description', label: 'Descripción', rows: 3 },
  { key: 'format', label: 'Formato', rows: 1 },
  { key: 'alt', label: 'Alt', rows: 3 },
] as const;

export default function EditableUgcPortfolio() {
  const store = useAdminStore();
  const items = store.getUgcPortfolio();

  return (
    <div className="space-y-6">
      <div className="space-y-2 border border-ink/10 bg-paper p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amaranth">Editor del portfolio UGC</p>
        <p className="max-w-3xl text-sm leading-6 text-ink/68">
          Doce espacios fijos mantienen el orden aprobado del contact sheet. Edita aquí el contenido en ES / EN / FR; las actualizaciones en español también rellenan DE / IT / CA hasta que esos idiomas se revisen en el código.
        </p>
      </div>

      <div className="space-y-5">
        {items.map((item, index) => {
          return (
            <article key={item.id} className="space-y-5 border border-ink/10 bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
                <div>
                  <p className="text-xl text-ink">{item.id}</p>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink/52">
                    Espacio {index + 1} de {items.length}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-ink">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink/52">Categoría</span>
                    <select
                      value={item.category}
                      onChange={(event) => store.updateUgcPortfolioField(item.id, 'category', event.target.value)}
                      className="border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                    >
                      <option value="travel">Viajes</option>
                      <option value="languages">Idiomas</option>
                      <option value="art">Arte</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-ink">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink/52">Tipo</span>
                    <select
                      value={item.type}
                      onChange={(event) => store.updateUgcPortfolioField(item.id, 'type', event.target.value)}
                      className="border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
                    >
                      <option value="image">Imagen</option>
                      <option value="video">Vídeo</option>
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
                      label={item.type === 'video' ? '🎬 Cambiar vídeo' : '📷 Cambiar imagen'}
                      emptyLabel={item.type === 'video' ? 'Sube un MP4 / WebM / MOV' : 'Sube un JPG / PNG / WebP / GIF'}
                      className="aspect-square border border-ink/10 bg-paper"
                      poster={item.poster}
                      onPasteEmbed={item.type === 'video'
                        ? (value) => store.setUgcPortfolioEmbedUrl(item.id, value)
                        : undefined}
                      onSelect={async (file) => {
                        await store.setUgcPortfolioMedia(item.id, file);
                      }}
                    />

                    <div className="space-y-3">
                      <div className="rounded-sm border border-ink/10 bg-paper px-4 py-3 text-sm leading-6 text-ink/68">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amaranth">Espacio fijo</p>
                        <p>El espacio se mantiene en su lugar aunque el filtro público lo oculte.</p>
                      </div>

                      {item.type === 'video' ? (
                        <div className="space-y-3">
                          <EditableVideoEmbed
                            value={item.embedUrl}
                            label={VIDEO_EMBED_LABEL}
                            onChange={(value) => store.setUgcPortfolioEmbedUrl(item.id, value)}
                          />
                          <EditableMedia
                            src={item.poster ?? ''}
                            mediaType="image"
                            acceptKind="image"
                            alt={`${item.alt.es} póster`}
                            label="🖼 Cambiar póster"
                            emptyLabel="Póster obligatorio"
                            className="aspect-[4/5] border border-ink/10 bg-paper"
                            onSelect={async (file) => {
                              await store.setUgcPortfolioPoster(item.id, file);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => store.clearUgcPortfolioPoster(item.id)}
                            className="inline-flex items-center justify-center border border-ink/12 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink transition hover:border-amaranth hover:text-amaranth"
                          >
                            Quitar póster
                          </button>
                        </div>
                      ) : item.poster ? (
                        <div className="space-y-3">
                          <div className="rounded-sm border border-amaranth/24 bg-paper px-4 py-3 text-sm leading-6 text-amaranth">
                            Este espacio de imagen todavía tiene un póster obsoleto de un vídeo anterior. Quítalo para terminar el estado de imagen.
                          </div>
                          <button
                            type="button"
                            onClick={() => store.clearUgcPortfolioPoster(item.id)}
                            className="inline-flex items-center justify-center border border-ink/12 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink transition hover:border-amaranth hover:text-amaranth"
                          >
                            Quitar póster
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-sm border border-dashed border-ink/10 bg-paper px-4 py-3 text-sm leading-6 text-ink/52">
                          La opción de subir póster solo aparece cuando el espacio es de tipo vídeo.
                        </div>
                      )}
                    </div>
                  </div>

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
