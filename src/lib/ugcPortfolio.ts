import {
  ORBIT_IMAGE_MAX_BYTES,
  ORBIT_IMAGE_TYPES,
  ORBIT_VIDEO_MAX_BYTES,
  ORBIT_VIDEO_TYPES,
} from './orbitMedia.ts';
import type { LocalizedText, UgcCategory, UgcPortfolioItem } from './siteData.ts';

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
      ? 'Use JPG, PNG, WebP, or GIF format.'
      : 'Use MP4, WebM, or QuickTime format.';
  }

  if (expectedKind === 'image' && file.size > ORBIT_IMAGE_MAX_BYTES) {
    return 'Images must be 2MB or smaller.';
  }

  if (expectedKind === 'video' && file.size > ORBIT_VIDEO_MAX_BYTES) {
    return 'Videos must be 8MB or smaller.';
  }

  return null;
}

export function validateUgcPortfolioItem(item: UgcPortfolioItem) {
  const errors: string[] = [];

  if (!item.src.trim()) {
    errors.push('UGC items require a source file.');
  }

  if (item.type === 'image' && item.src.trim() && !UGC_IMAGE_SOURCE_PATTERN.test(item.src)) {
    errors.push('UGC images must use a JPG, PNG, WebP, or GIF source.');
  }

  if (item.type === 'video' && item.src.trim() && !UGC_VIDEO_SOURCE_PATTERN.test(item.src)) {
    errors.push('UGC videos must use an MP4, WebM, or MOV source.');
  }

  if (item.type === 'video' && !item.poster?.trim()) {
    errors.push('UGC videos require a poster image.');
  }

  if (item.type === 'image' && item.poster !== null) {
    errors.push('UGC images should not keep a poster value.');
  }

  for (const field of ['label', 'title', 'description', 'format', 'alt'] as const) {
    const value = item[field];

    if (UGC_EDITABLE_LANGS.some((lang) => !value[lang]?.trim())) {
      errors.push(`UGC ${field} needs Spanish, English, and French values.`);
    }

    if (field === 'description') {
      for (const locale of Object.keys(value) as Array<keyof LocalizedText>) {
        if (getSentenceCount(value[locale]) > 2) {
          errors.push(`UGC description must stay within two sentences for ${locale}.`);
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

export function resetFocusedVideoPlayback(video: HTMLVideoElement | null | undefined) {
  if (!video) return;
  video.pause();
  video.currentTime = 0;
  video.muted = true;
}
