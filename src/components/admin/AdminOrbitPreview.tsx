import { useEffect, useState } from 'react';
import type { Lang } from '../../i18n';
import {
  DESKTOP_ORBIT_GEOMETRY,
  MOBILE_ORBIT_GEOMETRY,
  getLocalizedOrbitText,
  getOrbitItemLayout,
  type OrbitGeometry,
} from '../../lib/orbitMedia';
import type { OrbitMedia } from '../../lib/siteData';
import { useAdminStore } from './useAdminStore';

interface Props {
  lang: Lang;
}

const STATIC_PROGRESS = 0.08;

function getPreviewSrc(item: OrbitMedia) {
  return item.type === 'video' ? (item.poster ?? '') : item.src;
}

export default function AdminOrbitPreview({ lang }: Props) {
  const store = useAdminStore();
  const items = store.getOrbitMedia();
  const [orbitGeometry, setOrbitGeometry] = useState<OrbitGeometry>(DESKTOP_ORBIT_GEOMETRY);

  useEffect(() => {
    const breakpoint = window.matchMedia('(max-width: 767px)');
    const updateGeometry = () => {
      setOrbitGeometry(breakpoint.matches ? MOBILE_ORBIT_GEOMETRY : DESKTOP_ORBIT_GEOMETRY);
    };

    updateGeometry();
    breakpoint.addEventListener('change', updateGeometry);
    return () => breakpoint.removeEventListener('change', updateGeometry);
  }, []);

  return (
    <div
      data-orbit-frame
      className="relative mx-auto min-w-0 aspect-[2/3] min-h-[22rem] w-full max-w-[46rem] overflow-hidden md:aspect-[720/440] md:min-h-[27.5rem]"
      role="img"
      aria-label="Vista previa del orbit"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <span className="font-heading text-[3rem] tracking-[-0.08em] text-paper md:text-[4.75rem]">MG</span>
        <div className="mt-3 h-px w-16 bg-amaranth md:w-24" />
      </div>

      {items.map((item, index) => {
        const layout = getOrbitItemLayout(STATIC_PROGRESS, index, items.length, orbitGeometry);
        const previewSrc = getPreviewSrc(item);
        const alt = getLocalizedOrbitText(item.alt, lang);

        return (
          <div
            key={item.id}
            className="absolute left-1/2 top-1/2 h-[5.875rem] w-[4.625rem] overflow-hidden bg-white/95 shadow-[0_16px_40px_rgba(6,4,3,0.28)] md:h-[7.875rem] md:w-[6.125rem]"
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
                width={98}
                height={126}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/12 px-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-paper/78">
                {item.type === 'video' ? 'Póster' : 'Contenido'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
