import EditableMedia from './EditableMedia';
import { useAdminStore } from './useAdminStore';

export default function AdminBrandVideo() {
  const store = useAdminStore();
  const src = store.getImageSrc('brandVideo');

  return (
    <EditableMedia
      src={src}
      mediaType="video"
      acceptKind="video"
      alt="Brand video"
      label="🎬 Change video"
      emptyLabel="Upload MP4/WebM/MOV"
      className="absolute inset-0 h-full w-full"
      onSelect={async (file) => {
        const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
        await store.setImage('brandVideo', file, `public/images/site/brand-video.${extension}`);
      }}
    />
  );
}
