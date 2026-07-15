// ponytail: floating icons that react to cursor position
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';

interface FloatingIconProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export default function FloatingIcon({ children, className = '', intensity = 15 }: FloatingIconProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const x = useTransform(mouseX, [0, 1], [-intensity, intensity]);
  const y = useTransform(mouseY, [0, 1], [-intensity, intensity]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [mouseX, mouseY]);

  return (
    <motion.div className={`pointer-events-none ${className}`} style={{ x, y }}>
      {children}
    </motion.div>
  );
}
