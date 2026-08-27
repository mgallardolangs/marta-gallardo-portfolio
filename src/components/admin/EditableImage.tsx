import { useEffect, useRef, useState } from 'react';
import { adminStore } from './adminStore';

interface Props {
  imageKey: string;
  className?: string;
  alt?: string;
  label?: string;
}

/*
 * EditableImage — direct store access (no useSyncExternalStore)
 * Same pattern as EditableText: bypass React rendering for reliability
 */
export default function EditableImage({ imageKey, className = '', alt = '', label = '📷 Cambiar imagen' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState('');

  // Get initial src + subscribe to store changes
  useEffect(() => {
    setSrc(adminStore.getImageSrc(imageKey));
    return adminStore.subscribe(() => {
      setSrc(adminStore.getImageSrc(imageKey));
    });
  }, [imageKey]);

  const openFilePicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Small delay ensures the click isn't swallowed
    setTimeout(() => fileRef.current?.click(), 10);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Usa formato JPG, PNG, WebP, GIF o SVG');
      return;
    }
    const ext = file.name.split('.').pop() || 'png';
    const safeName = imageKey.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const uploadPath = `public/images/site/${safeName}.${ext}`;
    await adminStore.setImage(imageKey, file, uploadPath);
    setSrc(adminStore.getImageSrc(imageKey));
    e.target.value = '';
  };

  return (
    <div className={`group/img relative overflow-hidden ${className}`} style={{ cursor: 'pointer', minHeight: '3rem' }}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full min-h-[3rem] items-center justify-center border border-dashed border-ink/10 bg-paper/80 text-2xl text-amaranth">
          📷
        </div>
      )}
      {/* Overlay button — always visible on hover */}
      <div
        className="absolute inset-0 z-40 flex items-center justify-center bg-ink/55 opacity-0 transition-opacity group-hover/img:opacity-100 group-focus-within/img:opacity-100"
        onClick={openFilePicker}
      >
        <span className="pointer-events-none rounded-full border border-amaranth/20 bg-paper px-4 py-2 text-sm font-medium text-ink shadow-[0_12px_30px_rgb(6_4_3_/_0.18)] transition-colors duration-200 group-hover/img:border-amaranth/50 group-hover/img:text-amaranth group-focus-within/img:border-amaranth/50 group-focus-within/img:text-amaranth">
          {label}
        </span>
      </div>
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
