import { storage } from '../db';
import { emit } from '../services/events';
import type { SearchHistoryEntry } from '../types/db';
import { normalizeText } from '../utils/text';

export const MAX_HISTORY = 20;

export const searchHistoryRepository = {
  async add(raw: string) {
    const display = raw.trim().replace(/\s+/g, ' ');
    const query = normalizeText(display);
    if (query.length < 2) return;
    const existing = await storage().get<SearchHistoryEntry>('searchHistory', query);
    await storage().put<SearchHistoryEntry>('searchHistory', {
      query,
      display,
      count: (existing?.count ?? 0) + 1,
      lastUsedAt: Date.now(),
    });
    // En eski kayıtları budayarak geçmişi sınırlı tut
    const all = await this.list(Infinity);
    if (all.length > MAX_HISTORY) {
      await storage().deleteMany('searchHistory', all.slice(MAX_HISTORY).map((e) => e.query));
    }
    emit('history');
  },

  async list(limit = 10): Promise<SearchHistoryEntry[]> {
    const all = await storage().getAll<SearchHistoryEntry>('searchHistory');
    return all.sort((a, b) => b.lastUsedAt - a.lastUsedAt).slice(0, limit);
  },

  async remove(query: string) {
    await storage().delete('searchHistory', query);
    emit('history');
  },

  async clear() {
    await storage().clear('searchHistory');
    emit('history');
  },
};
