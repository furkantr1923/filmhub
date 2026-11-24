/** TMDB'deki iki ana medya türü. */
export type MediaType = 'movie' | 'tv';

/** Kullanıcıya gösterilen içerik türü (belgeseller TMDB'de 99 numaralı tür ile işaretlenir). */
export type ContentKind = 'movie' | 'series' | 'documentary';

export const DOCUMENTARY_GENRE_ID = 99;

/** Tüm uygulama içinde içerikleri benzersiz tanımlayan anahtar: "movie:603" veya "tv:1399". */
export type MediaKey = `${MediaType}:${number}`;

export interface Genre {
  id: number;
  name: string;
}

/** Listelerde / kartlarda kullanılan sade içerik özeti. */
export interface MediaSummary {
  key: MediaKey;
  tmdbId: number;
  type: MediaType;
  kind: ContentKind;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  releaseDate: string | null;
  year: number | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
  originCountries: string[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath: string | null;
}

export interface Video {
  key: string;
  name: string;
  type: string;
  site: string;
  official: boolean;
  language: string;
  publishedAt: string | null;
}

export interface SeasonSummary {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  overview: string;
}

export interface Episode {
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  voteAverage: number;
}

export interface SeasonDetail {
  seriesId: number;
  seasonNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  posterPath: string | null;
  episodes: Episode[];
}

/** Detay sayfası için zenginleştirilmiş içerik. */
export interface MediaDetail extends MediaSummary {
  genres: Genre[];
  tagline: string;
  runtime: number | null;
  status: string;
  productionCountries: { code: string; name: string }[];
  productionCompanies: { id: number; name: string; logoPath: string | null }[];
  spokenLanguages: string[];
  imdbId: string | null;
  homepage: string | null;
  budget: number | null;
  revenue: number | null;
  cast: CastMember[];
  directors: CrewMember[];
  crew: CrewMember[];
  videos: Video[];
  backdrops: string[];
  posters: string[];
  similar: MediaSummary[];
  recommendations: MediaSummary[];
  /** Yalnızca diziler */
  seasons: SeasonSummary[];
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  /** Yayınlanmış son bölüm (dizi ilerlemesini doğru hesaplamak için) */
  lastEpisodeToAir: { seasonNumber: number; episodeNumber: number } | null;
  inProduction: boolean;
  episodeRunTime: number | null;
}

export interface PersonSummary {
  id: number;
  name: string;
  profilePath: string | null;
  department: string;
  knownFor: string[];
}

export interface PersonDetail {
  id: number;
  name: string;
  profilePath: string | null;
  department: string;
  credits: (MediaSummary & { role: string })[];
}

export interface Paged<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export function makeKey(type: MediaType, id: number): MediaKey {
  return `${type}:${id}`;
}

export function parseKey(key: string): { type: MediaType; id: number } | null {
  const m = /^(movie|tv):(\d+)$/.exec(key);
  return m ? { type: m[1] as MediaType, id: Number(m[2]) } : null;
}

export function kindOf(type: MediaType, genreIds: number[]): ContentKind {
  if (genreIds.includes(DOCUMENTARY_GENRE_ID)) return 'documentary';
  return type === 'movie' ? 'movie' : 'series';
}
