import { motion } from 'framer-motion';

interface Props {
  text: string;
  className?: string;
}

export default function AnimatedScrollText({ text, className = '' }: Props) {
  const words = text.split(' ').filter(Boolean);

  return (
    <motion.div
      className={`flex flex-col items-center lg:items-start ${className}`.trim()}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      <motion.span
        className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-center font-body text-sm uppercase tracking-[0.3em] text-warm-gray/70 lg:justify-start lg:text-left"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.12,
              delayChildren: 1.2,
            },
          },
        }}
      >
        {words.map((word, index) => (
          <motion.span
            key={`${word}-${index}`}
            className="inline-block"
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>

      <motion.span
        className="mt-5 self-center text-warm-gray/60"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.span>
    </motion.div>
  );
}
