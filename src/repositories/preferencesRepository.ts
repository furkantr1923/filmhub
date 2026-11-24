import { storage } from '../db';
import type { StoreName } from '../db/schema';
import { emit } from '../services/events';
import type { PreferenceEntry } from '../types/db';

export type PreferenceKey = 'tmdbApiKey' | 'dataNoticeAcknowledged';

export const preferencesRepository = {
  async get<T>(key: PreferenceKey): Promise<T | undefined> {
    const e = await storage().get<PreferenceEntry>('preferences', key);
    return e?.value as T | undefined;
  },
  async set(key: PreferenceKey, value: unknown) {
    await storage().put<PreferenceEntry>('preferences', { key, value });
    emit('prefs');
  },
  async remove(key: PreferenceKey) {
    await storage().delete('preferences', key);
    emit('prefs');
  },
};

/** Kullanıcının açık onayıyla tüm kişisel verileri siler (Ayarlar → Verileri sil). */
export async function wipeAllPersonalData() {
  const stores: StoreName[] = [
    'mediaItems', 'watched', 'watchlist', 'favorites', 'ratings', 'reviews', 'notes',
    'series', 'watchedEpisodes', 'collections', 'collectionItems', 'searchHistory',
  ];
  for (const s of stores) await storage().clear(s);
  emit('library', 'ratings', 'series', 'collections', 'history');
}
