import { useCallback, useRef } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { useAdminStore } from './useAdminStore';

interface Props {
  imageKey: string;
  className?: string;
  alt?: string;
}

export default function EditableImage({ imageKey, className = '', alt = '' }: Props) {
  const { getImageSrc, setImage } = useAdminStore();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const src = getImageSrc(imageKey);

  const stopEvent = useCallback((event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleClick = useCallback((event: MouseEvent<HTMLElement>) => {
    stopEvent(event);
    fileRef.current?.click();
  }, [stopEvent]);

  const handleFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Use JPG, PNG, or WebP format');
      return;
    }

    const ext = file.name.split('.').pop() || 'png';
    const safeName = imageKey.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const uploadPath = `public/images/site/${safeName}.${ext}`;
    await setImage(imageKey, file, uploadPath);
    event.target.value = '';
  }, [imageKey, setImage]);

  return (
    <div
      className={`group/img relative ${className}`}
      onClick={handleClick}
      onClickCapture={handleClick}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{ cursor: 'pointer' }}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-pink-50 text-pink-300 text-2xl">📷</div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity z-40">
        <span className="bg-white rounded-full px-4 py-2 text-sm font-medium text-gray-800 shadow-lg">
          📷 Change image
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
