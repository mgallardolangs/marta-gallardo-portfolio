import { useRef } from 'react';
import { validateOrbitMediaUpload } from '../../lib/orbitMedia';
import { validateToolLogoUpload } from '../../lib/adminCollections.ts';
import { toEmbedUrl } from '../../lib/videoEmbed';

interface Props {
  src: string;
  mediaType: 'image' | 'video';
  acceptKind: 'image' | 'video' | 'tool-logo';
  onSelect: (file: File) => Promise<void> | void;
  onPasteEmbed?: (value: string) => void;
  className?: string;
  alt?: string;
  label?: string;
  emptyLabel?: string;
  poster?: string | null;
}

function getAcceptAttribute(kind: Props['acceptKind']) {
  if (kind === 'video') {
    return 'video/mp4,video/webm,video/quicktime';
  }

  if (kind === 'tool-logo') {
    return 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml';
  }

  return 'image/jpeg,image/png,image/webp,image/gif';
}

function getValidationError(file: File, kind: Props['acceptKind']) {
  if (kind === 'tool-logo') {
    return validateToolLogoUpload(file);
  }

  return validateOrbitMediaUpload(file, kind);
}

export default function EditableMedia({
  src,
  mediaType,
  acceptKind,
  onSelect,
  onPasteEmbed,
  className = '',
  alt = '',
  label = '📷 Cambiar contenido',
  emptyLabel = '📷',
  poster = null,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const openFilePicker = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setTimeout(() => fileRef.current?.click(), 10);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = getValidationError(file, acceptKind);
    if (error) {
      alert(error);
      event.target.value = '';
      return;
    }

    try {
      await onSelect(file);
    } catch (selectionError) {
      alert(selectionError instanceof Error ? selectionError.message : 'No se pudo guardar este archivo multimedia.');
    } finally {
      event.target.value = '';
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (mediaType !== 'video' || !onPasteEmbed) return;
    const pastedValue = event.clipboardData.getData('text/plain').trim();
    if (!toEmbedUrl(pastedValue)) return;
    event.preventDefault();
    onPasteEmbed(pastedValue);
  };

  return (
    <div
      className={`group/media relative overflow-hidden bg-paper ${className}`}
      style={{ cursor: 'pointer', minHeight: '3rem' }}
      onPaste={handlePaste}
    >
      {src ? (
        mediaType === 'video' ? (
          <video
            src={src}
            poster={poster ?? undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        )
      ) : (
        <div className="flex h-full w-full min-h-[3rem] items-center justify-center bg-paper/80 px-3 text-center text-sm text-amaranth">
          {emptyLabel}
        </div>
      )}

      <div
        className="absolute inset-0 z-10 flex items-center justify-center bg-ink/55 opacity-0 transition-opacity group-hover/media:opacity-100"
        onClick={openFilePicker}
      >
        <span className="pointer-events-none border border-amaranth/20 bg-paper px-4 py-2 text-sm font-medium text-ink shadow-[0_18px_40px_rgb(6_4_3_/_0.24)]">
          {label}
        </span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={getAcceptAttribute(acceptKind)}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
