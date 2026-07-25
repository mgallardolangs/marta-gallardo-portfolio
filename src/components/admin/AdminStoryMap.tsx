import StoryMap from '../StoryMap';
import { useAdminStore } from './useAdminStore';

interface Props {
  className?: string;
}

const PHOTO_CONFIG = [
  { key: 'galleryCutouts.shotOne', x: 45, y: 20, size: 6, label: 'Europe' },
  { key: 'galleryCutouts.shotTwo', x: 10, y: 32, size: 5.5, label: 'Americas' },
  { key: 'galleryCutouts.shotThree', x: 63, y: 36, size: 5.5, label: 'Asia' },
  { key: 'galleryCutouts.shotFour', x: 25, y: 55, size: 5, label: 'South' },
  { key: 'galleryCutouts.shotFive', x: 82, y: 55, size: 5.5, label: 'Middle' },
] as const;

export default function AdminStoryMap({ className = '' }: Props) {
  const { getImageSrc } = useAdminStore();
  const photos = PHOTO_CONFIG.map((photo) => ({
    src: getImageSrc(photo.key),
    x: photo.x,
    y: photo.y,
    size: photo.size,
    label: photo.label,
  })).filter((photo) => photo.src);

  return <StoryMap photos={photos} className={className} />;
}
