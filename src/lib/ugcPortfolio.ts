import {
  ORBIT_IMAGE_MAX_BYTES,
  ORBIT_IMAGE_TYPES,
  ORBIT_VIDEO_MAX_BYTES,
  ORBIT_VIDEO_TYPES,
} from './orbitMedia.ts';
import type { LocalizedText, UgcCategory, UgcPortfolioItem } from './siteData.ts';
import { toHttpsEmbedUrl } from './videoEmbed.ts';

export type UgcFilter = 'all' | UgcCategory;
export type UgcTileVisibility = 'visible' | 'blank';
export type UgcLocalizedField = 'label' | 'title' | 'description' | 'format' | 'alt';

export const INITIAL_UGC_FILTER: UgcFilter = 'all';
export const UGC_EDITABLE_LANGS = ['es', 'en', 'fr'] as const;

const LOCALIZED_FALLBACKS = ['de', 'it', 'ca'] as const;
const UGC_IMAGE_SOURCE_PATTERN = /\.(?:jpe?g|png|webp|gif)(?:\?.*)?$/i;
const UGC_VIDEO_SOURCE_PATTERN = /\.(?:mp4|webm|mov|qt)(?:\?.*)?$/i;

export function filterUgcPortfolio(items: UgcPortfolioItem[], filter: UgcFilter) {
  return filter === 'all' ? items : items.filter((item) => item.category === filter);
}

export function getUgcTileVisibility(item: UgcPortfolioItem, filter: UgcFilter): UgcTileVisibility {
  return filter === 'all' || item.category === filter ? 'visible' : 'blank';
}

export function canOpenUgcItem(state) {
  return state.visibility === 'visible';
}

export function isUgcViewerOpen(activeId: string | null) {
  return activeId !== null;
}

export function getNextUgcIndex(
  count: number,
  index: number,
  direction: 'previous' | 'next',
) {
  if (count <= 0) return 0;
  return direction === 'next'
    ? (index + 1) % count
    : (index - 1 + count) % count;
}

export function getSentenceCount(value: string) {
  return value
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .length;
}

export function applySpanishFallbackToUgcLocales(text: LocalizedText, previousSpanish = '') {
  const nextText = { ...text };

  for (const locale of LOCALIZED_FALLBACKS) {
    if (!nextText[locale]?.trim() || nextText[locale] === previousSpanish) {
      nextText[locale] = nextText.es;
    }
  }

  return nextText;
}

export function validateUgcMediaUpload(file: File, expectedKind: 'image' | 'video') {
  const acceptedTypes = expectedKind === 'image' ? ORBIT_IMAGE_TYPES : ORBIT_VIDEO_TYPES;

  if (!acceptedTypes.includes(file.type as (typeof acceptedTypes)[number])) {
    return expectedKind === 'image'
      ? 'Usa formato JPG, PNG, WebP o GIF.'
      : 'Usa formato MP4, WebM o QuickTime.';
  }

  if (expectedKind === 'image' && file.size > ORBIT_IMAGE_MAX_BYTES) {
    return 'Las imágenes deben pesar 2MB o menos.';
  }

  if (expectedKind === 'video' && file.size > ORBIT_VIDEO_MAX_BYTES) {
    return 'Los vídeos deben pesar 8MB o menos.';
  }

  return null;
}

export function validateUgcPortfolioItem(item: UgcPortfolioItem) {
  const errors: string[] = [];
  const src = item.src.trim();
  const hasValidVideoEmbed = item.type === 'video' && toHttpsEmbedUrl(item.embedUrl) !== null;

  if (!src && !hasValidVideoEmbed) {
    errors.push('Los elementos UGC necesitan un archivo de origen.');
  }

  if (item.type === 'image' && src && !UGC_IMAGE_SOURCE_PATTERN.test(src)) {
    errors.push('Las imágenes UGC deben usar un archivo de origen JPG, PNG, WebP o GIF.');
  }

  if (item.type === 'video' && src && !hasValidVideoEmbed && !UGC_VIDEO_SOURCE_PATTERN.test(src)) {
    errors.push('Los vídeos UGC deben usar un archivo de origen MP4, WebM o MOV.');
  }

  if (item.type === 'video' && !item.poster?.trim()) {
    errors.push('Los vídeos UGC necesitan una imagen de póster.');
  }

  if (item.type === 'image' && item.poster !== null) {
    errors.push('Las imágenes UGC no deben conservar un valor de póster.');
  }

  const ugcFieldLabels: Record<UgcLocalizedField, string> = {
    label: 'etiqueta',
    title: 'título',
    description: 'descripción',
    format: 'formato',
    alt: 'alt',
  };

  for (const field of ['label', 'title', 'description', 'format', 'alt'] as const) {
    const value = item[field];

    if (UGC_EDITABLE_LANGS.some((lang) => !value[lang]?.trim())) {
      errors.push(`El campo ${ugcFieldLabels[field]} de UGC necesita valores en español, inglés y francés.`);
    }

    if (field === 'description') {
      for (const locale of Object.keys(value) as Array<keyof LocalizedText>) {
        if (getSentenceCount(value[locale]) > 2) {
          errors.push(`La descripción UGC debe tener como máximo dos frases en ${locale}.`);
        }
      }
    }
  }

  return errors;
}

export function playFocusedVideoPlayback(
  video: HTMLVideoElement | null | undefined,
  onPlaybackChange?: (isPlaying: boolean) => void,
) {
  const resolvePlayback = (isPlaying: boolean) => {
    onPlaybackChange?.(isPlaying);
    return isPlaying;
  };

  if (!video) {
    return Promise.resolve(resolvePlayback(false));
  }

  video.currentTime = 0;
  video.loop = true;
  video.muted = false;

  try {
    const playback = video.play();
    if (playback instanceof Promise) {
      return playback
        .then(() => resolvePlayback(true))
        .catch(() => resolvePlayback(false));
    }

    return Promise.resolve(resolvePlayback(!video.paused));
  } catch {
    return Promise.resolve(resolvePlayback(false));
  }
}

export function stopPreviewVideoPlayback(video: HTMLVideoElement | null | undefined) {
  if (!video) return;
  video.pause();
  video.currentTime = 0;
  video.muted = true;
}

export function stopAllPreviewVideoPlayback(previewVideos: Record<string, HTMLVideoElement | null | undefined>) {
  for (const video of Object.values(previewVideos)) {
    stopPreviewVideoPlayback(video);
  }
}

export function resetFocusedVideoPlayback(video: HTMLVideoElement | null | undefined) {
  if (!video) return;
  video.pause();
  video.currentTime = 0;
  video.muted = true;
}
