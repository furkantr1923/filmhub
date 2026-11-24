import { storage } from '../db';
import { emit } from '../services/events';
import type { FavoriteItem, MediaItem, PersonalNote, WatchedItem, WatchlistItem } from '../types/db';
import type { MediaKey } from '../types/media';
import { mediaRepository } from './mediaRepository';

export type LibraryList = 'watched' | 'watchlist' | 'favorites';

export const LIBRARY_LABEL: Record<LibraryList, string> = {
  watched: 'İzlediklerim',
  watchlist: 'İzleme Listem',
  favorites: 'Favorilerim',
};

export interface LibraryStatus {
  watched: boolean;
  watchlist: boolean;
  favorite: boolean;
}

export type AddResult = 'added' | 'exists';

/**
 * Kişisel kütüphane işlemleri.
 * Birincil anahtar içerik anahtarı olduğu için aynı içerik bir listeye iki kez eklenemez.
 */
export const libraryRepository = {
  async status(key: MediaKey): Promise<LibraryStatus> {
    const [w, l, f] = await Promise.all([
      storage().get('watched', key),
      storage().get('watchlist', key),
      storage().get('favorites', key),
    ]);
    return { watched: !!w, watchlist: !!l, favorite: !!f };
  },

  /** İzlendi olarak işaretler. İçerik izleme listesindeyse oradan otomatik çıkarılır. */
  async addWatched(item: MediaItem, watchedAt = Date.now()): Promise<AddResult> {
    await mediaRepository.upsert(item);
    const existing = await storage().get<WatchedItem>('watched', item.key);
    await storage().delete('watchlist', item.key);
    if (existing) {
      emit('library');
      return 'exists';
    }
    await storage().put<WatchedItem>('watched', { key: item.key, watchedAt, addedAt: Date.now() });
    emit('library');
    return 'added';
  },

  async addToWatchlist(item: MediaItem): Promise<AddResult> {
    await mediaRepository.upsert(item);
    if (await storage().get('watchlist', item.key)) return 'exists';
    await storage().put<WatchlistItem>('watchlist', { key: item.key, addedAt: Date.now() });
    emit('library');
    return 'added';
  },

  async addFavorite(item: MediaItem): Promise<AddResult> {
    await mediaRepository.upsert(item);
    if (await storage().get('favorites', item.key)) return 'exists';
    await storage().put<FavoriteItem>('favorites', { key: item.key, addedAt: Date.now() });
    emit('library');
    return 'added';
  },

  async remove(list: LibraryList, key: MediaKey) {
    await storage().delete(list, key);
    emit('library');
  },

  async setWatchedDate(key: MediaKey, watchedAt: number) {
    const existing = await storage().get<WatchedItem>('watched', key);
    if (!existing) return;
    await storage().put<WatchedItem>('watched', { ...existing, watchedAt });
    emit('library');
  },

  async list(list: LibraryList): Promise<(WatchedItem | WatchlistItem | FavoriteItem)[]> {
    return storage().getAll(list);
  },

  getWatched: () => storage().getAll<WatchedItem>('watched'),

  async getNote(key: MediaKey) {
    return storage().get<PersonalNote>('notes', key);
  },

  async setNote(key: MediaKey, text: string) {
    const clean = text.trim();
    if (!clean) await storage().delete('notes', key);
    else await storage().put<PersonalNote>('notes', { key, text: clean.slice(0, 2000), updatedAt: Date.now() });
    emit('library');
  },

  getAllNotes: () => storage().getAll<PersonalNote>('notes'),
};
