import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import type { Lang } from '../i18n';

interface Props {
  photos: string[];
  lang?: Lang;
}

const labels = {
  es: { openPhoto: 'Abrir foto', close: 'Cerrar', previous: 'Foto anterior', next: 'Foto siguiente', dialog: 'Galería de fotos' },
  en: { openPhoto: 'Open photo', close: 'Close', previous: 'Previous photo', next: 'Next photo', dialog: 'Photo gallery' },
  fr: { openPhoto: 'Ouvrir la photo', close: 'Fermer', previous: 'Photo précédente', next: 'Photo suivante', dialog: 'Galerie photo' },
  de: { openPhoto: 'Foto öffnen', close: 'Schließen', previous: 'Vorheriges Foto', next: 'Nächstes Foto', dialog: 'Fotogalerie' },
  it: { openPhoto: 'Apri foto', close: 'Chiudi', previous: 'Foto precedente', next: 'Foto successiva', dialog: 'Galleria fotografica' },
  ca: { openPhoto: 'Obrir foto', close: 'Tancar', previous: 'Foto anterior', next: 'Foto següent', dialog: 'Galeria de fotos' },
} satisfies Record<Lang, Record<string, string>>;

export default function PhotoMasonry({ photos, lang = 'es' }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const ui = labels[lang] ?? labels.es;

  useEffect(() => {
    if (activeIndex === null) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null);
      if (event.key === 'ArrowRight') setActiveIndex((current) => (current === null ? current : (current + 1) % photos.length));
      if (event.key === 'ArrowLeft') setActiveIndex((current) => (current === null ? current : (current - 1 + photos.length) % photos.length));
      if (event.key === 'Tab') {
        const focusableElements = dialogRef.current
          ? Array.from(
              dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
              ),
            )
          : [];

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
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
            aria-label={`${ui.openPhoto} ${index + 1}`}
            className="mb-4 block w-full overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgb(6_4_3_/_0.08)]"
            whileHover={prefersReducedMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={() => setActiveIndex(index)}
          >
            <img
              src={photo}
              alt=""
              width={1200}
              height={1600}
              loading="lazy"
              decoding="async"
              className="h-auto w-full object-cover transition duration-300 hover:scale-[1.02]"
            />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            ref={dialogRef}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-charcoal/90 p-4 md:p-8"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${ui.dialog} ${activeIndex + 1}`}
            onClick={() => setActiveIndex(null)}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"
              onClick={() => setActiveIndex(null)}
            >
              {ui.close}
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
                  aria-label={ui.previous}
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
                  aria-label={ui.next}
                >
                  ›
                </button>
              </>
            )}
            <motion.img
              key={photos[activeIndex]}
              src={photos[activeIndex]}
              alt=""
              width={1200}
              height={1600}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
              className="max-h-[88vh] max-w-full rounded-[2rem] object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
