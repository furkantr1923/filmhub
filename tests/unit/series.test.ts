import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { episodes, freshDb, seriesDetail } from './helpers';
import { seriesRepository } from '../../src/repositories/seriesRepository';
import { libraryRepository } from '../../src/repositories/libraryRepository';
import { buildSeasonCounts, computeSeriesProgress } from '../../src/services/seriesProgress';

describe('Sezon bölüm sayıları', () => {
  it('özel bölümleri (sezon 0) hariç tutar', () => {
    const counts = buildSeasonCounts(seriesDetail(1).seasons, null, true);
    assert.deepEqual(counts.map((c) => c.seasonNumber), [1, 2]);
  });

  it('devam eden dizide yayınlanmamış bölümleri saymaz', () => {
    const d = seriesDetail(1, { status: 'Returning Series' });
    const counts = buildSeasonCounts(d.seasons, { seasonNumber: 2, episodeNumber: 1 }, false);
    assert.deepEqual(counts, [
      { seasonNumber: 1, episodeCount: 3, airedCount: 3 },
      { seasonNumber: 2, episodeCount: 2, airedCount: 1 },
    ]);
  });
});

describe('Dizi takibi', () => {
  beforeEach(() => freshDb());

  it('bölüm işaretleme ve geri alma ilerlemeyi doğru hesaplar', async () => {
    const rec = await seriesRepository.ensure(seriesDetail(100));
    const s1 = episodes(100, 1, 3);
    await seriesRepository.setEpisodeWatched(rec, s1[0]!, true);
    await seriesRepository.setEpisodeWatched(rec, s1[1]!, true);
    let p = (await seriesRepository.progress(100))!;
    assert.equal(p.watched, 2);
    assert.equal(p.total, 5);
    assert.equal(p.percent, 40);
    assert.deepEqual(p.next, { seasonNumber: 1, episodeNumber: 3 });
    await seriesRepository.setEpisodeWatched(rec, s1[1]!, false);
    p = (await seriesRepository.progress(100))!;
    assert.equal(p.watched, 1);
  });

  it('BİR SEZONU bitirmek diziyi tamamlamaz', async () => {
    const rec = await seriesRepository.ensure(seriesDetail(101));
    await seriesRepository.setSeasonWatched(rec, episodes(101, 1, 3), true);
    const p = (await seriesRepository.progress(101))!;
    assert.equal(p.seasons[0]!.complete, true);
    assert.equal(p.status, 'watching');
    assert.equal(p.remaining, 2);
    assert.equal((await libraryRepository.status('tv:101')).watched, false);
  });

  it('biten dizinin tüm bölümleri izlenince tamamlanır ve İzlediklerim’e eklenir', async () => {
    const rec = await seriesRepository.ensure(seriesDetail(102));
    await seriesRepository.setSeasonWatched(rec, episodes(102, 1, 3), true);
    await seriesRepository.setSeasonWatched(rec, episodes(102, 2, 2), true);
    const p = (await seriesRepository.progress(102))!;
    assert.equal(p.status, 'completed');
    assert.equal(p.next, null);
    assert.equal((await libraryRepository.status('tv:102')).watched, true);

    // Bir bölümün işareti kaldırılınca tamamlanma bozulur
    await seriesRepository.setEpisodeWatched(rec, episodes(102, 2, 2)[1]!, false);
    assert.equal((await seriesRepository.progress(102))!.status, 'watching');
    assert.equal((await libraryRepository.status('tv:102')).watched, false);
  });

  it('devam eden dizide yayınlananların hepsi izlenince durum "güncel"dir, tamamlandı değil', async () => {
    const d = seriesDetail(103, { status: 'Returning Series', lastEpisodeToAir: { seasonNumber: 2, episodeNumber: 1 } });
    const rec = await seriesRepository.ensure(d);
    await seriesRepository.setSeasonWatched(rec, episodes(103, 1, 3), true);
    await seriesRepository.setEpisodeWatched(rec, episodes(103, 2, 2)[0]!, true);
    const p = (await seriesRepository.progress(103))!;
    assert.equal(p.status, 'caught-up');
    assert.equal(p.remaining, 0);
    assert.equal((await libraryRepository.status('tv:103')).watched, false);
  });

  it('elle tamamlandı işaretleme ve geri alma', async () => {
    await seriesRepository.ensure(seriesDetail(104));
    await seriesRepository.setManuallyCompleted(104, true);
    assert.equal((await seriesRepository.progress(104))!.status, 'completed');
    assert.equal((await libraryRepository.status('tv:104')).watched, true);
    await seriesRepository.setManuallyCompleted(104, false);
    assert.equal((await libraryRepository.status('tv:104')).watched, false);
  });

  it('aynı bölüm iki kez işaretlense de tek kayıt tutulur; geçmiş sıralıdır', async () => {
    const rec = await seriesRepository.ensure(seriesDetail(105));
    const e = episodes(105, 1, 3);
    await seriesRepository.setEpisodeWatched(rec, e[0]!, true);
    await new Promise((r) => setTimeout(r, 3));
    await seriesRepository.setEpisodeWatched(rec, e[2]!, true);
    await seriesRepository.setEpisodeWatched(rec, e[2]!, true);
    assert.equal((await seriesRepository.getWatchedEpisodes(105)).length, 2);
    const h = await seriesRepository.history();
    assert.equal(h[0]!.episodeNumber, 3);
    assert.equal(h[0]!.item?.title, 'Dizi 105');
  });

  it('takibi kaldırmak bölüm kayıtlarını siler', async () => {
    const rec = await seriesRepository.ensure(seriesDetail(106));
    await seriesRepository.setSeasonWatched(rec, episodes(106, 1, 3), true);
    await seriesRepository.removeTracking(106);
    assert.equal((await seriesRepository.getWatchedEpisodes(106)).length, 0);
    assert.equal(await seriesRepository.get(106), undefined);
  });

  it('saf hesaplama: boş kayıtta yüzde 0', () => {
    const p = computeSeriesProgress(
      { tmdbId: 1, key: 'tv:1', seasons: [], totalEpisodes: 0, airedEpisodes: 0, ended: false, manuallyCompleted: false, startedAt: 0, updatedAt: 0 },
      [],
    );
    assert.equal(p.percent, 0);
    assert.equal(p.status, 'watching');
  });
});
