import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface Props {
  className?: string;
}

export default function AestheticGlobe({ className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const rotate = useTransform(scrollYProgress, [0, 1], [-14, 14]);

  return (
    <div ref={ref} className={`pointer-events-none relative aspect-square w-full ${className}`.trim()} aria-hidden="true">
      <motion.div className="relative h-full w-full" style={{ rotate }}>
        <svg viewBox="0 0 560 560" className="h-full w-full" fill="none">
          <defs>
            <clipPath id="globe-clip">
              <circle cx="280" cy="280" r="210" />
            </clipPath>
          </defs>

          <circle cx="280" cy="280" r="210" className="stroke-black/16" strokeWidth="1.5" />
          <circle cx="280" cy="280" r="160" className="stroke-black/12" strokeWidth="1.1" />
          <ellipse cx="280" cy="280" rx="210" ry="88" className="stroke-black/16" strokeWidth="1.3" />
          <ellipse cx="280" cy="280" rx="210" ry="138" className="stroke-black/10" strokeWidth="1.1" />
          <ellipse cx="280" cy="280" rx="88" ry="210" className="stroke-black/14" strokeWidth="1.3" />
          <ellipse cx="280" cy="280" rx="138" ry="210" className="stroke-black/10" strokeWidth="1.1" />
          <path d="M70 280H490" className="stroke-black/10" strokeWidth="1" />
          <path d="M110 198H450" className="stroke-black/8" strokeWidth="1" />
          <path d="M110 362H450" className="stroke-black/8" strokeWidth="1" />

          <g clipPath="url(#globe-clip)">
            <path
              className="fill-amaranth/8 stroke-black/14"
              strokeWidth="1.2"
              d="M151 163c-16 9-32 25-38 42-8 20-8 44 4 63 9 15 18 21 31 27 10 4 13 10 12 19-2 18 10 29 31 27 18-1 26-10 30-29 3-14 10-25 24-34 16-10 28-27 31-44 4-22-4-37-20-41-11-3-17-8-24-18-12-20-37-25-61-12-8 4-14 4-20 0z"
            />
            <path
              className="fill-amaranth/8 stroke-black/14"
              strokeWidth="1.2"
              d="M230 306c-15 9-24 25-24 45 0 22 8 39 24 52 13 11 18 24 17 44-1 18 10 31 27 31 20 0 36-17 38-41 2-18 8-33 18-46 14-18 19-36 14-56-4-17-16-28-33-31-13-2-24-1-33 4-9 5-18 5-27-2-6-5-13-5-21 0z"
            />
            <path
              className="fill-amaranth/8 stroke-black/14"
              strokeWidth="1.2"
              d="M286 163c8-14 23-20 45-17 18 3 31 12 41 28 5 9 13 15 23 17 18 4 31 19 33 39 2 16-2 29-14 39-10 8-15 17-16 30-2 25-18 44-40 48-18 4-35-4-44-21-8-14-20-22-37-24-18-2-32-11-39-26-9-17-4-36 12-50 11-10 18-22 19-35 2-11 7-21 17-28z"
            />
            <path
              className="fill-amaranth/8 stroke-black/12"
              strokeWidth="1"
              d="M384 207c16 2 30 9 42 21 12 11 22 16 36 15 20-2 38 5 51 21 12 16 14 35 6 55-7 17-19 28-35 34-18 7-33 18-46 34-14 16-30 22-49 18-18-3-32-14-39-31-7-18-6-35 5-52 7-12 8-22 2-34-11-22-1-48 27-71z"
            />
            <path
              className="fill-amaranth/8 stroke-black/12"
              strokeWidth="1"
              d="M356 368c14-4 28-2 41 6 14 8 27 10 39 7 17-4 31 4 41 22 8 14 8 28-1 41-9 14-22 21-39 22-18 2-32-4-44-17-11-12-24-20-40-23-18-4-28-15-29-33-2-14 8-23 32-25z"
            />
            <path
              className="fill-amaranth/8 stroke-black/12"
              strokeWidth="1"
              d="M318 120c10-5 22-6 34-3 10 2 20 8 30 16-9 7-20 11-33 11-14 0-25-4-34-12-3-3-2-8 3-12z"
            />
          </g>
        </svg>
      </motion.div>
    </div>
  );
}
