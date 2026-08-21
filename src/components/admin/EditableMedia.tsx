import { useRef } from 'react';
import { validateOrbitMediaUpload } from '../../lib/orbitMedia';
import { validateToolLogoUpload } from '../../lib/adminCollections.ts';

interface Props {
  src: string;
  mediaType: 'image' | 'video';
  acceptKind: 'image' | 'video' | 'tool-logo';
  onSelect: (file: File) => Promise<void> | void;
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
  className = '',
  alt = '',
  label = '📷 Change media',
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
      alert(selectionError instanceof Error ? selectionError.message : 'Could not save this media file.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className={`group/media relative overflow-hidden bg-white ${className}`} style={{ cursor: 'pointer', minHeight: '3rem' }}>
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
        <div className="flex h-full w-full items-center justify-center bg-pink-50 text-center text-sm text-pink-300 min-h-[3rem] px-3">
          {emptyLabel}
        </div>
      )}

      <div
        className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover/media:opacity-100"
        onClick={openFilePicker}
      >
        <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-lg pointer-events-none">
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
