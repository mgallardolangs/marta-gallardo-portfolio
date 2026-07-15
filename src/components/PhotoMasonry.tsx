import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  photos: string[];
}

export default function PhotoMasonry({ photos }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null);
      if (event.key === 'ArrowRight') setActiveIndex((current) => (current === null ? current : (current + 1) % photos.length));
      if (event.key === 'ArrowLeft') setActiveIndex((current) => (current === null ? current : (current - 1 + photos.length) % photos.length));
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, photos.length]);

  const showPrevious = () => setActiveIndex((current) => (current === null ? current : (current - 1 + photos.length) % photos.length));
  const showNext = () => setActiveIndex((current) => (current === null ? current : (current + 1) % photos.length));

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {photos.map((photo, index) => (
          <motion.button
            key={`${photo}-${index}`}
            type="button"
            className="mb-4 block w-full overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(45,45,45,0.08)]"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={() => setActiveIndex(index)}
          >
            <img
              src={photo}
              alt={`UGC photo ${index + 1}`}
              loading="lazy"
              className="h-auto w-full object-cover transition duration-300 hover:scale-[1.02]"
            />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-charcoal/90 p-4 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            onClick={() => setActiveIndex(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"
              onClick={() => setActiveIndex(null)}
            >
              Close
            </button>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white backdrop-blur-sm transition hover:bg-white/20"
                  onClick={(event) => {
                    event.stopPropagation();
                    showPrevious();
                  }}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white backdrop-blur-sm transition hover:bg-white/20"
                  onClick={(event) => {
                    event.stopPropagation();
                    showNext();
                  }}
                  aria-label="Next photo"
                >
                  ›
                </button>
              </>
            )}
            <motion.img
              key={photos[activeIndex]}
              src={photos[activeIndex]}
              alt={`UGC photo ${activeIndex + 1}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="max-h-[88vh] max-w-full rounded-[2rem] object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
