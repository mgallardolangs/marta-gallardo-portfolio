import type { LocalizedText, OrbitMedia } from './siteData.ts';

type OrbitLang = 'es' | 'en' | 'fr' | 'de' | 'it' | 'ca';

export const ORBIT_ADMIN_LANGS = ['es', 'en', 'fr'] as const;
export type OrbitAdminLang = (typeof ORBIT_ADMIN_LANGS)[number];

export const ORBIT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const ORBIT_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
export const ORBIT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const ORBIT_VIDEO_MAX_BYTES = 8 * 1024 * 1024;
export const ORBIT_REVOLUTION_SECONDS = 68;

export const DESKTOP_ORBIT_GEOMETRY = {
  width: 690,
  height: 430,
  radiusX: 296,
  radiusY: 154,
  tiltDeg: -18,
} as const;

export type OrbitGeometry = typeof DESKTOP_ORBIT_GEOMETRY;

const TAU = Math.PI * 2;
const LOCALIZED_FALLBACKS = ['de', 'it', 'ca'] as const;
const IMAGE_SOURCE_PATTERN = /\.(?:jpe?g|png|webp|gif|svg)(?:\?.*)?$/i;
const VIDEO_SOURCE_PATTERN = /\.(?:mp4|webm|mov|qt)(?:\?.*)?$/i;

function normalizeOrbitProgress(progress: number): number {
  const normalized = progress % 1;
  return normalized < 0 ? normalized + 1 : normalized;
}

function buildOrbitId(baseId: string, existingIds: string[]): string {
  if (!existingIds.includes(baseId)) return baseId;

  let suffix = 2;
  while (existingIds.includes(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export function createLocalizedText(seed: string): LocalizedText {
  return {
    es: seed,
    en: seed,
    fr: seed,
    de: seed,
    it: seed,
    ca: seed,
  };
}

export function createOrbitMediaDraft(existingIds: string[]): OrbitMedia {
  return {
    id: buildOrbitId('orbit-item', existingIds),
    type: 'image',
    src: '/images/site/orbit-placeholder-profile.svg',
    href: null,
    label: createLocalizedText('Nuevo elemento'),
    alt: createLocalizedText('Nuevo elemento del orbit de portada'),
    poster: null,
  };
}

export function getTiltedEllipsePoint(progress: number, geometry: OrbitGeometry = DESKTOP_ORBIT_GEOMETRY) {
  const angle = normalizeOrbitProgress(progress) * TAU;
  const rawX = Math.cos(angle) * geometry.radiusX;
  const rawY = Math.sin(angle) * geometry.radiusY;
  const tilt = (geometry.tiltDeg * Math.PI) / 180;

  return {
    x: rawX * Math.cos(tilt) - rawY * Math.sin(tilt),
    y: rawX * Math.sin(tilt) + rawY * Math.cos(tilt),
  };
}

export function getOrbitItemLayout(
  progress: number,
  index: number,
  total: number,
  geometry: OrbitGeometry = DESKTOP_ORBIT_GEOMETRY,
) {
  const point = getTiltedEllipsePoint(progress + index / Math.max(total, 1), geometry);
  const depth = Math.max(0, Math.min(1, (point.y + geometry.height / 2) / geometry.height));
  const baseScale = 0.76 + depth * 0.28;

  return {
    point,
    baseScale,
    depth,
    zIndex: 20 + Math.round(depth * 80),
    leftPercent: 50 + (point.x / geometry.width) * 100,
    topPercent: 50 + (point.y / geometry.height) * 100,
  };
}

export function getOrbitInteractionState({
  baseScale,
  isActive,
  hasActiveTile,
}: {
  baseScale: number;
  isActive: boolean;
  hasActiveTile: boolean;
}) {
  if (isActive) {
    return {
      opacity: 1,
      filter: 'none',
      scale: Number((baseScale * 1.5).toFixed(2)),
      zIndexBoost: 1000,
    };
  }

  if (hasActiveTile) {
    return {
      opacity: 0.42,
      filter: 'grayscale(1) brightness(0.42)',
      scale: baseScale,
      zIndexBoost: 0,
    };
  }

  return {
    opacity: 1,
    filter: 'none',
    scale: baseScale,
    zIndexBoost: 0,
  };
}

export function getOrbitVideoPlaybackMode({
  prefersReducedMotion,
  isDocumentVisible,
  isRegionVisible,
}: {
  prefersReducedMotion: boolean | null;
  isDocumentVisible: boolean;
  isRegionVisible: boolean;
}) {
  if (prefersReducedMotion !== false) return 'pause';
  return isDocumentVisible && isRegionVisible ? 'play-muted' : 'pause';
}

export function approximateEllipseCircumference(radiusX: number, radiusY: number) {
  const h = ((radiusX - radiusY) ** 2) / ((radiusX + radiusY) ** 2);
  return Math.PI * (radiusX + radiusY) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

export function calculateOrbitAutoScrollSpeed({
  itemCount,
  tilePitch,
  geometry = DESKTOP_ORBIT_GEOMETRY,
  revolutionSeconds = ORBIT_REVOLUTION_SECONDS,
  fps = 60,
}: {
  itemCount: number;
  tilePitch: number;
  geometry?: OrbitGeometry;
  revolutionSeconds?: number;
  fps?: number;
}) {
  if (itemCount <= 0 || tilePitch <= 0) return 2;

  // Embla auto-scroll uses horizontal px/frame, so we convert the ellipse pitch
  // (circumference ÷ itemCount) into the current measured slide pitch before
  // dividing by the target revolution time.
  const circumference = approximateEllipseCircumference(geometry.radiusX, geometry.radiusY);
  const orbitalPitch = circumference / itemCount;
  const pixelsPerSecond = circumference / revolutionSeconds;
  return Number(((pixelsPerSecond / fps) * (tilePitch / orbitalPitch)).toFixed(4));
}

export function resolveOrbitHref(href: string | null | undefined, lang: OrbitLang) {
  if (!href) return null;
  const normalizedHref = href.startsWith('/') ? href : `/${href}`;
  return lang === 'es' ? normalizedHref : `/${lang}${normalizedHref}`;
}

function isImageType(type: string) {
  return ORBIT_IMAGE_TYPES.includes(type as (typeof ORBIT_IMAGE_TYPES)[number]);
}

function isVideoType(type: string) {
  return ORBIT_VIDEO_TYPES.includes(type as (typeof ORBIT_VIDEO_TYPES)[number]);
}

export function validateOrbitMediaUpload(file: File, expectedKind: 'image' | 'video' | 'auto' = 'auto') {
  const detectedKind = isImageType(file.type) ? 'image' : isVideoType(file.type) ? 'video' : null;
  const kind = expectedKind === 'auto' ? detectedKind : expectedKind;

  if (!kind || (kind === 'image' && !isImageType(file.type)) || (kind === 'video' && !isVideoType(file.type))) {
    return expectedKind === 'video'
      ? 'Use MP4, WebM, or QuickTime format.'
      : 'Use JPG, PNG, WebP, or GIF format.';
  }

  if (kind === 'image' && file.size > ORBIT_IMAGE_MAX_BYTES) {
    return 'Images must be 2MB or smaller.';
  }

  if (kind === 'video' && file.size > ORBIT_VIDEO_MAX_BYTES) {
    return 'Videos must be 8MB or smaller.';
  }

  return null;
}

export function validateOrbitMediaItem(item: OrbitMedia) {
  const errors: string[] = [];

  if (!item.src.trim()) {
    errors.push('Orbit media requires a source file.');
  }

  if (item.type === 'image' && item.src.trim() && !IMAGE_SOURCE_PATTERN.test(item.src)) {
    errors.push('Orbit images must use a JPG, PNG, WebP, GIF, or SVG source.');
  }

  if (item.type === 'video' && item.src.trim() && !VIDEO_SOURCE_PATTERN.test(item.src)) {
    errors.push('Orbit videos must use an MP4, WebM, or MOV source.');
  }

  if (item.type === 'video' && !item.poster?.trim()) {
    errors.push('Orbit videos require a poster image.');
  }

  for (const field of ['label', 'alt'] as const) {
    const value = item[field];
    if (!value.es.trim()) {
      errors.push(`Orbit ${field} needs at least a Spanish value.`);
    }
  }

  return errors;
}

export function isOrbitImageSource(src: string) {
  return IMAGE_SOURCE_PATTERN.test(src);
}

export function isOrbitVideoSource(src: string) {
  return VIDEO_SOURCE_PATTERN.test(src);
}

export function buildOrbitUploadPath(id: string, field: 'src' | 'poster', file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || (field === 'poster' ? 'jpg' : 'png');
  const safeId = id.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'orbit-item';
  return `/images/site/${safeId}${field === 'poster' ? '-poster' : ''}.${extension}`;
}

export function applySpanishFallbackToCodeManagedLocales(text: LocalizedText) {
  const nextText = { ...text };
  for (const locale of LOCALIZED_FALLBACKS) {
    if (!nextText[locale]?.trim()) {
      nextText[locale] = nextText.es;
    }
  }
  return nextText;
}
