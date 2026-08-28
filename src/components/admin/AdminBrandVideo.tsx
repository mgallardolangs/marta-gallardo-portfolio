import EditableMedia from './EditableMedia';
import { useAdminStore } from './useAdminStore';
import { toEmbedUrl } from '../../lib/videoEmbed';

export default function AdminBrandVideo() {
  const store = useAdminStore();
  const src = store.getImageSrc('brandVideo');
  const embedRaw = store.getImageSrc('brandVideoEmbedUrl');
  const embedUrl = toEmbedUrl(embedRaw);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title="Vídeo de marca"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <EditableMedia
            src={src}
            mediaType="video"
            acceptKind="video"
            alt="Vídeo de marca"
            label="🎬 Cambiar vídeo"
            emptyLabel="Sube un MP4/WebM/MOV"
            className="absolute inset-0 h-full w-full"
            onSelect={async (file) => {
              const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
              await store.setImage('brandVideo', file, `public/images/site/brand-video.${extension}`);
            }}
          />
        )}
      </div>

      <div className="pointer-events-auto space-y-2 bg-ink/85 p-3 text-left">
        <label
          className="block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-paper"
          htmlFor="brand-video-embed-url"
        >
          Enlace de YouTube o Vimeo (para vídeos grandes en alta calidad)
        </label>
        <input
          id="brand-video-embed-url"
          type="url"
          value={embedRaw}
          placeholder="https://vimeo.com/… o https://youtu.be/…"
          onChange={(event) => store.setBrandVideoEmbedUrl(event.target.value)}
          className="w-full border border-white/20 bg-paper px-2 py-1 text-xs text-ink"
        />
        {embedRaw && !embedUrl ? (
          <p className="text-[0.65rem] text-amaranth">Pega un enlace válido de YouTube o Vimeo.</p>
        ) : embedUrl ? (
          <button
            type="button"
            onClick={() => store.setBrandVideoEmbedUrl('')}
            className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-paper underline"
          >
            Quitar enlace y usar archivo subido
          </button>
        ) : (
          <p className="text-[0.65rem] text-white/60">
            Sin enlace se usa el archivo subido (MP4/WebM/MOV, máximo 8 MB).
          </p>
        )}
      </div>
    </div>
  );
}
