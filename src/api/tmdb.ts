import { storage } from '../db';
import type { ApiCacheEntry } from '../types/db';
import type { Genre, MediaDetail, MediaSummary, MediaType, Paged, PersonDetail, PersonSummary, SeasonDetail } from '../types/media';
import { DOCUMENTARY_GENRE_ID } from '../types/media';
import { getApiKey } from './config';
import { ApiError } from './errors';
import {
  mapDetail, mapPaged, mapPerson, mapPersonDetail, mapSeason, uniqueByKey,
  type RawDetail, type RawMedia, type RawPaged, type RawSeason,
} from './mappers';
import { TmdbClient, isBearerToken, TMDB_BASE, type Params, type PersistentCache } from './tmdbClient';

const LANG = 'tr-TR';
const REGION = 'TR';
const MIN = 60_000;
const HOUR = 60 * MIN;

/** IndexedDB tabanlı kalıcı önbellek: uygulama yeniden açıldığında tekrar istek atılmaz. */
const persistentCache: PersistentCache = {
  async get(url) {
    const e = await storage().get<ApiCacheEntry>('apiCache', url);
    if (!e) return undefined;
    if (e.expiresAt < Date.now()) {
      storage().delete('apiCache', url).catch(() => undefined);
      return undefined;
    }
    return e.data;
  },
  async set(url, data, ttlMs) {
    if (ttlMs < 30 * MIN) return; // kısa ömürlü yanıtları diske yazma
    await storage().put<ApiCacheEntry>('apiCache', { url, data, expiresAt: Date.now() + ttlMs });
  },
};

export const client = new TmdbClient({ getKey: getApiKey, persistentCache });

/** Süresi dolmuş önbellek kayıtlarını temizler (açılışta çağrılır). */
export async function pruneApiCache() {
  const all = await storage().getAll<ApiCacheEntry>('apiCache');
  const now = Date.now();
  await storage().deleteMany('apiCache', all.filter((e) => e.expiresAt < now).map((e) => e.url));
}

export async function clearApiCache() {
  client.clearMemory();
  await storage().clear('apiCache');
}

/** Anahtarı doğrudan TMDB'ye sorarak doğrular. */
export async function validateApiKey(key: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const k = key.trim();
  if (!k) return false;
  const url = isBearerToken(k) ? `${TMDB_BASE}/authentication` : `${TMDB_BASE}/authentication?api_key=${encodeURIComponent(k)}`;
  let res: Response;
  try {
    res = await fetchImpl(url, { headers: isBearerToken(k) ? { Authorization: `Bearer ${k}`, Accept: 'application/json' } : { Accept: 'application/json' } });
  } catch {
    throw new ApiError('network');
  }
  if (res.status === 401) return false;
  if (!res.ok) throw new ApiError(res.status >= 500 ? 'server' : 'unknown', res.status);
  return true;
}

const list = async (path: string, type: MediaType | undefined, params: Params = {}, ttl = 3 * HOUR) =>
  mapPaged(await client.get<RawPaged>(path, { language: LANG, ...params }, ttl), type);

/* ---------- Keşif ve listeler ---------- */

export const tmdb = {
  trending: (type: 'movie' | 'tv' | 'all', window: 'day' | 'week' = 'week', page = 1) =>
    list(`/trending/${type}/${window}`, type === 'all' ? undefined : type, { page }, window === 'day' ? HOUR : 3 * HOUR),
  popularMovies: (page = 1) => list('/movie/popular', 'movie', { page, region: REGION }),
  popularTv: (page = 1) => list('/tv/popular', 'tv', { page }),
  topRatedMovies: (page = 1) => list('/movie/top_rated', 'movie', { page }, 12 * HOUR),
  topRatedTv: (page = 1) => list('/tv/top_rated', 'tv', { page }, 12 * HOUR),
  upcomingMovies: (page = 1) => list('/movie/upcoming', 'movie', { page, region: REGION }),
  nowPlayingMovies: (page = 1) => list('/movie/now_playing', 'movie', { page, region: REGION }),
  popularDocumentaries: (page = 1) =>
    list('/discover/movie', 'movie', { page, with_genres: DOCUMENTARY_GENRE_ID, sort_by: 'popularity.desc', 'vote_count.gte': 20 }, 6 * HOUR),

  discover: (type: MediaType, f: DiscoverFilters, page = 1) => list(`/discover/${type}`, type, { page, ...discoverParams(type, f) }, 3 * HOUR),

  async genres(type: MediaType): Promise<Genre[]> {
    const r = await client.get<{ genres: Genre[] }>(`/genre/${type}/list`, { language: LANG }, 7 * 24 * HOUR);
    return r.genres ?? [];
  },

  /* ---------- Detay ---------- */

  async details(type: MediaType, id: number): Promise<MediaDetail> {
    const append = type === 'movie'
      ? 'credits,videos,images,similar,recommendations'
      : 'credits,videos,images,similar,recommendations,external_ids';
    const raw = await client.get<RawDetail>(`/${type}/${id}`, {
      language: LANG,
      append_to_response: append,
      include_video_language: 'tr,en,null',
      include_image_language: 'tr,en,null',
    }, 12 * HOUR);
    const detail = mapDetail(raw, type);
    // Türkçe özet yoksa İngilizce özete düş (veri uydurulmaz, yalnızca dil değişir)
    if (!detail.overview) {
      try {
        const en = await client.get<RawDetail>(`/${type}/${id}`, { language: 'en-US' }, 12 * HOUR);
        detail.overview = en.overview ?? '';
        if (!detail.tagline) detail.tagline = en.tagline ?? '';
      } catch { /* İngilizce özet de yoksa boş kalır */ }
    }
    return detail;
  },

  async season(seriesId: number, seasonNumber: number): Promise<SeasonDetail> {
    const raw = await client.get<RawSeason>(`/tv/${seriesId}/season/${seasonNumber}`, { language: LANG }, 6 * HOUR);
    return mapSeason(raw, seriesId);
  },

  async person(id: number): Promise<PersonDetail> {
    const raw = await client.get<RawMedia & { combined_credits?: { cast?: RawMedia[]; crew?: RawMedia[] } }>(
      `/person/${id}`, { language: LANG, append_to_response: 'combined_credits' }, 24 * HOUR);
    return mapPersonDetail(raw);
  },

  /* ---------- Arama ---------- */

  async searchMulti(query: string, page = 1): Promise<{ media: Paged<MediaSummary>; people: PersonSummary[] }> {
    const raw = await client.get<RawPaged>('/search/multi', { query, page, language: LANG, include_adult: false }, 30 * MIN);
    return {
      media: mapPaged(raw),
      people: (raw.results ?? []).filter((r) => r.media_type === 'person').map(mapPerson),
    };
  },

  searchMedia: (type: MediaType, query: string, page = 1, year?: number | null) =>
    list(`/search/${type}`, type, {
      query, page, include_adult: false,
      ...(year ? (type === 'movie' ? { primary_release_year: year } : { first_air_date_year: year }) : {}),
    }, 30 * MIN),

  async searchPeople(query: string, page = 1): Promise<Paged<PersonSummary>> {
    const raw = await client.get<RawPaged>('/search/person', { query, page, language: LANG, include_adult: false }, 30 * MIN);
    return {
      page: raw.page,
      totalPages: Math.min(raw.total_pages, 500),
      totalResults: raw.total_results,
      results: (raw.results ?? []).map(mapPerson),
    };
  },
};

/* ---------- Keşif filtreleri ---------- */

export type DiscoverSort = 'popularity' | 'rating' | 'newest' | 'oldest' | 'votes';

export interface DiscoverFilters {
  genreId?: number | null;
  year?: number | null;
  decade?: number | null;
  minRating?: number | null;
  country?: string | null;
  sort?: DiscoverSort;
  releasedFrom?: string | null;
  releasedTo?: string | null;
  minVotes?: number | null;
}

export function discoverParams(type: MediaType, f: DiscoverFilters): Params {
  const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
  const sortMap: Record<DiscoverSort, string> = {
    popularity: 'popularity.desc',
    rating: 'vote_average.desc',
    newest: `${dateField}.desc`,
    oldest: `${dateField}.asc`,
    votes: 'vote_count.desc',
  };
  const p: Params = {
    sort_by: sortMap[f.sort ?? 'popularity'],
    include_adult: false,
    with_genres: f.genreId ?? undefined,
    with_origin_country: f.country ?? undefined,
    'vote_average.gte': f.minRating ?? undefined,
    // Puana göre sıralamada az oylu içerikler listeyi bozmasın
    'vote_count.gte': f.minVotes ?? (f.sort === 'rating' || f.minRating ? 150 : undefined),
  };
  if (f.year) {
    p[`${dateField}.gte`] = `${f.year}-01-01`;
    p[`${dateField}.lte`] = `${f.year}-12-31`;
  } else if (f.decade) {
    p[`${dateField}.gte`] = `${f.decade}-01-01`;
    p[`${dateField}.lte`] = `${f.decade + 9}-12-31`;
  }
  if (f.releasedFrom) p[`${dateField}.gte`] = f.releasedFrom;
  if (f.releasedTo) p[`${dateField}.lte`] = f.releasedTo;
  // Henüz yayınlanmamış içerikler "en yeni" sıralamasında başa gelmesin
  if (f.sort === 'newest' && !f.releasedTo && !f.year) p[`${dateField}.lte`] = new Date().toISOString().slice(0, 10);
  return p;
}

export { uniqueByKey };
