/**
 * E2E testleri için deterministik sahte TMDB sunucusu.
 * Gerçek TMDB yanıtlarının yapısını taklit eder; içerik adları tamamen hayalidir ve
 * yalnızca testlerde kullanılır (uygulamanın kendisi asla sahte veri üretmez).
 */
const ADJ = ['Sessiz', 'Kayıp', 'Son', 'Gizli', 'Kırık', 'Uzak', 'Karanlık', 'Altın', 'Soğuk', 'Yalnız', 'Derin', 'Sonsuz'];
const NOUN = ['Liman', 'Tren', 'Şehir', 'Yaz', 'Ayna', 'Ada', 'Vadi', 'Fener', 'Rüzgâr', 'Saat', 'Orman', 'Yıldız'];
export const VALID_KEY = 'e2e0valid0key0000000000000000000';

const GENRES_MOVIE = [
  [28, 'Aksiyon'], [12, 'Macera'], [16, 'Animasyon'], [35, 'Komedi'], [80, 'Suç'], [99, 'Belgesel'], [18, 'Dram'],
  [10751, 'Aile'], [14, 'Fantastik'], [36, 'Tarih'], [27, 'Korku'], [10402, 'Müzik'], [9648, 'Gizem'], [10749, 'Romantik'],
  [878, 'Bilim-Kurgu'], [53, 'Gerilim'], [10752, 'Savaş'], [37, 'Vahşi Batı'],
].map(([id, name]) => ({ id, name }));
const GENRES_TV = [
  [10759, 'Aksiyon & Macera'], [16, 'Animasyon'], [35, 'Komedi'], [80, 'Suç'], [99, 'Belgesel'], [18, 'Dram'],
  [10751, 'Aile'], [9648, 'Gizem'], [10765, 'Bilim Kurgu & Fantazi'], [37, 'Vahşi Batı'],
].map(([id, name]) => ({ id, name }));

const title = (id) => `${ADJ[id % ADJ.length]} ${NOUN[Math.floor(id / ADJ.length) % NOUN.length]}${id > 143 ? ` ${Math.floor(id / 144) + 1}` : ''}`;
const date = (id) => {
  const today = new Date();
  const d = id % 7 === 0 ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + (id % 60)) : new Date(1975 + (id % 50), id % 12, 1 + (id % 27));
  return d.toISOString().slice(0, 10);
};

function movie(id) {
  const g = GENRES_MOVIE[id % GENRES_MOVIE.length].id;
  return {
    id, media_type: 'movie', title: title(id), original_title: `The ${NOUN[id % NOUN.length]} ${id}`,
    poster_path: `/poster${id}.jpg`, backdrop_path: `/backdrop${id}.jpg`,
    overview: `${title(id)}, küçük bir kasabada geçmişiyle yüzleşmek zorunda kalan bir karakterin hikâyesini anlatıyor. Test verisi.`,
    release_date: date(id), vote_average: 5.5 + (id % 35) / 10, vote_count: 200 + id * 37, popularity: 1000 - id,
    genre_ids: [g, id % 3 ? 18 : 53], origin_country: [['US', 'TR', 'GB', 'FR', 'KR'][id % 5]],
  };
}

function tv(id) {
  const g = GENRES_TV[id % GENRES_TV.length].id;
  return {
    id, media_type: 'tv', name: `${title(id)} Dizisi`, original_name: `${NOUN[id % NOUN.length]} Series`,
    poster_path: `/tvposter${id}.jpg`, backdrop_path: `/tvbackdrop${id}.jpg`,
    overview: 'Birbirine bağlı hayatların sürükleyici hikâyesi. Test verisi.', first_air_date: date(id),
    vote_average: 6 + (id % 30) / 10, vote_count: 100 + id * 11, popularity: 900 - (id - 1000), genre_ids: [g],
    origin_country: [['US', 'TR', 'KR'][id % 3]],
  };
}

const paged = (items, page = 1, perPage = 20) => ({
  page, total_pages: Math.ceil(items.length / perPage), total_results: items.length,
  results: items.slice((page - 1) * perPage, page * perPage),
});

const MOVIES = Array.from({ length: 200 }, (_, i) => movie(i + 1));
const SHOWS = Array.from({ length: 80 }, (_, i) => tv(i + 1001));
const PEOPLE = Array.from({ length: 30 }, (_, i) => ({
  id: 5000 + i, name: `${['Ayşe', 'Mehmet', 'Elif', 'Can', 'Deniz', 'Zeynep'][i % 6]} ${['Yıldız', 'Kaya', 'Demir', 'Aksoy', 'Ateş'][i % 5]}`,
  profile_path: `/person${i}.jpg`, known_for_department: i % 4 ? 'Acting' : 'Directing', media_type: 'person', popularity: 50 - i,
  known_for: [MOVIES[i]],
}));

function movieDetail(id) {
  const m = movie(id);
  const g = GENRES_MOVIE.filter((x) => m.genre_ids.includes(x.id));
  return {
    ...m, genres: g, runtime: 90 + (id % 60), tagline: id % 2 ? 'Her son yeni bir başlangıçtır.' : '', status: 'Released',
    production_countries: [{ iso_3166_1: m.origin_country[0], name: m.origin_country[0] }],
    production_companies: [{ id: 1, name: 'Hayal Film Yapım', logo_path: null }],
    spoken_languages: [{ iso_639_1: 'tr', name: 'Türkçe' }, { iso_639_1: 'en', name: 'English' }],
    imdb_id: `tt${String(1000000 + id)}`, budget: 20000000 + id * 1000, revenue: 60000000 + id * 5000,
    credits: {
      cast: PEOPLE.slice(0, 10).map((p, i) => ({ id: p.id, name: p.name, character: `Karakter ${i + 1}`, profile_path: p.profile_path, order: i })),
      crew: [{ id: PEOPLE[0].id, name: PEOPLE[0].name, job: 'Director', department: 'Directing', profile_path: PEOPLE[0].profile_path },
        { id: PEOPLE[4].id, name: PEOPLE[4].name, job: 'Original Music Composer', department: 'Sound', profile_path: null }],
    },
    videos: { results: [{ key: 'e2eTrailer01', name: 'Resmi Fragman', type: 'Trailer', site: 'YouTube', official: true, iso_639_1: 'tr' },
      { key: 'e2eTeaser01', name: 'Teaser', type: 'Teaser', site: 'YouTube', official: true, iso_639_1: 'en' }] },
    images: { backdrops: [1, 2, 3, 4].map((i) => ({ file_path: `/gallery${id}_${i}.jpg`, vote_average: 5 - i })), posters: [] },
    similar: paged(MOVIES.slice(id % 50, (id % 50) + 12)),
    recommendations: paged(MOVIES.slice((id % 50) + 20, (id % 50) + 32)),
  };
}

function tvDetail(id) {
  const s = tv(id);
  return {
    ...s, genres: GENRES_TV.filter((x) => s.genre_ids.includes(x.id)), status: 'Ended', episode_run_time: [45],
    number_of_seasons: 3, number_of_episodes: 24, in_production: false,
    last_episode_to_air: { season_number: 3, episode_number: 8 },
    seasons: [0, 1, 2, 3].map((n) => ({ season_number: n, name: n ? `${n}. Sezon` : 'Özel Bölümler', episode_count: n ? 8 : 2, air_date: `${2015 + n}-01-10`, poster_path: `/season${id}_${n}.jpg` })),
    created_by: [{ id: PEOPLE[1].id, name: PEOPLE[1].name, profile_path: PEOPLE[1].profile_path }],
    production_countries: [], production_companies: [], spoken_languages: [{ iso_639_1: 'tr' }],
    credits: { cast: PEOPLE.slice(3, 9).map((p, i) => ({ id: p.id, name: p.name, character: `Rol ${i + 1}`, profile_path: p.profile_path, order: i })), crew: [] },
    videos: { results: [{ key: 'e2eTvTrailer', name: 'Sezon Fragmanı', type: 'Trailer', site: 'YouTube', official: true }] },
    images: { backdrops: [], posters: [] }, similar: paged(SHOWS.slice(0, 10)), recommendations: paged(SHOWS.slice(10, 20)),
    external_ids: { imdb_id: null },
  };
}

function season(id, n) {
  return {
    season_number: n, name: n ? `${n}. Sezon` : 'Özel Bölümler', overview: '', air_date: `${2015 + n}-01-10`, poster_path: null,
    episodes: Array.from({ length: n ? 8 : 2 }, (_, i) => ({
      season_number: n, episode_number: i + 1, name: `Bölüm adı ${i + 1}`, overview: 'Bölüm özeti (test).',
      air_date: `${2015 + n}-0${1 + Math.floor(i / 4)}-1${i % 9}`, runtime: 44 + (i % 3), still_path: `/still${id}_${n}_${i}.jpg`, vote_average: 7.8,
    })),
  };
}

export function handleTmdb(urlString) {
  const url = new URL(urlString);
  const p = url.pathname.replace(/^\/3/, '');
  const q = url.searchParams;
  const page = Number(q.get('page') || 1);
  const key = q.get('api_key');
  if (key !== VALID_KEY) return { status: 401, body: { success: false, status_message: 'Invalid API key' } };
  let m;
  if (p === '/authentication') return { status: 200, body: { success: true } };
  if (p === '/genre/movie/list') return { status: 200, body: { genres: GENRES_MOVIE } };
  if (p === '/genre/tv/list') return { status: 200, body: { genres: GENRES_TV } };
  if (p.startsWith('/trending/all')) return { status: 200, body: paged([...MOVIES.slice(0, 10), ...SHOWS.slice(0, 10)].sort((a, b) => a.id % 7 - b.id % 7), page) };
  if (p.startsWith('/trending/tv') || p === '/tv/popular' || p === '/tv/top_rated') return { status: 200, body: paged(SHOWS, page) };
  if (p.startsWith('/trending/movie') || p.startsWith('/movie/popular') || p === '/movie/top_rated' || p === '/movie/now_playing' || p === '/movie/upcoming') {
    return { status: 200, body: paged(p === '/movie/top_rated' ? [...MOVIES].reverse() : MOVIES, page) };
  }
  if (p === '/discover/movie' || p === '/discover/tv') {
    let list = p.endsWith('movie') ? MOVIES : SHOWS;
    const g = q.get('with_genres');
    if (g) list = list.filter((x) => x.genre_ids.includes(Number(g)));
    const from = q.get('primary_release_date.gte') || q.get('first_air_date.gte');
    const to = q.get('primary_release_date.lte') || q.get('first_air_date.lte');
    const field = p.endsWith('movie') ? 'release_date' : 'first_air_date';
    if (from) list = list.filter((x) => x[field] >= from);
    if (to) list = list.filter((x) => x[field] <= to);
    return { status: 200, body: paged(list, page) };
  }
  if ((m = /^\/movie\/(\d+)$/.exec(p))) return Number(m[1]) > 200 ? { status: 404, body: {} } : { status: 200, body: movieDetail(Number(m[1])) };
  if ((m = /^\/tv\/(\d+)\/season\/(\d+)$/.exec(p))) return { status: 200, body: season(Number(m[1]), Number(m[2])) };
  if ((m = /^\/tv\/(\d+)$/.exec(p))) return { status: 200, body: tvDetail(Number(m[1])) };
  if ((m = /^\/person\/(\d+)$/.exec(p))) {
    const person = PEOPLE.find((x) => x.id === Number(m[1])) ?? PEOPLE[0];
    return { status: 200, body: { ...person, combined_credits: { cast: MOVIES.slice(0, 8).map((x) => ({ ...x, character: 'Başrol' })), crew: SHOWS.slice(0, 3).map((x) => ({ ...x, job: 'Director' })) } } };
  }
  const query = (q.get('query') || '').toLocaleLowerCase('tr');
  const match = (t) => t.toLocaleLowerCase('tr').includes(query);
  if (p === '/search/multi') return { status: 200, body: paged([...MOVIES.filter((x) => match(x.title)), ...SHOWS.filter((x) => match(x.name)), ...PEOPLE.filter((x) => match(x.name))], page) };
  if (p === '/search/movie') return { status: 200, body: paged(MOVIES.filter((x) => match(x.title)), page) };
  if (p === '/search/tv') return { status: 200, body: paged(SHOWS.filter((x) => match(x.name)), page) };
  if (p === '/search/person') return { status: 200, body: paged(PEOPLE.filter((x) => match(x.name)), page) };
  return { status: 404, body: { status_message: 'not mocked' } };
}

/** Görseller için hafif SVG yer tutucu: yol bilgisinden renk üretir. */
export function placeholderImage(urlString) {
  let h = 0;
  for (const c of urlString) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const wide = /backdrop|gallery|still|w780|w1280|w300|original/.test(urlString) && !/poster/.test(urlString);
  const [w, hgt] = wide ? [1280, 720] : [500, 750];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,38%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},55%,12%)"/></linearGradient><radialGradient id="b" cx=".7" cy=".3" r=".8"><stop offset="0" stop-color="hsla(${(hue + 30) % 360},80%,70%,.45)"/><stop offset="1" stop-color="transparent"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/><circle cx="${w * 0.3}" cy="${hgt * 0.65}" r="${Math.min(w, hgt) * 0.22}" fill="hsla(${hue},30%,90%,.08)"/></svg>`;
}
