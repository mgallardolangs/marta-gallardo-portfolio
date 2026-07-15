// ponytail: parallax effect via framer-motion scroll, one component
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  speed?: number; // negative = slower than scroll, positive = faster
}

export default function ParallaxLayer({ children, className = '', speed = -0.2 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 100, -speed * 100]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
