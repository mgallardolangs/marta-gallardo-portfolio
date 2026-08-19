import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
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

      {/* Editable photo pins with hover effects */}
      {PHOTO_CONFIG.map((pin, idx) => {
        const isHovered = hoveredIdx === idx;
        return (
          <motion.div
            key={pin.key}
            className="absolute z-10"
            style={{
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              width: `${pin.size}rem`,
              height: `${pin.size}rem`,
              transform: 'translate(-50%, -50%)',
              zIndex: isHovered ? 30 : 10,
            }}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + idx * 0.12, ease: 'backOut' }}
            onHoverStart={() => setHoveredIdx(idx)}
            onHoverEnd={() => setHoveredIdx(null)}
          >
            {/* Warm glow on hover */}
            <motion.div
              className="absolute -inset-4 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(212,149,107,0.4), transparent 65%)' }}
              animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1.3 : 0.8 }}
              transition={{ duration: 0.15 }}
            />
            {/* Photo with scale effect */}
            <motion.div
              className="relative h-full w-full"
              animate={{
                scale: isHovered ? 1.15 : 1,
                filter: isHovered
                  ? 'brightness(1.1) drop-shadow(0 8px 24px rgba(212,149,107,0.5))'
                  : 'brightness(1) drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
              }}
              transition={{ duration: 0.15 }}
            >
              <EditableImage imageKey={pin.key} className="h-full w-full rounded-xl overflow-hidden" alt="" />
            </motion.div>
          </motion.div>
        );
      })}

      {/* Breathing pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(201,168,124,0.08), transparent 60%)' }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
      />
    </div>
  );
}
