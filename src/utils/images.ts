/**
 * TMDB görsel adresleri. Her kullanım yerine uygun boyut seçilerek gereksiz büyük
 * görsel indirilmez (performans ve veri tasarrufu).
 */
export const IMAGE_BASE = 'https://image.tmdb.org/t/p/';

export type PosterSize = 'w154' | 'w185' | 'w342' | 'w500' | 'w780';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type ProfileSize = 'w45' | 'w185' | 'h632';
export type StillSize = 'w185' | 'w300';

export function img(path: string | null | undefined, size: string): string | null {
  return path ? `${IMAGE_BASE}${size}${path}` : null;
}

export function posterSrcSet(path: string | null | undefined) {
  if (!path) return undefined;
  return `${IMAGE_BASE}w185${path} 185w, ${IMAGE_BASE}w342${path} 342w, ${IMAGE_BASE}w500${path} 500w`;
}

export function backdropSrcSet(path: string | null | undefined) {
  if (!path) return undefined;
  return `${IMAGE_BASE}w780${path} 780w, ${IMAGE_BASE}w1280${path} 1280w, ${IMAGE_BASE}original${path} 1920w`;
}

export const youtubeThumb = (key: string) => `https://i.ytimg.com/vi/${key}/hqdefault.jpg`;
export const youtubeWatch = (key: string) => `https://www.youtube.com/watch?v=${key}`;
export const youtubeEmbed = (key: string) =>
  `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
