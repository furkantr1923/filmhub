import { storage } from '../db';
import type { MediaItem } from '../types/db';
import type { MediaDetail, MediaKey } from '../types/media';

/** Detay verisinden yerelde saklanacak sade anlık görüntüyü üretir. */
export function toMediaItem(d: MediaDetail): MediaItem {
  return {
    key: d.key,
    tmdbId: d.tmdbId,
    type: d.type,
    kind: d.kind,
    title: d.title,
    originalTitle: d.originalTitle,
    posterPath: d.posterPath,
    backdropPath: d.backdropPath,
    releaseDate: d.releaseDate,
    year: d.year,
    voteAverage: d.voteAverage,
    genres: d.genres,
    countries: d.productionCountries.length
      ? d.productionCountries.map((c) => c.code)
      : d.originCountries,
    runtime: d.type === 'movie' ? d.runtime : d.episodeRunTime,
    updatedAt: Date.now(),
  };
}

export const mediaRepository = {
  async upsert(item: MediaItem) {
    await storage().put('mediaItems', item);
  },
  get(key: MediaKey) {
    return storage().get<MediaItem>('mediaItems', key);
  },
  async getMany(keys: MediaKey[]): Promise<Map<MediaKey, MediaItem>> {
    const all = await storage().getAll<MediaItem>('mediaItems');
    const wanted = new Set(keys);
    return new Map(all.filter((m) => wanted.has(m.key)).map((m) => [m.key, m]));
  },
  getAll() {
    return storage().getAll<MediaItem>('mediaItems');
  },
};
