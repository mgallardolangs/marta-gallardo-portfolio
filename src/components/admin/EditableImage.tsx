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
export default function EditableImage({ imageKey, className = '', alt = '', label = '📷 Change image' }: Props) {
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
    // Accept JPG, PNG, WebP, SVG
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      alert('Use JPG, PNG, WebP, or SVG format');
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
    <div className={`group/img relative ${className}`} style={{ cursor: 'pointer', minHeight: '3rem' }}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-pink-50 rounded-xl text-pink-300 text-2xl min-h-[3rem]">
          📷
        </div>
      )}
      {/* Overlay button — always visible on hover */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity z-40 rounded-inherit"
        onClick={openFilePicker}
      >
        <span className="bg-white rounded-full px-4 py-2 text-sm font-medium text-gray-800 shadow-lg pointer-events-none">
          {label}
        </span>
      </div>
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
