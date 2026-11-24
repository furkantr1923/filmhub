/**
 * Veritabanı şeması ve sürüm geçişleri (migrations).
 *
 * Her depo (store) bir tabloya karşılık gelir. keyPath birincil anahtardır;
 * birincil anahtarın kendisi tekrar eden kayıtları engeller (aynı içerik iki kez eklenemez).
 * İndeksler sorguları hızlandırır ve "yabancı anahtar" ilişkilerini temsil eder
 * (örn. collectionItems.collectionId → collections.id).
 */

export type StoreName =
  | 'mediaItems'
  | 'watched'
  | 'watchlist'
  | 'favorites'
  | 'ratings'
  | 'reviews'
  | 'notes'
  | 'series'
  | 'watchedEpisodes'
  | 'collections'
  | 'collectionItems'
  | 'searchHistory'
  | 'preferences'
  | 'apiCache';

export interface IndexDef {
  name: string;
  keyPath: string;
  unique?: boolean;
}

export interface StoreDef {
  name: StoreName;
  keyPath: string;
  indexes: IndexDef[];
}

export interface Migration {
  version: number;
  description: string;
  stores: StoreDef[];
  /** Mevcut depolara eklenecek indeksler */
  addIndexes?: { store: StoreName; index: IndexDef }[];
}

export const DB_NAME = 'filmhub';

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Temel şema: kütüphane, puanlar, yorumlar, dizi takibi, koleksiyonlar, arama geçmişi',
    stores: [
      { name: 'mediaItems', keyPath: 'key', indexes: [{ name: 'byType', keyPath: 'type' }, { name: 'byTmdbId', keyPath: 'tmdbId' }] },
      { name: 'watched', keyPath: 'key', indexes: [{ name: 'byWatchedAt', keyPath: 'watchedAt' }] },
      { name: 'watchlist', keyPath: 'key', indexes: [{ name: 'byAddedAt', keyPath: 'addedAt' }] },
      { name: 'favorites', keyPath: 'key', indexes: [{ name: 'byAddedAt', keyPath: 'addedAt' }] },
      { name: 'ratings', keyPath: 'key', indexes: [{ name: 'byValue', keyPath: 'value' }] },
      { name: 'reviews', keyPath: 'key', indexes: [] },
      { name: 'notes', keyPath: 'key', indexes: [] },
      { name: 'series', keyPath: 'tmdbId', indexes: [] },
      {
        name: 'watchedEpisodes',
        keyPath: 'id',
        indexes: [{ name: 'bySeries', keyPath: 'seriesId' }, { name: 'byWatchedAt', keyPath: 'watchedAt' }],
      },
      { name: 'collections', keyPath: 'id', indexes: [{ name: 'byUpdatedAt', keyPath: 'updatedAt' }] },
      {
        name: 'collectionItems',
        keyPath: 'id',
        indexes: [{ name: 'byCollection', keyPath: 'collectionId' }, { name: 'byKey', keyPath: 'key' }],
      },
      { name: 'searchHistory', keyPath: 'query', indexes: [{ name: 'byLastUsed', keyPath: 'lastUsedAt' }] },
      { name: 'preferences', keyPath: 'key', indexes: [] },
    ],
  },
  {
    version: 2,
    description: 'API önbellek deposu (tekrarlı istekleri azaltır)',
    stores: [{ name: 'apiCache', keyPath: 'url', indexes: [{ name: 'byExpiresAt', keyPath: 'expiresAt' }] }],
  },
];

export const DB_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;

/** Tüm migration'lar uygulandıktan sonraki son şema. */
export function finalSchema(): StoreDef[] {
  const map = new Map<StoreName, StoreDef>();
  for (const m of MIGRATIONS) {
    for (const s of m.stores) map.set(s.name, { ...s, indexes: [...s.indexes] });
    for (const a of m.addIndexes ?? []) map.get(a.store)?.indexes.push(a.index);
  }
  return [...map.values()];
}
