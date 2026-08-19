import { useEffect, useState } from 'react';
import EditableImage from './EditableImage';
import { adminStore } from './adminStore';

interface Props {
  className?: string;
}

const PHOTO_CONFIG = [
  { key: 'galleryCutouts.shotOne', x: 45, y: 20, size: 6 },
  { key: 'galleryCutouts.shotTwo', x: 10, y: 32, size: 5.5 },
  { key: 'galleryCutouts.shotThree', x: 63, y: 36, size: 5.5 },
  { key: 'galleryCutouts.shotFour', x: 25, y: 55, size: 5 },
  { key: 'galleryCutouts.shotFive', x: 82, y: 55, size: 5.5 },
];

export default function AdminStoryMap({ className = '' }: Props) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return adminStore.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  return (
    <div className={`relative ${className}`} style={{ minHeight: '36rem' }}>
      {/* World map background */}
      <img
        src="/images/site/world-map.png"
        alt=""
        className="absolute inset-0 w-full pointer-events-none select-none"
        style={{ top: '50%', transform: 'translateY(-50%) scale(1.3)', opacity: 0.35 }}
      />
      {/* Editable photo pins */}
      {PHOTO_CONFIG.map(pin => (
        <div
          key={pin.key}
          className="absolute z-10"
          style={{
            left: `${pin.x}%`,
            top: `${pin.y}%`,
            width: `${pin.size}rem`,
            height: `${pin.size}rem`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <EditableImage imageKey={pin.key} className="h-full w-full rounded-xl overflow-hidden" alt="" />
        </div>
      ))}
    </div>
  );
}
