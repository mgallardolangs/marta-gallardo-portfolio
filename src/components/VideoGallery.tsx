import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import type { Lang } from '../i18n';

interface VideoItem {
  src: string;
}

interface Props {
  videos: VideoItem[];
  lang?: Lang;
}

const labels = {
  es: { title: 'Vídeo', hint: 'Toca para ampliar', close: 'Cerrar', fullscreen: 'Pantalla completa', fullscreenLabel: 'Abrir vídeo a pantalla completa', dialog: 'Galería de vídeo', counter: 'Vídeo' },
  en: { title: 'Video', hint: 'Tap to expand', close: 'Close', fullscreen: 'Fullscreen', fullscreenLabel: 'Open video in fullscreen', dialog: 'Video gallery', counter: 'Video' },
  fr: { title: 'Vidéo', hint: 'Touchez pour agrandir', close: 'Fermer', fullscreen: 'Plein écran', fullscreenLabel: 'Ouvrir la vidéo en plein écran', dialog: 'Galerie vidéo', counter: 'Vidéo' },
  de: { title: 'Video', hint: 'Zum Vergrößern tippen', close: 'Schließen', fullscreen: 'Vollbild', fullscreenLabel: 'Video im Vollbild öffnen', dialog: 'Videogalerie', counter: 'Video' },
  it: { title: 'Video', hint: 'Tocca per ingrandire', close: 'Chiudi', fullscreen: 'Schermo intero', fullscreenLabel: 'Apri il video a schermo intero', dialog: 'Galleria video', counter: 'Video' },
  ca: { title: 'Vídeo', hint: 'Toca per ampliar', close: 'Tancar', fullscreen: 'Pantalla completa', fullscreenLabel: 'Obrir vídeo a pantalla completa', dialog: 'Galeria de vídeo', counter: 'Vídeo' },
} satisfies Record<Lang, Record<string, string>>;

export default function VideoGallery({ videos, lang = 'es' }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const previewRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
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
      if (event.key === 'Tab') {
        const focusableElements = dialogRef.current
          ? Array.from(
              dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), video[controls], [href], [tabindex]:not([tabindex="-1"])',
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
  }, [activeIndex]);

  const playPreview = async (index: number) => {
    if (prefersReducedMotion) return;

    const video = previewRefs.current[index];
    if (!video) return;
    try {
      video.currentTime = 0;
      await video.play();
    } catch {
      // Browser autoplay policy can still block muted preview playback.
    }
  };

  const stopPreview = (index: number) => {
    const video = previewRefs.current[index];
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  const requestFullscreen = async (video: HTMLVideoElement | null) => {
    if (!video?.requestFullscreen) return;
    try {
      await video.requestFullscreen();
    } catch {
      // Ignore browser fullscreen errors.
    }
  };

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {videos.map((video, index) => (
          <motion.article
            key={`${video.src}-${index}`}
            className="group relative overflow-hidden rounded-[2rem] bg-charcoal text-left shadow-[0_20px_60px_rgb(6_4_3_/_0.15)]"
            whileHover={prefersReducedMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onMouseEnter={() => void playPreview(index)}
            onMouseLeave={() => stopPreview(index)}
          >
            <video
              ref={(element) => {
                previewRefs.current[index] = element;
              }}
              src={video.src}
              muted
              loop
              playsInline
              preload="metadata"
              className="aspect-[9/16] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
            <button
              type="button"
              aria-label={`${ui.title} ${index + 1}`}
              className="absolute inset-0 z-10 rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
              onFocus={() => void playPreview(index)}
              onBlur={() => stopPreview(index)}
              onClick={() => setActiveIndex(index)}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between p-4 text-white">
              <div>
                <p className="font-accent text-[11px] uppercase tracking-[0.35em] text-paper">{ui.title}</p>
                <p className="mt-1 font-body text-sm text-white/85">{ui.hint}</p>
              </div>
              <button
                type="button"
                className="pointer-events-auto z-20 rounded-full bg-white/15 px-3 py-2 text-sm backdrop-blur-sm transition hover:bg-white/25"
                onClick={(event) => {
                  event.stopPropagation();
                  void requestFullscreen(previewRefs.current[index]);
                }}
                aria-label={ui.fullscreenLabel}
              >
                ⤢
              </button>
            </div>
          </motion.article>
        ))}
      </div>

      {activeIndex !== null && (
        <div ref={dialogRef} className="fixed inset-0 z-[120] flex items-center justify-center bg-charcoal/90 p-4 md:p-8" role="dialog" aria-modal="true" aria-label={`${ui.dialog} ${activeIndex + 1}`}>
          <button
            ref={closeButtonRef}
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"
            onClick={() => setActiveIndex(null)}
          >
            {ui.close}
          </button>

          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-black shadow-2xl md:max-w-lg">
            <video
              ref={modalVideoRef}
              src={videos[activeIndex].src}
              controls
              autoPlay={!prefersReducedMotion}
              playsInline
              preload="metadata"
              className="max-h-[80vh] w-full bg-black object-contain"
            />
            <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-charcoal px-4 py-3 text-white">
              <p className="font-body text-sm text-white/75">{ui.counter} {activeIndex + 1} / {videos.length}</p>
              <button
                type="button"
                className="rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
                onClick={() => void requestFullscreen(modalVideoRef.current)}
              >
                {ui.fullscreen}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
