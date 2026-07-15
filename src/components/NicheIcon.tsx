// ponytail: animated SVG icons for UGC niches — airplane (travel), palette (languages), paintbrush (art)
// Scroll-triggered + hover-reactive via framer-motion
import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';

interface NicheIconProps {
  niche: 'travel' | 'languages' | 'art';
  className?: string;
}

function AirplaneSVG() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path
        d="M56 8L36 28M56 8L42 56L36 28M56 8L8 22L36 28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 28L24 40M24 40V52L30 46"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Trail dashes */}
      <path
        d="M12 52C16 48 18 44 20 38"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 4"
        opacity="0.4"
      />
    </svg>
  );
}

function PaintbrushSVG() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Brush handle */}
      <path
        d="M44 8L24 28C22 30 22 33 24 35L29 40C31 42 34 42 36 40L56 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bristles */}
      <path
        d="M24 35C20 39 16 44 14 48C12 52 10 56 14 56C18 56 22 52 24 48C26 44 28 40 29 40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Paint splatter dots */}
      <circle cx="10" cy="50" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="18" cy="54" r="1" fill="currentColor" opacity="0.25" />
      <circle cx="8" cy="44" r="1" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

function GlobeSVG() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="32" cy="32" rx="12" ry="24" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 32H56" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 20H52" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M12 44H52" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* Speech bubbles hint */}
      <circle cx="50" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <text x="48" y="17" fontSize="6" fill="currentColor" opacity="0.4" fontFamily="serif">A</text>
    </svg>
  );
}

const icons = {
  travel: AirplaneSVG,
  languages: GlobeSVG,
  art: PaintbrushSVG,
};

// ponytail: airplane flies across on scroll, brush wiggles on hover, globe spins subtly
const scrollAnimations = {
  travel: {
    hidden: { x: -60, y: 30, rotate: -20, opacity: 0 },
    visible: { x: 0, y: 0, rotate: 0, opacity: 1 },
  },
  languages: {
    hidden: { scale: 0.6, opacity: 0, rotate: -10 },
    visible: { scale: 1, opacity: 1, rotate: 0 },
  },
  art: {
    hidden: { x: 40, y: 20, rotate: 15, opacity: 0 },
    visible: { x: 0, y: 0, rotate: 0, opacity: 1 },
  },
};

const hoverAnimations = {
  travel: { x: [0, 8, -4, 6, 0], y: [0, -6, -2, -8, 0], rotate: [0, 10, -5, 8, 0] },
  languages: { rotate: [0, 360] },
  art: { rotate: [0, -12, 8, -6, 0], x: [0, 2, -2, 1, 0] },
};

export default function NicheIcon({ niche, className = '' }: NicheIconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [isHovered, setIsHovered] = useState(false);
  const Icon = icons[niche];

  return (
    <motion.div
      ref={ref}
      className={`text-rose-gold ${className}`}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={scrollAnimations[niche]}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        animate={isHovered ? hoverAnimations[niche] : {}}
        transition={{ duration: niche === 'languages' ? 1.2 : 0.6, ease: 'easeInOut' }}
      >
        <Icon />
      </motion.div>
    </motion.div>
  );
}
