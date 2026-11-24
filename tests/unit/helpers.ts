import { setStorage } from '../../src/db';
import { createMemoryAdapter } from '../../src/db/memoryAdapter';
import type { MediaItem } from '../../src/types/db';
import type { MediaDetail, MediaType } from '../../src/types/media';

export function freshDb() {
  const db = createMemoryAdapter();
  setStorage(db);
  return db;
}

export function mediaItem(type: MediaType, id: number, over: Partial<MediaItem> = {}): MediaItem {
  return {
    key: `${type}:${id}`,
    tmdbId: id,
    type,
    kind: type === 'movie' ? 'movie' : 'series',
    title: `Başlık ${id}`,
    originalTitle: `Title ${id}`,
    posterPath: `/p${id}.jpg`,
    backdropPath: `/b${id}.jpg`,
    releaseDate: '2020-01-01',
    year: 2020,
    voteAverage: 7.5,
    genres: [{ id: 18, name: 'Dram' }],
    countries: ['US'],
    runtime: type === 'movie' ? 120 : 45,
    updatedAt: 0,
    ...over,
  };
}

export function seriesDetail(id: number, over: Partial<MediaDetail> = {}): MediaDetail {
  return {
    key: `tv:${id}`,
    tmdbId: id,
    type: 'tv',
    kind: 'series',
    title: `Dizi ${id}`,
    originalTitle: `Series ${id}`,
    posterPath: null,
    backdropPath: null,
    overview: '',
    releaseDate: '2019-01-01',
    year: 2019,
    voteAverage: 8,
    voteCount: 100,
    popularity: 10,
    genreIds: [18],
    originCountries: ['US'],
    genres: [{ id: 18, name: 'Dram' }],
    tagline: '',
    runtime: null,
    status: 'Ended',
    productionCountries: [],
    productionCompanies: [],
    spokenLanguages: [],
    imdbId: null,
    homepage: null,
    budget: null,
    revenue: null,
    cast: [],
    directors: [],
    crew: [],
    videos: [],
    backdrops: [],
    posters: [],
    similar: [],
    recommendations: [],
    seasons: [
      { seasonNumber: 0, name: 'Özel Bölümler', episodeCount: 2, airDate: null, posterPath: null, overview: '' },
      { seasonNumber: 1, name: 'Sezon 1', episodeCount: 3, airDate: '2019-01-01', posterPath: null, overview: '' },
      { seasonNumber: 2, name: 'Sezon 2', episodeCount: 2, airDate: '2020-01-01', posterPath: null, overview: '' },
    ],
    numberOfSeasons: 2,
    numberOfEpisodes: 5,
    lastEpisodeToAir: { seasonNumber: 2, episodeNumber: 2 },
    inProduction: false,
    episodeRunTime: 45,
    ...over,
  };
}

export function episodes(seriesId: number, season: number, count: number, runtime: number | null = 50) {
  return Array.from({ length: count }, (_, i) => ({
    seriesId,
    seasonNumber: season,
    episodeNumber: i + 1,
    name: `Bölüm ${i + 1}`,
    overview: '',
    airDate: '2019-02-01',
    runtime,
    stillPath: null,
    voteAverage: 0,
  }));
}
