import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TmdbClient, buildUrl, isBearerToken } from '../../src/api/tmdbClient';
import { ApiError } from '../../src/api/errors';
import { mapDetail, mapPaged, mapSeason, mapPersonDetail, mapVideos } from '../../src/api/mappers';
import { discoverParams } from '../../src/api/tmdb';

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function makeClient(handler: Handler, key: string | null = 'abcdef0123456789abcdef0123456789') {
  const calls: { url: string; init?: RequestInit }[] = [];
  const sleeps: number[] = [];
  const client = new TmdbClient({
    getKey: () => key,
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      return handler(url, init);
    }) as typeof fetch,
    sleep: async (ms) => { sleeps.push(ms); },
    isOnline: () => true,
  });
  return { client, calls, sleeps };
}

describe('TMDB istemcisi', () => {
  it('URL parametrelerini sıralı ve boşları atlayarak üretir', () => {
    assert.equal(buildUrl('/x', { b: 2, a: 'y', c: undefined, d: '' }), 'https://api.themoviedb.org/3/x?a=y&b=2');
  });

  it('v3 anahtarını sorguya, v4 token’ı başlığa ekler', async () => {
    const v3 = makeClient(() => json({ ok: 1 }));
    await v3.client.get('/movie/1');
    assert.match(v3.calls[0]!.url, /api_key=abcdef/);

    const token = `eyJ${'a'.repeat(100)}`;
    assert.ok(isBearerToken(token));
    const v4 = makeClient(() => json({ ok: 1 }), token);
    await v4.client.get('/movie/1');
    assert.doesNotMatch(v4.calls[0]!.url, /api_key/);
    assert.equal((v4.calls[0]!.init!.headers as Record<string, string>).Authorization, `Bearer ${token}`);
  });

  it('önbellek: aynı istek ikinci kez ağa gitmez', async () => {
    const { client, calls } = makeClient(() => json({ n: 1 }));
    await client.get('/movie/popular', { page: 1 });
    await client.get('/movie/popular', { page: 1 });
    assert.equal(calls.length, 1);
  });

  it('eşzamanlı aynı istekleri tekilleştirir', async () => {
    const { client, calls } = makeClient(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return json({ n: 1 });
    });
    const results = await Promise.all([client.get('/a'), client.get('/a'), client.get('/a')]);
    assert.equal(calls.length, 1);
    assert.deepEqual(results[0], results[2]);
  });

  it('429 yanıtında Retry-After kadar bekleyip yeniden dener', async () => {
    let n = 0;
    const { client, calls, sleeps } = makeClient(() => (++n === 1 ? json({}, 429, { 'Retry-After': '2' }) : json({ ok: true })));
    assert.deepEqual(await client.get('/rl'), { ok: true });
    assert.equal(calls.length, 2);
    assert.equal(sleeps[0], 2000);
  });

  it('sunucu hatasında sınırlı sayıda yeniden dener, sonra Türkçe hata verir', async () => {
    const { client, calls } = makeClient(() => json({}, 503));
    await assert.rejects(() => client.get('/down'), (e: ApiError) => e.kind === 'server' && e.title === 'TMDB sunucu hatası');
    assert.equal(calls.length, 3);
  });

  it('401 → geçersiz anahtar (yeniden denemez), 404 → bulunamadı', async () => {
    const a = makeClient(() => json({}, 401));
    await assert.rejects(() => a.client.get('/x'), (e: ApiError) => e.kind === 'invalid-key');
    assert.equal(a.calls.length, 1);
    const b = makeClient(() => json({}, 404));
    await assert.rejects(() => b.client.get('/x'), (e: ApiError) => e.kind === 'not-found');
  });

  it('ağ hatasını yakalar', async () => {
    const { client } = makeClient(() => { throw new TypeError('Failed to fetch'); });
    await assert.rejects(() => client.get('/x'), (e: ApiError) => e.kind === 'network');
  });

  it('anahtar yoksa istek atmadan "missing-key" hatası verir', async () => {
    const { client, calls } = makeClient(() => json({}), null);
    await assert.rejects(() => client.get('/x'), (e: ApiError) => e.kind === 'missing-key');
    assert.equal(calls.length, 0);
  });

  it('hatalı istek önbelleğe alınmaz; sonraki deneme başarılı olabilir', async () => {
    let fail = true;
    const { client } = makeClient(() => (fail ? json({}, 404) : json({ ok: 1 })));
    await assert.rejects(() => client.get('/flaky'));
    fail = false;
    assert.deepEqual(await client.get('/flaky'), { ok: 1 });
  });
});

describe('TMDB veri dönüştürücüleri', () => {
  it('liste: kişileri ayıklar, tekrarları kaldırır, belgeseli tanır', () => {
    const p = mapPaged({
      page: 1, total_pages: 900, total_results: 3,
      results: [
        { id: 1, media_type: 'movie', title: 'Matrix', original_title: 'The Matrix', release_date: '1999-03-31', vote_average: 8.234, genre_ids: [28] },
        { id: 1, media_type: 'movie', title: 'Matrix' },
        { id: 2, media_type: 'person', name: 'Keanu Reeves' },
        { id: 3, media_type: 'tv', name: 'Planet Earth', first_air_date: '2006-03-05', genre_ids: [99] },
        { id: 4, media_type: 'movie', title: '' },
      ],
    });
    assert.equal(p.totalPages, 500);
    assert.deepEqual(p.results.map((r) => r.key), ['movie:1', 'tv:3']);
    assert.equal(p.results[0]!.year, 1999);
    assert.equal(p.results[0]!.voteAverage, 8.2);
    assert.equal(p.results[1]!.kind, 'documentary');
  });

  it('detay: eksik alanları güvenle ele alır', () => {
    const d = mapDetail({ id: 9, title: 'Bilinmeyen' }, 'movie');
    assert.equal(d.runtime, null);
    assert.equal(d.year, null);
    assert.deepEqual(d.cast, []);
    assert.deepEqual(d.videos, []);
    assert.equal(d.imdbId, null);
  });

  it('detay: yönetmen, oyuncu sırası, dizi yaratıcısı ve ortalama bölüm süresi', () => {
    const m = mapDetail({
      id: 603, title: 'Matrix', runtime: 136, genres: [{ id: 28, name: 'Aksiyon' }],
      credits: {
        cast: [{ id: 2, name: 'B', character: 'Trinity', profile_path: null, order: 1 }, { id: 1, name: 'A', character: 'Neo', profile_path: null, order: 0 }],
        crew: [{ id: 5, name: 'Lana', job: 'Director', department: 'Directing', profile_path: null }, { id: 6, name: 'Don', job: 'Original Music Composer', department: 'Sound', profile_path: null }],
      },
    }, 'movie');
    assert.deepEqual(m.cast.map((c) => c.character), ['Neo', 'Trinity']);
    assert.equal(m.directors[0]!.name, 'Lana');
    assert.equal(m.crew[0]!.job, 'Müzik');

    const t = mapDetail({ id: 1399, name: 'GoT', created_by: [{ id: 7, name: 'D.B.', profile_path: null }], episode_run_time: [50, 60] }, 'tv');
    assert.equal(t.directors[0]!.job, 'Yaratıcı');
    assert.equal(t.episodeRunTime, 55);
  });

  it('videolar: yalnızca YouTube, fragman önce', () => {
    const v = mapVideos([
      { key: 'c', name: 'Klip', type: 'Clip', site: 'YouTube', official: true },
      { key: 'v', name: 'Vimeo', type: 'Trailer', site: 'Vimeo' },
      { key: 't', name: 'Fragman', type: 'Trailer', site: 'YouTube', official: true, iso_639_1: 'tr' },
    ]);
    assert.deepEqual(v.map((x) => x.key), ['t', 'c']);
  });

  it('sezon ve kişi', () => {
    const s = mapSeason({ season_number: 1, name: 'Sezon 1', episodes: [{ season_number: 1, episode_number: 1, name: '', runtime: 0 }] }, 10);
    assert.equal(s.episodes[0]!.name, '1. Bölüm');
    assert.equal(s.episodes[0]!.runtime, null);
    const p = mapPersonDetail({
      id: 1, name: 'Kişi', known_for_department: 'Directing',
      combined_credits: {
        cast: [{ id: 3, media_type: 'movie', title: 'Film', character: 'Kendisi', popularity: 1 }],
        crew: [{ id: 3, media_type: 'movie', title: 'Film', job: 'Director', popularity: 1 }],
      },
    });
    assert.equal(p.department, 'Yönetmen');
    assert.equal(p.credits.length, 1);
    assert.equal(p.credits[0]!.role, 'Kendisi, Yönetmen');
  });
});

describe('Keşif parametreleri', () => {
  it('filtreleri TMDB parametrelerine çevirir', () => {
    const p = discoverParams('movie', { genreId: 18, year: 2010, minRating: 7, country: 'TR', sort: 'rating' });
    assert.equal(p.with_genres, 18);
    assert.equal(p['primary_release_date.gte'], '2010-01-01');
    assert.equal(p['primary_release_date.lte'], '2010-12-31');
    assert.equal(p.with_origin_country, 'TR');
    assert.equal(p.sort_by, 'vote_average.desc');
    assert.equal(p['vote_count.gte'], 150);
  });
  it('dizide tarih alanı first_air_date olur; on yıl filtresi', () => {
    const p = discoverParams('tv', { decade: 1990 });
    assert.equal(p['first_air_date.gte'], '1990-01-01');
    assert.equal(p['first_air_date.lte'], '1999-12-31');
  });
});
