import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, mediaItem } from './helpers';
import { finalSchema, MIGRATIONS, DB_VERSION } from '../../src/db/schema';
import { libraryRepository } from '../../src/repositories/libraryRepository';
import { ratingRepository, isValidRating } from '../../src/repositories/ratingRepository';
import { collectionRepository } from '../../src/repositories/collectionRepository';
import { searchHistoryRepository, MAX_HISTORY } from '../../src/repositories/searchHistoryRepository';
import { preferencesRepository, wipeAllPersonalData } from '../../src/repositories/preferencesRepository';
import { mediaRepository } from '../../src/repositories/mediaRepository';
import { storage } from '../../src/db';

describe('Şema ve migration', () => {
  it('migration sürümleri artan sırada ve son sürüm doğru', () => {
    const versions = MIGRATIONS.map((m) => m.version);
    assert.deepEqual(versions, [...versions].sort((a, b) => a - b));
    assert.equal(DB_VERSION, versions.at(-1));
  });
  it('son şema gerekli tüm varlıkları içerir', () => {
    const names = finalSchema().map((s) => s.name).sort();
    for (const n of ['mediaItems', 'watched', 'watchlist', 'favorites', 'ratings', 'reviews', 'series', 'watchedEpisodes', 'collections', 'collectionItems', 'searchHistory', 'preferences', 'apiCache']) {
      assert.ok(names.includes(n as never), `${n} eksik`);
    }
  });
});

describe('Kütüphane CRUD ve tekrar engelleme', () => {
  beforeEach(() => freshDb());

  it('izleme listesine ekler, ikinci eklemede "exists" döner', async () => {
    const m = mediaItem('movie', 1);
    assert.equal(await libraryRepository.addToWatchlist(m), 'added');
    assert.equal(await libraryRepository.addToWatchlist(m), 'exists');
    assert.equal((await libraryRepository.list('watchlist')).length, 1);
  });

  it('izlendi işaretlenince izleme listesinden çıkar', async () => {
    const m = mediaItem('movie', 2);
    await libraryRepository.addToWatchlist(m);
    await libraryRepository.addWatched(m);
    const st = await libraryRepository.status(m.key);
    assert.deepEqual(st, { watched: true, watchlist: false, favorite: false });
  });

  it('favori ekle / kaldır', async () => {
    const m = mediaItem('tv', 3);
    await libraryRepository.addFavorite(m);
    assert.equal((await libraryRepository.status(m.key)).favorite, true);
    await libraryRepository.remove('favorites', m.key);
    assert.equal((await libraryRepository.status(m.key)).favorite, false);
  });

  it('içerik anlık görüntüsü tek kayıt olarak güncellenir', async () => {
    const m = mediaItem('movie', 4);
    await libraryRepository.addFavorite(m);
    await libraryRepository.addToWatchlist({ ...m, title: 'Yeni Başlık' });
    const all = await mediaRepository.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0]!.title, 'Yeni Başlık');
  });

  it('kişisel not kaydeder; boş not silinir', async () => {
    await libraryRepository.setNote('movie:5', '  Harika görüntü yönetimi  ');
    assert.equal((await libraryRepository.getNote('movie:5'))?.text, 'Harika görüntü yönetimi');
    await libraryRepository.setNote('movie:5', '   ');
    assert.equal(await libraryRepository.getNote('movie:5'), undefined);
  });
});

describe('Puan ve yorumlar', () => {
  beforeEach(() => freshDb());

  it('0,5 adımlı puanları doğrular', () => {
    for (const v of [0, 0.5, 7, 9.5, 10]) assert.ok(isValidRating(v), String(v));
    for (const v of [-1, 10.5, 7.3, NaN]) assert.ok(!isValidRating(v), String(v));
  });

  it('puan ekle → düzenle → sil; oluşturulma tarihi korunur', async () => {
    const m = mediaItem('movie', 10);
    await ratingRepository.setRating(m, 8);
    const first = await ratingRepository.getRating(m.key);
    await new Promise((r) => setTimeout(r, 5));
    await ratingRepository.setRating(m, 8.5);
    const second = await ratingRepository.getRating(m.key);
    assert.equal(second?.value, 8.5);
    assert.equal(second?.createdAt, first?.createdAt);
    assert.ok(second!.updatedAt >= first!.updatedAt);
    await ratingRepository.deleteRating(m.key);
    assert.equal(await ratingRepository.getRating(m.key), undefined);
  });

  it('geçersiz puanı reddeder', async () => {
    await assert.rejects(() => ratingRepository.setRating(mediaItem('movie', 11), 11), RangeError);
  });

  it('yorum ekle → düzenle → sil; boş yorumu reddeder', async () => {
    const m = mediaItem('movie', 12);
    await ratingRepository.setReview(m, 'Çok iyi');
    await ratingRepository.setReview(m, 'Çok iyi, ikinci izleyişte daha da iyi');
    assert.equal((await ratingRepository.getReview(m.key))?.text, 'Çok iyi, ikinci izleyişte daha da iyi');
    await assert.rejects(() => ratingRepository.setReview(m, '   '));
    await ratingRepository.deleteReview(m.key);
    assert.equal(await ratingRepository.getReview(m.key), undefined);
  });
});

describe('Koleksiyon yönetimi', () => {
  beforeEach(() => freshDb());

  it('oluştur, yeniden adlandır, içerik ekle/çıkar, sil (bağlı kayıtlarla)', async () => {
    const c = await collectionRepository.create('  Hafta Sonu  ', 'Rahat filmler');
    assert.equal(c.name, 'Hafta Sonu');
    await collectionRepository.update(c.id, { name: 'Pazar Akşamı' });
    assert.equal((await collectionRepository.get(c.id))?.name, 'Pazar Akşamı');

    const m = mediaItem('movie', 20);
    assert.equal(await collectionRepository.addItem(c.id, m), 'added');
    assert.equal(await collectionRepository.addItem(c.id, m), 'exists');
    assert.equal((await collectionRepository.items(c.id)).length, 1);
    assert.equal((await collectionRepository.get(c.id))?.coverPath, m.backdropPath, 'ilk içerik kapak olur');

    const list = await collectionRepository.list();
    assert.equal(list[0]!.count, 1);

    await collectionRepository.removeItem(c.id, m.key);
    assert.equal((await collectionRepository.items(c.id)).length, 0);

    await collectionRepository.addItem(c.id, m);
    await collectionRepository.remove(c.id);
    assert.equal(await collectionRepository.get(c.id), undefined);
    assert.equal((await storage().getAll('collectionItems')).length, 0, 'bağlı kayıtlar da silinmeli');
  });

  it('boş adı reddeder', async () => {
    await assert.rejects(() => collectionRepository.create('   '));
  });
});

describe('Arama geçmişi', () => {
  beforeEach(() => freshDb());

  it('aynı aramayı tekilleştirir ve sayar (Türkçe karakter duyarsız)', async () => {
    await searchHistoryRepository.add('Şahsiyet');
    await searchHistoryRepository.add('sahsiyet');
    const list = await searchHistoryRepository.list();
    assert.equal(list.length, 1);
    assert.equal(list[0]!.count, 2);
  });

  it(`en fazla ${MAX_HISTORY} kayıt tutar`, async () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) await searchHistoryRepository.add(`arama ${i}`);
    assert.equal((await searchHistoryRepository.list(Infinity)).length, MAX_HISTORY);
  });

  it('tek kayıt siler ve tümünü temizler', async () => {
    await searchHistoryRepository.add('matrix');
    await searchHistoryRepository.add('dune');
    await searchHistoryRepository.remove('matrix');
    assert.deepEqual((await searchHistoryRepository.list()).map((e) => e.query), ['dune']);
    await searchHistoryRepository.clear();
    assert.equal((await searchHistoryRepository.list()).length, 0);
  });
});

describe('Tercihler ve veri silme', () => {
  beforeEach(() => freshDb());

  it('tercih kaydeder; veri silme tercihlere dokunmaz', async () => {
    await preferencesRepository.set('tmdbApiKey', 'abc');
    await libraryRepository.addFavorite(mediaItem('movie', 30));
    await wipeAllPersonalData();
    assert.equal(await preferencesRepository.get('tmdbApiKey'), 'abc');
    assert.equal((await libraryRepository.list('favorites')).length, 0);
  });
});
