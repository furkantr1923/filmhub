import type { ContentKind, Genre, MediaKey, MediaType } from './media';

/**
 * Yerel veritabanı varlıkları.
 * Tüm kişisel veriler yalnızca cihazda saklanır; sunucu ya da hesap yoktur.
 * Dış içerikler TMDB ID'si ile ("movie:603") tanımlanır.
 */

/** Kullanıcının etkileşime girdiği içeriğin anlık görüntüsü (istatistikler bu kayıttan hesaplanır). */
export interface MediaItem {
  key: MediaKey;
  tmdbId: number;
  type: MediaType;
  kind: ContentKind;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  year: number | null;
  voteAverage: number;
  genres: Genre[];
  countries: string[];
  /** Film süresi (dk). Dizilerde ortalama bölüm süresi. Bilinmiyorsa null. */
  runtime: number | null;
  updatedAt: number;
}

export interface WatchedItem {
  key: MediaKey;
  watchedAt: number;
  addedAt: number;
}

export interface WatchlistItem {
  key: MediaKey;
  addedAt: number;
}

export interface FavoriteItem {
  key: MediaKey;
  addedAt: number;
}

export interface PersonalRating {
  key: MediaKey;
  /** 0–10 arası, 0,5'lik adımlar */
  value: number;
  createdAt: number;
  updatedAt: number;
}

export interface PersonalReview {
  key: MediaKey;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface PersonalNote {
  key: MediaKey;
  text: string;
  updatedAt: number;
}

export type SeriesStatus = 'watching' | 'caught-up' | 'completed';

/** Dizi takibi için özet kayıt. Sezon bölüm sayıları ilerlemeyi API olmadan hesaplamaya yarar. */
export interface SeriesRecord {
  tmdbId: number;
  key: MediaKey;
  seasons: { seasonNumber: number; episodeCount: number; airedCount: number }[];
  totalEpisodes: number;
  airedEpisodes: number;
  /** Dizi bitti mi (TMDB durumu Ended/Canceled)? */
  ended: boolean;
  /** Kullanıcı diziyi elle "tamamlandı" olarak işaretledi mi? */
  manuallyCompleted: boolean;
  startedAt: number;
  updatedAt: number;
}

export interface WatchedEpisode {
  /** "1399:1:5" → dizi:sezon:bölüm */
  id: string;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  runtime: number | null;
  stillPath: string | null;
  watchedAt: number;
}

export interface CustomCollection {
  id: string;
  name: string;
  description: string;
  coverPath: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionItem {
  /** "koleksiyonId|movie:603" */
  id: string;
  collectionId: string;
  key: MediaKey;
  addedAt: number;
}

export interface SearchHistoryEntry {
  /** Normalize edilmiş arama metni */
  query: string;
  display: string;
  count: number;
  lastUsedAt: number;
}

export interface PreferenceEntry {
  key: string;
  value: unknown;
}

export interface ApiCacheEntry {
  url: string;
  data: unknown;
  expiresAt: number;
}
