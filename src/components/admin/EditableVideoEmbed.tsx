import { toEmbedUrl } from '../../lib/videoEmbed';

type EditableVideoEmbedProps = {
  value: string | null | undefined;
  onChange: (value: string) => void;
  label?: string;
};

const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

export default function EditableVideoEmbed({
  value,
  onChange,
  label = 'Enlace o código para incrustar',
}: EditableVideoEmbedProps) {
  const embedUrl = toEmbedUrl(value);
  const hasValue = Boolean(value?.trim());

  return (
    <div className="space-y-2 border border-ink/10 bg-paper p-3">
      <label className="flex flex-col gap-2 text-sm text-ink">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ink/52">{label}</span>
        <input
          type="text"
          value={value ?? ''}
          placeholder="Pega el enlace del vídeo o el código <iframe>"
          onChange={(event) => onChange(event.target.value)}
          className="w-full border border-ink/10 bg-paper px-3 py-2 text-sm text-ink"
        />
      </label>

      {embedUrl ? (
        <div className="space-y-2">
          <div className="aspect-video overflow-hidden border border-ink/10 bg-ink/5">
            <iframe
              src={embedUrl}
              title="Vista previa del vídeo incrustado"
              loading="lazy"
              allow={IFRAME_ALLOW}
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink underline"
          >
            Quitar enlace y usar archivo subido
          </button>
        </div>
      ) : hasValue ? (
        <p className="text-[0.65rem] text-amaranth">Pega un enlace válido (http o https) o un código para incrustar.</p>
      ) : (
        <p className="text-[0.65rem] text-ink/52">Sin enlace se usa el archivo subido (MP4/WebM/MOV).</p>
      )}
    </div>
  );
}
