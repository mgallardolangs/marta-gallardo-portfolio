import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const emojis = [
  { symbol: '🎨', className: 'left-[14rem] top-8', duration: 4.4 },
  { symbol: '✈️', className: 'left-[3rem] top-24', duration: 5.1 },
  { symbol: '📸', className: 'left-[18rem] top-[11rem]', duration: 4.8 },
  { symbol: '🌍', className: 'left-[5rem] top-[18rem]', duration: 5.6 },
  { symbol: '✍️', className: 'left-[16rem] top-[23rem]', duration: 4.2 },
];

export default function AestheticGlobe() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const rotate = useTransform(scrollYProgress, [0, 1], [-16, 16]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-[-12rem] top-1/2 hidden h-[34rem] w-[34rem] -translate-y-1/2 lg:block"
      aria-hidden="true"
    >
      <motion.div className="relative h-full w-full" style={{ rotate }}>
        <svg viewBox="0 0 560 560" className="h-full w-full text-blush-200/30" fill="none">
          <circle cx="280" cy="280" r="210" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="280" cy="280" r="160" stroke="currentColor" strokeWidth="1.2" />
          <ellipse cx="280" cy="280" rx="210" ry="92" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="280" cy="280" rx="210" ry="142" stroke="currentColor" strokeWidth="1.2" />
          <ellipse cx="280" cy="280" rx="92" ry="210" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="280" cy="280" rx="142" ry="210" stroke="currentColor" strokeWidth="1.2" />
          <path d="M70 280H490" stroke="currentColor" strokeWidth="1.2" />
          <path d="M111 200H449" stroke="currentColor" strokeWidth="1" />
          <path d="M111 360H449" stroke="currentColor" strokeWidth="1" />
          <path d="M280 70V490" stroke="currentColor" strokeWidth="1.2" />
          <path d="M198 92C230 180 230 380 198 468" stroke="currentColor" strokeWidth="1" />
          <path d="M362 92C330 180 330 380 362 468" stroke="currentColor" strokeWidth="1" />
        </svg>

        {emojis.map(({ symbol, className, duration }, index) => (
          <motion.div
            key={symbol}
            className={`absolute ${className}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: 'easeOut' }}
          >
            <motion.span
              className="block text-3xl drop-shadow-[0_10px_24px_rgba(183,110,121,0.12)]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
            >
              {symbol}
            </motion.span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
