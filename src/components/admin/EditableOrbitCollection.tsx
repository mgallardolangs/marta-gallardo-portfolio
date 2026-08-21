import EditableMedia from './EditableMedia';
import { useAdminStore } from './useAdminStore';
import { buildOrbitUploadPath, getLocalizedOrbitText } from '../../lib/orbitMedia';

const EDITABLE_LANGS = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
] as const;

export default function EditableOrbitCollection() {
  const store = useAdminStore();
  const orbitMedia = store.getOrbitMedia();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border border-black/10 bg-white/70 p-5">
        <div className="space-y-2">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.32em] text-amaranth">Orbit collection</p>
          <p className="max-w-2xl text-sm leading-6 text-ink-muted">
            Edit ES/EN/FR copy here. DE/IT/CA stay code-managed; new entries inherit the Spanish value until those locales are updated in code.
          </p>
        </div>
        <button
          type="button"
          onClick={() => store.addOrbitMediaItem()}
          className="inline-flex items-center gap-2 border border-black/10 bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-paper transition hover:bg-amaranth"
        >
          Add orbit item
        </button>
      </div>

      <div className="space-y-5">
        {orbitMedia.map((item, index) => {
          const errors = store.getOrbitItemValidationErrors(item.id);
          const previewAlt = getLocalizedOrbitText(item.alt, store.currentLang);

          return (
            <article key={item.id} className="space-y-5 border border-black/10 bg-white p-5 shadow-[0_12px_32px_rgba(6,4,3,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-xl text-ink">{item.id}</p>
                  <p className="text-xs uppercase tracking-[0.24em] text-ink-faint">Item {index + 1} of {orbitMedia.length}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => store.moveOrbitMediaItem(index, -1)}
                    disabled={index === 0}
                    className="border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↑ Move
                  </button>
                  <button
                    type="button"
                    onClick={() => store.moveOrbitMediaItem(index, 1)}
                    disabled={index === orbitMedia.length - 1}
                    className="border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↓ Move
                  </button>
                  <button
                    type="button"
                    onClick={() => store.removeOrbitMediaItem(index)}
                    className="border border-amaranth/30 bg-amaranth-mist px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amaranth transition hover:bg-amaranth hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditableMedia
                      src={item.src}
                      mediaType={item.type}
                      acceptKind={item.type}
                      alt={previewAlt}
                      label={item.type === 'video' ? '🎬 Change video' : '📷 Change image'}
                      emptyLabel={item.type === 'video' ? 'Upload MP4/WebM/MOV' : 'Upload JPG/PNG/WebP/GIF'}
                      className="aspect-[96/122]"
                      poster={item.poster}
                      onSelect={async (file) => {
                        await store.setOrbitMediaFile(index, 'src', file, buildOrbitUploadPath(item.id, 'src', file));
                      }}
                    />

                    <div className="space-y-3">
                      <label className="flex flex-col gap-2 text-sm text-ink">
                        <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">Media type</span>
                        <select
                          value={item.type}
                          onChange={(event) => store.updateOrbitMediaType(index, event.target.value as 'image' | 'video')}
                          className="border border-black/10 bg-paper px-3 py-2 text-sm text-ink"
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </label>

                      <label className="flex flex-col gap-2 text-sm text-ink">
                        <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">Internal href</span>
                        <input
                          value={item.href ?? ''}
                          onChange={(event) => store.updateOrbitMediaHref(index, event.target.value)}
                          placeholder="/contact"
                          className="border border-black/10 bg-paper px-3 py-2 text-sm text-ink"
                        />
                      </label>
                    </div>
                  </div>

                  {item.type === 'video' && (
                    <div className="grid gap-4 sm:grid-cols-[7rem_1fr] sm:items-start">
                      <EditableMedia
                        src={item.poster ?? ''}
                        mediaType="image"
                        acceptKind="image"
                        alt={`${getLocalizedOrbitText(item.alt, 'es')} poster`}
                        label="🖼 Change poster"
                        emptyLabel="Poster required"
                        className="aspect-[4/5]"
                        onSelect={async (file) => {
                          await store.setOrbitMediaFile(index, 'poster', file, buildOrbitUploadPath(item.id, 'poster', file));
                        }}
                      />
                      <div className="space-y-2 rounded-sm border border-black/10 bg-paper p-3 text-sm leading-6 text-ink-muted">
                        <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">Video poster</p>
                        <p>Every orbit video needs a poster image for loading, reduced motion, and muted autoplay fallbacks.</p>
                      </div>
                    </div>
                  )}

                  {errors.length > 0 && (
                    <div className="border border-amaranth/30 bg-amaranth-mist px-4 py-3 text-sm text-amaranth">
                      {errors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    {EDITABLE_LANGS.map((language) => (
                      <label key={`${item.id}-label-${language.code}`} className="flex flex-col gap-2 text-sm text-ink">
                        <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">
                          Label {language.label}
                        </span>
                        <input
                          value={item.label[language.code]}
                          onChange={(event) => store.updateOrbitMediaText(index, 'label', language.code, event.target.value)}
                          className="border border-black/10 bg-paper px-3 py-2 text-sm text-ink"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {EDITABLE_LANGS.map((language) => (
                      <label key={`${item.id}-alt-${language.code}`} className="flex flex-col gap-2 text-sm text-ink">
                        <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink-faint">
                          Alt {language.label}
                        </span>
                        <textarea
                          value={item.alt[language.code]}
                          onChange={(event) => store.updateOrbitMediaText(index, 'alt', language.code, event.target.value)}
                          rows={4}
                          className="min-h-28 border border-black/10 bg-paper px-3 py-2 text-sm text-ink"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
