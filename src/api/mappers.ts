import {
  kindOf,
  makeKey,
  type CastMember,
  type CrewMember,
  type Episode,
  type MediaDetail,
  type MediaSummary,
  type MediaType,
  type Paged,
  type PersonDetail,
  type PersonSummary,
  type SeasonDetail,
  type Video,
} from '../types/media';

/* ---- TMDB ham yanıt tipleri (yalnızca kullanılan alanlar) ---- */

export interface RawMedia {
  id: number;
  media_type?: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  origin_country?: string[];
  known_for_department?: string;
  known_for?: RawMedia[];
  character?: string;
  job?: string;
}

export interface RawPaged {
  page: number;
  total_pages: number;
  total_results: number;
  results: RawMedia[];
}

interface RawCredit { id: number; name: string; character?: string; job?: string; department?: string; profile_path: string | null; order?: number }
interface RawVideo { key: string; name: string; type: string; site: string; official?: boolean; iso_639_1?: string; published_at?: string }
interface RawImage { file_path: string; vote_average?: number; iso_639_1?: string | null }

export interface RawDetail extends RawMedia {
  tagline?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  status?: string;
  production_countries?: { iso_3166_1: string; name: string }[];
  production_companies?: { id: number; name: string; logo_path: string | null }[];
  spoken_languages?: { iso_639_1: string; name: string; english_name?: string }[];
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
  homepage?: string | null;
  budget?: number;
  revenue?: number;
  credits?: { cast?: RawCredit[]; crew?: RawCredit[] };
  created_by?: { id: number; name: string; profile_path: string | null }[];
  videos?: { results?: RawVideo[] };
  images?: { backdrops?: RawImage[]; posters?: RawImage[] };
  similar?: RawPaged;
  recommendations?: RawPaged;
  seasons?: { season_number: number; name: string; episode_count: number; air_date: string | null; poster_path: string | null; overview?: string }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  last_episode_to_air?: { season_number: number; episode_number: number } | null;
  in_production?: boolean;
}

export interface RawSeason {
  season_number: number;
  name: string;
  overview?: string;
  air_date?: string | null;
  poster_path?: string | null;
  episodes?: { season_number: number; episode_number: number; name: string; overview?: string; air_date?: string | null; runtime?: number | null; still_path?: string | null; vote_average?: number }[];
}

/* ---- Dönüştürücüler ---- */

const yearOf = (d?: string | null) => (d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null);

export function mapSummary(raw: RawMedia, typeHint?: MediaType): MediaSummary | null {
  const type = (raw.media_type ?? typeHint) as MediaType | 'person' | undefined;
  if (type !== 'movie' && type !== 'tv') return null;
  const title = (type === 'movie' ? raw.title : raw.name) ?? raw.title ?? raw.name ?? '';
  if (!raw.id || !title) return null;
  const releaseDate = (type === 'movie' ? raw.release_date : raw.first_air_date) || null;
  const genreIds = raw.genre_ids ?? raw.genres?.map((g) => g.id) ?? [];
  return {
    key: makeKey(type, raw.id),
    tmdbId: raw.id,
    type,
    kind: kindOf(type, genreIds),
    title,
    originalTitle: (type === 'movie' ? raw.original_title : raw.original_name) ?? title,
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    overview: raw.overview ?? '',
    releaseDate,
    year: yearOf(releaseDate),
    voteAverage: Math.round((raw.vote_average ?? 0) * 10) / 10,
    voteCount: raw.vote_count ?? 0,
    popularity: raw.popularity ?? 0,
    genreIds,
    originCountries: raw.origin_country ?? [],
  };
}

/** Aynı içeriğin farklı sayfalarda tekrar gelmesini engeller. */
export function uniqueByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)));
}

export function mapPaged(raw: RawPaged, typeHint?: MediaType): Paged<MediaSummary> {
  return {
    page: raw.page ?? 1,
    totalPages: Math.min(raw.total_pages ?? 1, 500), // TMDB 500 sayfadan fazlasını döndürmez
    totalResults: raw.total_results ?? 0,
    results: uniqueByKey((raw.results ?? []).map((r) => mapSummary(r, typeHint)).filter((r): r is MediaSummary => !!r)),
  };
}

export function mapPerson(raw: RawMedia): PersonSummary {
  return {
    id: raw.id,
    name: raw.name ?? '',
    profilePath: raw.profile_path ?? null,
    department: departmentLabel(raw.known_for_department),
    knownFor: (raw.known_for ?? []).map((k) => k.title ?? k.name ?? '').filter(Boolean).slice(0, 3),
  };
}

const DEPARTMENTS: Record<string, string> = {
  Acting: 'Oyuncu',
  Directing: 'Yönetmen',
  Writing: 'Senarist',
  Production: 'Yapımcı',
  Camera: 'Görüntü Yönetmeni',
  Editing: 'Kurgu',
  Sound: 'Ses / Müzik',
  Art: 'Sanat',
  'Costume & Make-Up': 'Kostüm & Makyaj',
  'Visual Effects': 'Görsel Efekt',
  Crew: 'Ekip',
  Lighting: 'Işık',
  Creator: 'Yaratıcı',
};

export function departmentLabel(dep?: string) {
  return (dep && DEPARTMENTS[dep]) || dep || '';
}

const JOBS: Record<string, string> = {
  Director: 'Yönetmen',
  Screenplay: 'Senaryo',
  Writer: 'Yazar',
  Novel: 'Roman',
  Story: 'Hikâye',
  Producer: 'Yapımcı',
  'Executive Producer': 'Baş Yapımcı',
  'Original Music Composer': 'Müzik',
  'Director of Photography': 'Görüntü Yönetmeni',
  Editor: 'Kurgu',
  Creator: 'Yaratıcı',
  Characters: 'Karakterler',
};
const KEY_JOBS = ['Screenplay', 'Writer', 'Novel', 'Story', 'Original Music Composer', 'Director of Photography', 'Editor', 'Producer'];

export function jobLabel(job: string) {
  return JOBS[job] ?? job;
}

const VIDEO_ORDER = ['Trailer', 'Teaser', 'Clip', 'Featurette', 'Behind the Scenes'];

export function mapVideos(raw?: RawVideo[]): Video[] {
  const list = (raw ?? [])
    .filter((v) => v.site === 'YouTube' && v.key && VIDEO_ORDER.includes(v.type))
    .map((v) => ({
      key: v.key,
      name: v.name,
      type: v.type,
      site: v.site,
      official: !!v.official,
      language: v.iso_639_1 ?? '',
      publishedAt: v.published_at ?? null,
    }));
  const score = (v: Video) => VIDEO_ORDER.indexOf(v.type) * 10 + (v.official ? 0 : 3) + (v.language === 'tr' ? 0 : 1);
  return uniqueByKey(list).sort((a, b) => score(a) - score(b));
}

export function mapDetail(raw: RawDetail, type: MediaType): MediaDetail {
  const base = mapSummary({ ...raw, media_type: type }, type)!;
  const cast: CastMember[] = (raw.credits?.cast ?? [])
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, 24)
    .map((c) => ({ id: c.id, name: c.name, character: c.character ?? '', profilePath: c.profile_path }));

  const crewRaw = raw.credits?.crew ?? [];
  const toCrew = (c: RawCredit): CrewMember => ({
    id: c.id,
    name: c.name,
    job: jobLabel(c.job ?? ''),
    department: c.department ?? '',
    profilePath: c.profile_path,
  });
  const directors: CrewMember[] = type === 'movie'
    ? crewRaw.filter((c) => c.job === 'Director').map(toCrew)
    : (raw.created_by ?? []).map((c) => ({ id: c.id, name: c.name, job: 'Yaratıcı', department: 'Creator', profilePath: c.profile_path }));
  const seen = new Set<string>();
  const crew = crewRaw
    .filter((c) => KEY_JOBS.includes(c.job ?? ''))
    .sort((a, b) => KEY_JOBS.indexOf(a.job ?? '') - KEY_JOBS.indexOf(b.job ?? ''))
    .filter((c) => {
      const k = `${c.id}:${c.job}`;
      return seen.has(k) ? false : (seen.add(k), true);
    })
    .slice(0, 12)
    .map(toCrew);

  const byVotes = (a: RawImage, b: RawImage) => (b.vote_average ?? 0) - (a.vote_average ?? 0);
  const seasons = (raw.seasons ?? []).map((s) => ({
    seasonNumber: s.season_number,
    name: s.name,
    episodeCount: s.episode_count ?? 0,
    airDate: s.air_date ?? null,
    posterPath: s.poster_path ?? null,
    overview: s.overview ?? '',
  }));
  const runTimes = raw.episode_run_time ?? [];

  return {
    ...base,
    genres: raw.genres ?? [],
    kind: kindOf(type, (raw.genres ?? []).map((g) => g.id)),
    tagline: raw.tagline ?? '',
    runtime: raw.runtime && raw.runtime > 0 ? raw.runtime : null,
    status: raw.status ?? '',
    productionCountries: (raw.production_countries ?? []).map((c) => ({ code: c.iso_3166_1, name: c.name })),
    productionCompanies: (raw.production_companies ?? []).slice(0, 6).map((c) => ({ id: c.id, name: c.name, logoPath: c.logo_path })),
    spokenLanguages: (raw.spoken_languages ?? []).map((l) => l.iso_639_1),
    imdbId: raw.imdb_id ?? raw.external_ids?.imdb_id ?? null,
    homepage: raw.homepage || null,
    budget: raw.budget && raw.budget > 0 ? raw.budget : null,
    revenue: raw.revenue && raw.revenue > 0 ? raw.revenue : null,
    cast,
    directors,
    crew,
    videos: mapVideos(raw.videos?.results),
    backdrops: [...(raw.images?.backdrops ?? [])].sort(byVotes).slice(0, 16).map((i) => i.file_path),
    posters: [...(raw.images?.posters ?? [])].sort(byVotes).slice(0, 10).map((i) => i.file_path),
    similar: raw.similar ? mapPaged(raw.similar, type).results.slice(0, 20) : [],
    recommendations: raw.recommendations ? mapPaged(raw.recommendations, type).results.slice(0, 20) : [],
    seasons,
    numberOfSeasons: raw.number_of_seasons ?? null,
    numberOfEpisodes: raw.number_of_episodes ?? null,
    lastEpisodeToAir: raw.last_episode_to_air
      ? { seasonNumber: raw.last_episode_to_air.season_number, episodeNumber: raw.last_episode_to_air.episode_number }
      : null,
    inProduction: !!raw.in_production,
    episodeRunTime: runTimes.length ? Math.round(runTimes.reduce((a, b) => a + b, 0) / runTimes.length) : null,
  };
}

export function mapSeason(raw: RawSeason, seriesId: number): SeasonDetail {
  return {
    seriesId,
    seasonNumber: raw.season_number,
    name: raw.name,
    overview: raw.overview ?? '',
    airDate: raw.air_date ?? null,
    posterPath: raw.poster_path ?? null,
    episodes: (raw.episodes ?? []).map((e): Episode => ({
      seriesId,
      seasonNumber: e.season_number,
      episodeNumber: e.episode_number,
      name: e.name || `${e.episode_number}. Bölüm`,
      overview: e.overview ?? '',
      airDate: e.air_date ?? null,
      runtime: e.runtime && e.runtime > 0 ? e.runtime : null,
      stillPath: e.still_path ?? null,
      voteAverage: e.vote_average ?? 0,
    })),
  };
}

export function mapPersonDetail(raw: RawMedia & { combined_credits?: { cast?: RawMedia[]; crew?: RawMedia[] } }): PersonDetail {
  const credits = [
    ...(raw.combined_credits?.cast ?? []).map((c) => ({ c, role: c.character ? `${c.character}` : 'Oyuncu' })),
    ...(raw.combined_credits?.crew ?? []).map((c) => ({ c, role: jobLabel(c.job ?? '') })),
  ]
    .map(({ c, role }) => {
      const s = mapSummary(c);
      return s ? { ...s, role } : null;
    })
    .filter((x): x is MediaSummary & { role: string } => !!x);
  // Aynı içerikte birden fazla görev varsa birleştir
  const merged = new Map<string, MediaSummary & { role: string }>();
  for (const c of credits) {
    const prev = merged.get(c.key);
    if (prev) { if (!prev.role.includes(c.role)) prev.role = `${prev.role}, ${c.role}`; }
    else merged.set(c.key, { ...c });
  }
  return {
    id: raw.id,
    name: raw.name ?? '',
    profilePath: raw.profile_path ?? null,
    department: departmentLabel(raw.known_for_department),
    credits: [...merged.values()].sort((a, b) => b.popularity - a.popularity),
  };
}
