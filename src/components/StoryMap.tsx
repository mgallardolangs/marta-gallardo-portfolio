// StoryMap — Global Narrative Connections Map
// World silhouette + photo-pins connected by golden threads
import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';

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
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const connections = getConnections(photos.length);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* World map silhouette — proper visible watermark */}
      <motion.svg
        viewBox="0 0 1000 500"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <defs>
          <filter id="map-soft">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
        </defs>
        {/* North America */}
        <path d="M 100 80 Q 120 60 150 55 Q 180 50 200 60 Q 220 55 240 65 Q 250 70 260 80 Q 265 90 260 105 Q 255 115 245 120 Q 240 130 230 140 Q 220 150 210 155 Q 200 160 190 158 Q 180 162 170 165 Q 155 170 145 160 Q 135 155 125 150 Q 115 140 110 125 Q 105 110 100 100 Q 98 90 100 80 Z"
          fill="#FF8FAB"  opacity="0.35" filter="url(#map-soft)" />
        {/* South America */}
        <path d="M 200 200 Q 210 190 225 185 Q 240 180 250 190 Q 260 200 265 215 Q 270 235 268 255 Q 265 275 260 295 Q 255 315 248 330 Q 240 345 232 355 Q 225 360 218 355 Q 210 350 205 340 Q 200 325 198 310 Q 195 290 193 270 Q 192 250 195 230 Q 197 215 200 200 Z"
          fill="#FF8FAB"  opacity="0.3" filter="url(#map-soft)" />
        {/* Europe */}
        <path d="M 440 65 Q 455 55 475 50 Q 490 48 505 55 Q 520 52 530 60 Q 540 65 545 75 Q 548 85 545 95 Q 540 105 530 112 Q 525 118 515 122 Q 505 125 495 120 Q 485 118 475 115 Q 465 112 455 108 Q 445 100 440 90 Q 438 78 440 65 Z"
          fill="#FF8FAB"  opacity="0.38" filter="url(#map-soft)" />
        {/* Africa */}
        <path d="M 470 140 Q 485 130 500 128 Q 515 125 530 135 Q 540 142 545 155 Q 550 170 548 190 Q 546 210 540 230 Q 535 250 528 268 Q 520 285 510 298 Q 500 310 490 305 Q 480 300 475 288 Q 468 270 465 250 Q 462 230 460 210 Q 458 190 460 170 Q 462 155 470 140 Z"
          fill="#FF8FAB"  opacity="0.35" filter="url(#map-soft)" />
        {/* Asia */}
        <path d="M 560 50 Q 590 40 620 38 Q 650 35 680 42 Q 710 48 740 55 Q 770 62 790 75 Q 805 85 810 100 Q 812 115 805 128 Q 795 140 780 148 Q 765 155 745 158 Q 725 160 705 155 Q 685 152 665 145 Q 645 140 625 132 Q 605 125 590 115 Q 575 105 565 90 Q 558 75 560 50 Z"
          fill="#FF8FAB"  opacity="0.3" filter="url(#map-soft)" />
        {/* Australia */}
        <path d="M 770 260 Q 790 248 815 245 Q 840 242 860 252 Q 875 260 882 275 Q 886 290 880 305 Q 872 318 858 325 Q 842 330 825 328 Q 808 325 795 315 Q 782 305 775 290 Q 770 278 770 260 Z"
          fill="#FF8FAB"  opacity="0.28" filter="url(#map-soft)" />
      </motion.svg>

      {/* Thread connections — golden lines */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ overflow: 'visible' }}>
        {isInView && connections.map(([a, b], idx) => {
          const pa = photos[a];
          const pb = photos[b];
          if (!pa || !pb) return null;
          const highlighted = hoveredIdx === a || hoveredIdx === b;
          const cx = (pa.x + pb.x) / 2 + (idx % 2 === 0 ? 3 : -3);
          const cy = (pa.y + pb.y) / 2 + (idx % 3 === 0 ? -4 : 4);
          return (
            <motion.path
              key={`t-${a}-${b}`}
              d={`M ${pa.x}% ${pa.y}% Q ${cx}% ${cy}% ${pb.x}% ${pb.y}%`}
              stroke={highlighted ? '#D4956B' : '#C9A87C'}
              strokeWidth={highlighted ? 2 : 1}
              fill="none"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: highlighted ? 0.7 : 0.25,
                strokeWidth: highlighted ? 2 : 1,
              }}
              transition={{
                pathLength: { duration: 1.2, delay: idx * 0.2, ease: 'easeOut' },
                opacity: { duration: 0.2 },
                strokeWidth: { duration: 0.2 },
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
            animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 + idx * 0.12, ease: 'backOut' }}
            onHoverStart={() => setHoveredIdx(idx)}
            onHoverEnd={() => setHoveredIdx(null)}
          >
            {/* Warm glow */}
            <motion.div
              className="absolute -inset-4 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(212,149,107,0.35), transparent 65%)' }}
              animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1.2 : 0.8 }}
              transition={{ duration: 0.15 }}
            />
            {/* Photo */}
            <motion.div
              className="relative h-full w-full"
              animate={{
                scale: isHovered ? 1.15 : isConnected ? 1.05 : 1,
                filter: isHovered ? 'brightness(1.1) drop-shadow(0 8px 20px rgba(212,149,107,0.4))' : 'brightness(1) drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
              }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {pin.src ? (
                <img src={pin.src} alt={pin.label || ''} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-blush-100/50 text-lg text-warm-gray/30">📌</div>
              )}
            </motion.div>
            {/* Pin dot */}
            <motion.div
              className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rounded-full bg-[#C9A87C]"
              animate={{
                scale: isHovered ? [1, 1.8, 1] : 1,
                backgroundColor: isHovered ? '#D4956B' : '#C9A87C',
              }}
              transition={{ scale: { repeat: isHovered ? Infinity : 0, duration: 0.8 } }}
            />
          </motion.div>
        );
      })}

      {/* Subtle breathing pulse along threads */}
      {isInView && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(201,168,124,0.06), transparent 60%)' }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}
