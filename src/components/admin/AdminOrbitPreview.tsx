import type { Lang } from '../../i18n';
import { DESKTOP_ORBIT_GEOMETRY, getLocalizedOrbitText, getOrbitItemLayout } from '../../lib/orbitMedia';
import type { OrbitMedia } from '../../lib/siteData';
import { useAdminStore } from './useAdminStore';

interface Props {
  lang: Lang;
}

const STATIC_PROGRESS = 0.08;

function getPreviewSrc(item: OrbitMedia) {
  if (item.type === 'video') {
    return item.poster ?? '';
  }

  return item.src;
}

export default function AdminOrbitPreview({ lang }: Props) {
  const store = useAdminStore();
  const items = store.getOrbitMedia();

  return (
    <div className="space-y-4">
      <div
        className="relative mx-auto aspect-[690/430] min-h-[21rem] w-full max-w-[44rem] overflow-hidden"
        role="img"
        aria-label="Orbit preview"
      >
        <div className="pointer-events-none absolute inset-[8%] rounded-full border border-amaranth/14" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[58%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amaranth/16" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amaranth/10" />

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span className="font-heading text-[2.9rem] tracking-[-0.08em] text-ink md:text-[4.1rem]">MG</span>
          <div className="mt-3 h-px w-16 bg-amaranth md:w-24" />
        </div>

        {items.map((item, index) => {
          const layout = getOrbitItemLayout(STATIC_PROGRESS, index, items.length, DESKTOP_ORBIT_GEOMETRY);
          const previewSrc = getPreviewSrc(item);
          const alt = getLocalizedOrbitText(item.alt, lang);

          return (
            <div
              key={item.id}
              className="absolute left-1/2 top-1/2 h-[5.4rem] w-[4.25rem] overflow-hidden bg-white shadow-[0_12px_32px_rgba(6,4,3,0.18)] md:h-[7.625rem] md:w-24"
              style={{
                left: `${layout.leftPercent}%`,
                top: `${layout.topPercent}%`,
                zIndex: layout.zIndex,
                transform: `translate(-50%, -50%) scale(${layout.baseScale})`,
              }}
            >
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt={alt}
                  width={96}
                  height={122}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-paper/88 px-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-accent-ink">
                  {item.type === 'video' ? 'Poster' : 'Media'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-accent-ink">
        Static preview · public orbit keeps motion only on Home
      </p>
    </div>
  );
}
