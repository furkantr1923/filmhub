import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mediaItem } from './helpers';
import { computeStats, formatDuration } from '../../src/services/stats';
import { filterLibrary, sortLibrary, type LibraryRow } from '../../src/services/libraryQuery';
import { normalizeText, matchesQuery, daySeed } from '../../src/utils/text';

const now = new Date(2026, 10, 20); // 20 Kasım 2026
const ts = (y: number, m: number, d: number) => new Date(y, m, d, 20).getTime();

describe('İstatistik hesaplamaları', () => {
  const movie = mediaItem('movie', 1, { runtime: 100, genres: [{ id: 18, name: 'Dram' }], countries: ['TR'] });
  const doc = mediaItem('movie', 2, { kind: 'documentary', runtime: 90, genres: [{ id: 99, name: 'Belgesel' }], countries: ['GB'] });
  const noRuntime = mediaItem('movie', 3, { runtime: null, genres: [{ id: 18, name: 'Dram' }] });
  const series = mediaItem('tv', 4, { runtime: 40 });

  const stats = computeStats({
    mediaItems: [movie, doc, noRuntime, series],
    watched: [
      { key: movie.key, watchedAt: ts(2026, 10, 1), addedAt: 0 },
      { key: doc.key, watchedAt: ts(2026, 9, 5), addedAt: 0 },
      { key: noRuntime.key, watchedAt: ts(2025, 0, 5), addedAt: 0 },
      { key: series.key, watchedAt: ts(2026, 10, 2), addedAt: 0 },
    ],
    ratings: [
      { key: movie.key, value: 8, createdAt: 0, updatedAt: 0 },
      { key: doc.key, value: 9.5, createdAt: 0, updatedAt: 0 },
    ],
    episodes: [
      { id: '4:1:1', seriesId: 4, seasonNumber: 1, episodeNumber: 1, name: '', runtime: 55, stillPath: null, watchedAt: ts(2026, 10, 2) },
      { id: '4:1:2', seriesId: 4, seasonNumber: 1, episodeNumber: 2, name: '', runtime: null, stillPath: null, watchedAt: ts(2026, 10, 2) },
    ],
    now,
  }, (c) => ({ TR: 'Türkiye', GB: 'Birleşik Krallık', US: 'ABD' })[c] ?? c);

  it('tür bazında sayar (belgesel ayrı)', () => {
    assert.equal(stats.movies, 2);
    assert.equal(stats.documentaries, 1);
    assert.equal(stats.series, 1);
    assert.equal(stats.episodes, 2);
  });

  it('süreyi yalnızca bilinen değerlerden toplar; bilinmeyenleri ayrıca sayar', () => {
    // 100 + 90 + 55 + (bölüm süresi yok → dizinin ortalama süresi 40)
    assert.equal(stats.totalMinutes, 285);
    assert.equal(stats.unknownRuntime, 1);
  });

  it('ortalama kişisel puan', () => {
    assert.equal(stats.averageRating, 8.8);
    assert.equal(stats.ratingDistribution[8]!.value, 1);
    assert.equal(stats.ratingDistribution[9]!.value, 1);
  });

  it('tür ve ülke dağılımı', () => {
    assert.deepEqual(stats.genres[0], { label: 'Dram', value: 3 });
    assert.ok(stats.countries.some((c) => c.label === 'Türkiye' && c.value === 1));
  });

  it('aylık (son 12 ay) ve yıllık dağılım', () => {
    assert.equal(stats.monthly.length, 12);
    assert.equal(stats.monthly.at(-1)!.label, 'Kas 26');
    assert.equal(stats.monthly.at(-1)!.value, 3); // 1 film + 2 bölüm
    assert.equal(stats.monthly.at(-2)!.value, 1); // belgesel (Ekim)
    assert.deepEqual(stats.yearly, [{ label: '2025', value: 1 }, { label: '2026', value: 4 }]);
  });

  it('boş veride sahte değer üretmez', () => {
    const empty = computeStats({ mediaItems: [], watched: [], ratings: [], episodes: [], now });
    assert.equal(empty.hasData, false);
    assert.equal(empty.averageRating, null);
    assert.equal(empty.totalMinutes, 0);
    assert.ok(empty.monthly.every((m) => m.value === 0));
  });

  it('süre biçimlendirme', () => {
    assert.equal(formatDuration(0), '0 dk');
    assert.equal(formatDuration(95), '1 sa 35 dk');
    assert.equal(formatDuration(1500), '1 gün 1 sa');
  });
});

describe('Kütüphane filtreleme ve sıralama', () => {
  const rows: LibraryRow[] = [
    { item: mediaItem('movie', 1, { title: 'Şahsiyet', year: 2018, voteAverage: 8 }), addedAt: 3, personalRating: 9, note: null },
    { item: mediaItem('movie', 2, { title: 'Ayla', year: 2017, voteAverage: 8.4, kind: 'movie' }), addedAt: 1, personalRating: null, note: 'kore' },
    { item: mediaItem('tv', 3, { title: 'Ezel', year: 2009, voteAverage: 7.9, genres: [{ id: 80, name: 'Suç' }] }), addedAt: 2, personalRating: 7, note: null },
  ];

  it('metinle arar (Türkçe karakter ve not dahil)', () => {
    assert.deepEqual(filterLibrary(rows, { query: 'sahsiyet' }).map((r) => r.item.tmdbId), [1]);
    assert.deepEqual(filterLibrary(rows, { query: 'KORE' }).map((r) => r.item.tmdbId), [2]);
  });

  it('türe, kategoriye ve puana göre filtreler', () => {
    assert.deepEqual(filterLibrary(rows, { kind: 'series' }).map((r) => r.item.tmdbId), [3]);
    assert.deepEqual(filterLibrary(rows, { genreId: 80 }).map((r) => r.item.tmdbId), [3]);
    assert.deepEqual(filterLibrary(rows, { minPersonalRating: 8 }).map((r) => r.item.tmdbId), [1]);
  });

  it('sıralar', () => {
    assert.deepEqual(sortLibrary(rows, 'added-desc').map((r) => r.item.tmdbId), [1, 3, 2]);
    assert.deepEqual(sortLibrary(rows, 'title').map((r) => r.item.title), ['Ayla', 'Ezel', 'Şahsiyet']);
    assert.deepEqual(sortLibrary(rows, 'year-asc').map((r) => r.item.year), [2009, 2017, 2018]);
    assert.deepEqual(sortLibrary(rows, 'personal-desc').map((r) => r.item.tmdbId), [1, 3, 2]);
    assert.deepEqual(sortLibrary(rows, 'tmdb-desc').map((r) => r.item.tmdbId), [2, 1, 3]);
  });
});

describe('Metin yardımcıları', () => {
  it('Türkçe normalize', () => {
    assert.equal(normalizeText('  IŞIK  Çağ '), 'isik cag');
    assert.ok(matchesQuery('gul', 'Gülşen'));
    assert.ok(!matchesQuery('xyz', 'Gülşen', null));
  });
  it('günlük tohum aynı gün sabit, farklı gün farklı', () => {
    assert.equal(daySeed(new Date(2026, 0, 1, 9)), daySeed(new Date(2026, 0, 1, 23)));
    assert.notEqual(daySeed(new Date(2026, 0, 1)), daySeed(new Date(2026, 0, 2)));
  });
});
