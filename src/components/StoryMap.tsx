// StoryMap — Global Narrative Connections Map
// Minimalist world silhouette + photo-pins connected by golden threads
import { motion, useInView, useAnimation } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface PhotoPin {
  src: string;
  // Position as percentage of container (x%, y%)
  x: number;
  y: number;
  size: number; // rem
  label?: string;
}

interface Props {
  photos: PhotoPin[];
  className?: string;
}

// Simplified world continents SVG path (minimalist silhouette)
const WORLD_PATH = `
M 120 85 Q 125 75 135 72 Q 140 68 148 70 Q 155 65 160 58 Q 165 52 175 48
Q 182 45 190 48 Q 195 42 200 38 Q 210 32 220 35 Q 228 30 235 28
Q 245 25 252 30 Q 258 28 265 32 Q 272 35 275 42 Q 280 48 278 55
Q 282 60 280 68 Q 275 75 268 78 Q 262 82 255 80 Q 248 82 242 85
Q 235 88 228 85 Q 220 88 215 85 Q 208 82 200 85 Q 195 88 188 85
Q 180 88 175 82 Q 168 78 160 80 Q 152 82 145 78 Q 138 75 130 78
Q 125 80 120 85 Z
M 290 55 Q 295 48 305 45 Q 312 42 320 45 Q 328 42 335 48 Q 342 52 345 58
Q 348 65 345 72 Q 342 78 335 82 Q 328 85 320 82 Q 312 85 305 82
Q 298 78 295 72 Q 292 65 290 55 Z
M 160 110 Q 165 105 172 102 Q 180 98 188 100 Q 195 98 200 102
Q 208 105 212 112 Q 215 118 212 125 Q 208 132 200 135 Q 195 138 188 135
Q 180 138 175 132 Q 168 128 165 122 Q 162 118 160 110 Z
M 240 100 Q 248 95 258 92 Q 268 90 278 95 Q 285 98 290 105
Q 295 112 292 120 Q 288 128 280 132 Q 272 135 265 132 Q 258 135 250 130
Q 242 125 240 118 Q 238 110 240 100 Z
M 340 95 Q 350 88 362 85 Q 375 82 388 88 Q 395 92 400 100
Q 405 108 402 118 Q 398 125 390 128 Q 380 132 370 128 Q 360 130 352 125
Q 345 118 342 108 Q 340 102 340 95 Z
M 140 135 Q 148 128 158 125 Q 168 122 178 128 Q 185 132 190 140
Q 195 148 192 158 Q 188 168 180 175 Q 172 180 165 178 Q 158 182 150 178
Q 142 172 140 162 Q 138 152 140 142 Q 140 138 140 135 Z
`;

// Thread connection pairs (indices into photos array)
function getConnections(count: number): [number, number][] {
  if (count <= 1) return [];
  const conns: [number, number][] = [];
  // Connect each photo to its neighbors + create a web through center
  for (let i = 0; i < count - 1; i++) {
    conns.push([i, i + 1]);
  }
  // Connect first to last for a loop
  if (count > 2) conns.push([0, count - 1]);
  // Add some cross-connections for a web feel
  if (count > 3) conns.push([0, Math.floor(count / 2)]);
  if (count > 4) conns.push([1, count - 2]);
  return conns;
}

function Thread({ x1, y1, x2, y2, highlighted, index }: {
  x1: number; y1: number; x2: number; y2: number;
  highlighted: boolean; index: number;
}) {
  // Create a slightly curved path for organic feel
  const mx = (x1 + x2) / 2 + (index % 2 === 0 ? 8 : -8);
  const my = (y1 + y2) / 2 + (index % 3 === 0 ? -6 : 6);
  const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;

  return (
    <motion.path
      d={d}
      stroke={highlighted ? '#D4956B' : '#C9A87C'}
      strokeWidth={highlighted ? 1.5 : 0.8}
      fill="none"
      strokeLinecap="round"
      opacity={highlighted ? 0.8 : 0.3}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: highlighted ? 0.8 : 0.3 }}
      transition={{
        pathLength: { duration: 1.5, delay: 0.3 + index * 0.25, ease: 'easeInOut' },
        opacity: { duration: 0.4 },
      }}
    />
  );
}

function PhotoPinComponent({ pin, index, isHovered, onHover, onLeave }: {
  pin: PhotoPin; index: number;
  isHovered: boolean;
  onHover: () => void; onLeave: () => void;
}) {
  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        width: `${pin.size}rem`,
        height: `${pin.size}rem`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.5 + index * 0.15, ease: 'easeOut' }}
      whileHover={{ scale: 1.1 }}
      onHoverStart={onHover}
      onHoverEnd={onLeave}
    >
      {/* Warm glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(212, 149, 107, 0.3), transparent 70%)',
          transform: 'scale(1.5)',
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      {/* Photo */}
      <div className="relative h-full w-full">
        {pin.src ? (
          <img
            src={pin.src}
            alt={pin.label || ''}
            className="h-full w-full object-contain drop-shadow-lg"
            style={{ filter: isHovered ? 'brightness(1.05)' : 'brightness(1)' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-blush-50/50 text-lg text-warm-gray/30">
            📌
          </div>
        )}
      </div>
      {/* Pin dot at bottom */}
      <motion.div
        className="absolute left-1/2 bottom-0 h-1.5 w-1.5 -translate-x-1/2 translate-y-1 rounded-full"
        style={{ backgroundColor: isHovered ? '#D4956B' : '#C9A87C' }}
        animate={{ scale: isHovered ? [1, 1.5, 1] : 1 }}
        transition={{ repeat: isHovered ? Infinity : 0, duration: 1.5 }}
      />
    </motion.div>
  );
}

export default function StoryMap({ photos, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const connections = getConnections(photos.length);

  // Breathing animation for the entire network
  const breatheControls = useAnimation();
  useEffect(() => {
    if (isInView) {
      breatheControls.start({
        y: [0, -3, 0],
        transition: { repeat: Infinity, duration: 8, ease: 'easeInOut' },
      });
    }
  }, [isInView, breatheControls]);

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      animate={breatheControls}
    >
      {/* World map silhouette — very faint watermark */}
      <motion.svg
        viewBox="0 0 520 220"
        className="absolute inset-0 h-full w-full"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 2, delay: 0.2 }}
      >
        <defs>
          <filter id="map-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>
        <path
          d={WORLD_PATH}
          fill="currentColor"
          className="text-blush-200"
          opacity="0.12"
          filter="url(#map-blur)"
        />
      </motion.svg>

      {/* Thread connections */}
      <svg className="absolute inset-0 h-full w-full" style={{ overflow: 'visible' }}>
        {isInView && connections.map(([a, b], idx) => {
          const pa = photos[a];
          const pb = photos[b];
          if (!pa || !pb) return null;
          const highlighted = hoveredIdx === a || hoveredIdx === b;
          return (
            <Thread
              key={`${a}-${b}`}
              x1={(pa.x / 100) * (ref.current?.offsetWidth || 500)}
              y1={(pa.y / 100) * (ref.current?.offsetHeight || 400)}
              x2={(pb.x / 100) * (ref.current?.offsetWidth || 500)}
              y2={(pb.y / 100) * (ref.current?.offsetHeight || 400)}
              highlighted={highlighted}
              index={idx}
            />
          );
        })}
      </svg>

      {/* Photo pins */}
      {photos.map((pin, idx) => (
        <PhotoPinComponent
          key={idx}
          pin={pin}
          index={idx}
          isHovered={hoveredIdx === idx}
          onHover={() => setHoveredIdx(idx)}
          onLeave={() => setHoveredIdx(null)}
        />
      ))}
    </motion.div>
  );
}
