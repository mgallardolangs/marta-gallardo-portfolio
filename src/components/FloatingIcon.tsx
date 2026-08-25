// ponytail: floating icons that react to cursor position
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';

interface FloatingIconProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  interactive?: boolean;
}

export default function FloatingIcon({
  children,
  className = '',
  intensity = 15,
  interactive = false,
}: FloatingIconProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const x = useTransform(mouseX, [0, 1], [-intensity, intensity]);
  const y = useTransform(mouseY, [0, 1], [-intensity, intensity]);
  const pointerEventsClass = interactive ? 'pointer-events-auto' : 'pointer-events-none';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [mouseX, mouseY]);

  return (
    <motion.div className={`${pointerEventsClass} ${className}`} style={{ x, y }}>
      {children}
    </motion.div>
  );
}
