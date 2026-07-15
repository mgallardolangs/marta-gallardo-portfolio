import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface VideoItem {
  src: string;
}

interface Props {
  videos: VideoItem[];
}

export default function VideoGallery({ videos }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const previewRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null);
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex]);

  const playPreview = async (index: number) => {
    const video = previewRefs.current[index];
    if (!video) return;
    try {
      video.currentTime = 0;
      await video.play();
    } catch {
      // Autoplay can be blocked; ignore.
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
          <motion.button
            key={`${video.src}-${index}`}
            type="button"
            className="group relative overflow-hidden rounded-[2rem] bg-charcoal text-left shadow-[0_20px_60px_rgba(45,45,45,0.15)]"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onMouseEnter={() => void playPreview(index)}
            onMouseLeave={() => stopPreview(index)}
            onFocus={() => void playPreview(index)}
            onBlur={() => stopPreview(index)}
            onClick={() => setActiveIndex(index)}
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
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 text-white">
              <div>
                <p className="font-accent text-[11px] uppercase tracking-[0.35em] text-blush-100">Video</p>
                <p className="mt-1 font-body text-sm text-white/85">Hover to preview · click to expand</p>
              </div>
              <button
                type="button"
                className="pointer-events-auto rounded-full bg-white/15 px-3 py-2 text-sm backdrop-blur-sm transition hover:bg-white/25"
                onClick={(event) => {
                  event.stopPropagation();
                  void requestFullscreen(previewRefs.current[index]);
                }}
                aria-label="Open video in fullscreen"
              >
                ⤢
              </button>
            </div>
          </motion.button>
        ))}
      </div>

      {activeIndex !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-charcoal/90 p-4 md:p-8" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"
            onClick={() => setActiveIndex(null)}
          >
            Close
          </button>

          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-black shadow-2xl md:max-w-lg">
            <video
              ref={modalVideoRef}
              src={videos[activeIndex].src}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] w-full bg-black object-contain"
            />
            <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-charcoal px-4 py-3 text-white">
              <p className="font-body text-sm text-white/75">Video {activeIndex + 1} of {videos.length}</p>
              <button
                type="button"
                className="rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
                onClick={() => void requestFullscreen(modalVideoRef.current)}
              >
                Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
