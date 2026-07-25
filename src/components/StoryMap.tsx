// StoryMap — Global Narrative Connections Map
// World silhouette (SVG image) + photo-pins connected by golden threads
import { motion } from 'framer-motion';
import { useState } from 'react';

interface PhotoPin {
  src: string;
  x: number;
  y: number;
  size: number;
  label?: string;
}

interface Props {
  photos: PhotoPin[];
  className?: string;
}

function getConnections(count: number): [number, number][] {
  if (count <= 1) return [];
  const conns: [number, number][] = [];
  for (let i = 0; i < count - 1; i++) conns.push([i, i + 1]);
  if (count > 2) conns.push([0, count - 1]);
  if (count > 3) conns.push([0, Math.floor(count / 2)]);
  if (count > 4) conns.push([1, count - 2]);
  return conns;
}

export default function StoryMap({ photos, className = '' }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const connections = getConnections(photos.length);

  return (
    <div className={`relative ${className}`} style={{ minHeight: '36rem' }}>
      {/* World map silhouette — Marta's mapamundi image */}
      <img
        src="/images/site/world-map.png"
        alt=""
        className="absolute inset-0 w-full pointer-events-none select-none"
        style={{ top: '50%', transform: 'translateY(-50%) scale(1.3)', opacity: 0.35 }}
      />

      {/* Golden thread connections */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {connections.map(([a, b], idx) => {
          const pa = photos[a];
          const pb = photos[b];
          if (!pa || !pb) return null;
          const highlighted = hoveredIdx === a || hoveredIdx === b;
          return (
            <motion.line
              key={`t-${a}-${b}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={highlighted ? '#D4956B' : '#C9A87C'}
              strokeWidth={0.3}
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: highlighted ? 2 : 1 }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: highlighted ? 0.8 : 0.35,
              }}
              transition={{
                pathLength: { duration: 1.5, delay: idx * 0.3, ease: 'easeOut' },
                opacity: { duration: 0.15 },
              }}
            />
          );
        })}
      </svg>

      {/* Photo pins */}
      {photos.map((pin, idx) => {
        const isHovered = hoveredIdx === idx;
        const isConnected = hoveredIdx !== null && connections.some(
          ([a, b]) => (a === hoveredIdx || b === hoveredIdx) && (a === idx || b === idx)
        );
        return (
          <motion.div
            key={idx}
            className="absolute cursor-pointer"
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
            {/* Warm glow */}
            <motion.div
              className="absolute -inset-4 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(212,149,107,0.4), transparent 65%)' }}
              animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1.3 : 0.8 }}
              transition={{ duration: 0.15 }}
            />
            {/* Photo */}
            <motion.div
              className="relative h-full w-full"
              animate={{
                scale: isHovered ? 1.15 : isConnected ? 1.05 : 1,
                filter: isHovered
                  ? 'brightness(1.1) drop-shadow(0 8px 24px rgba(212,149,107,0.5))'
                  : 'brightness(1) drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
              }}
              transition={{ duration: 0.15 }}
            >
              {pin.src ? (
                <img src={pin.src} alt={pin.label || ''} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-pink-50 text-lg text-pink-300">📌</div>
              )}
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
