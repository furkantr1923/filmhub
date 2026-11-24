import { storage } from '../db';
import { emit } from '../services/events';
import { buildSeasonCounts, computeSeriesProgress, type SeriesProgress } from '../services/seriesProgress';
import type { MediaItem, SeriesRecord, WatchedEpisode, WatchedItem } from '../types/db';
import type { Episode, MediaDetail } from '../types/media';
import { mediaRepository, toMediaItem } from './mediaRepository';

const ENDED = new Set(['Ended', 'Canceled']);

export const episodeId = (seriesId: number, season: number, episode: number) => `${seriesId}:${season}:${episode}`;

function toWatched(e: Episode, watchedAt: number): WatchedEpisode {
  return {
    id: episodeId(e.seriesId, e.seasonNumber, e.episodeNumber),
    seriesId: e.seriesId,
    seasonNumber: e.seasonNumber,
    episodeNumber: e.episodeNumber,
    name: e.name,
    runtime: e.runtime,
    stillPath: e.stillPath,
    watchedAt,
  };
}

/**
 * Dizi takibi.
 * Her değişiklikten sonra ilerleme yeniden hesaplanır; dizi gerçekten tamamlandığında
 * "İzlediklerim"e eklenir, tamamlanma bozulursa (ve elle işaretlenmediyse) oradan çıkarılır.
 */
export const seriesRepository = {
  get: (tmdbId: number) => storage().get<SeriesRecord>('series', tmdbId),
  getAll: () => storage().getAll<SeriesRecord>('series'),
  getAllWatchedEpisodes: () => storage().getAll<WatchedEpisode>('watchedEpisodes'),
  getWatchedEpisodes: (tmdbId: number) => storage().getAllByIndex<WatchedEpisode>('watchedEpisodes', 'bySeries', tmdbId),

  /** Detay verisiyle dizi kaydını oluşturur veya bölüm sayılarını günceller. */
  async ensure(detail: MediaDetail): Promise<SeriesRecord> {
    if (detail.type !== 'tv') throw new Error('Yalnızca diziler takip edilebilir');
    const ended = ENDED.has(detail.status);
    const seasons = buildSeasonCounts(detail.seasons, detail.lastEpisodeToAir, ended);
    const existing = await storage().get<SeriesRecord>('series', detail.tmdbId);
    const now = Date.now();
    const record: SeriesRecord = {
      tmdbId: detail.tmdbId,
      key: detail.key,
      seasons,
      totalEpisodes: seasons.reduce((n, s) => n + s.episodeCount, 0),
      airedEpisodes: seasons.reduce((n, s) => n + s.airedCount, 0),
      ended,
      manuallyCompleted: existing?.manuallyCompleted ?? false,
      startedAt: existing?.startedAt ?? now,
      updatedAt: now,
    };
    await mediaRepository.upsert(toMediaItem(detail));
    await storage().put('series', record);
    return record;
  },

  async progress(tmdbId: number): Promise<SeriesProgress | null> {
    const record = await this.get(tmdbId);
    if (!record) return null;
    return computeSeriesProgress(record, await this.getWatchedEpisodes(tmdbId));
  },

  async setEpisodeWatched(record: SeriesRecord, episode: Episode, watched: boolean) {
    if (watched) await storage().put('watchedEpisodes', toWatched(episode, Date.now()));
    else {
      await storage().delete('watchedEpisodes', episodeId(record.tmdbId, episode.seasonNumber, episode.episodeNumber));
      if (record.manuallyCompleted) await this.setManuallyCompleted(record.tmdbId, false, false);
    }
    await this.sync(record.tmdbId);
  },

  /** Bir sezonun tüm (yayınlanmış) bölümlerini işaretler / işareti kaldırır. */
  async setSeasonWatched(record: SeriesRecord, episodes: Episode[], watched: boolean) {
    const today = new Date().toISOString().slice(0, 10);
    const eligible = episodes.filter((e) => !watched || !e.airDate || e.airDate <= today);
    if (watched) {
      const existing = new Set((await this.getWatchedEpisodes(record.tmdbId)).map((w) => w.id));
      const now = Date.now();
      await storage().putMany(
        'watchedEpisodes',
        eligible
          .filter((e) => !existing.has(episodeId(e.seriesId, e.seasonNumber, e.episodeNumber)))
          .map((e) => toWatched(e, now)),
      );
    } else {
      await storage().deleteMany('watchedEpisodes', eligible.map((e) => episodeId(e.seriesId, e.seasonNumber, e.episodeNumber)));
      if (record.manuallyCompleted) await this.setManuallyCompleted(record.tmdbId, false, false);
    }
    await this.sync(record.tmdbId);
  },

  async setManuallyCompleted(tmdbId: number, completed: boolean, sync = true) {
    const record = await this.get(tmdbId);
    if (!record) return;
    await storage().put<SeriesRecord>('series', { ...record, manuallyCompleted: completed, updatedAt: Date.now() });
    if (sync) await this.sync(tmdbId);
  },

  /** Takibi ve izlenen bölüm kayıtlarını siler (kullanıcının açık onayıyla çağrılır). */
  async removeTracking(tmdbId: number) {
    const eps = await this.getWatchedEpisodes(tmdbId);
    await storage().deleteMany('watchedEpisodes', eps.map((e) => e.id));
    const record = await this.get(tmdbId);
    await storage().delete('series', tmdbId);
    if (record) await storage().delete('watched', record.key);
    emit('series', 'library');
  },

  /** İlerleme durumunu "İzlediklerim" listesiyle eşitler. */
  async sync(tmdbId: number) {
    const record = await this.get(tmdbId);
    if (!record) return;
    const eps = await this.getWatchedEpisodes(tmdbId);
    const p = computeSeriesProgress(record, eps);
    const watchedEntry = await storage().get<WatchedItem>('watched', record.key);
    if (p.status === 'completed' && !watchedEntry) {
      const lastWatch = eps.reduce((m, e) => Math.max(m, e.watchedAt), 0) || Date.now();
      await storage().put<WatchedItem>('watched', { key: record.key, watchedAt: lastWatch, addedAt: Date.now() });
      await storage().delete('watchlist', record.key);
    } else if (p.status !== 'completed' && watchedEntry) {
      await storage().delete('watched', record.key);
    }
    emit('series', 'library');
  },

  async history(limit = 50): Promise<(WatchedEpisode & { item?: MediaItem })[]> {
    const eps = await this.getAllWatchedEpisodes();
    eps.sort((a, b) => b.watchedAt - a.watchedAt);
    const top = eps.slice(0, limit);
    const items = await mediaRepository.getMany(top.map((e) => `tv:${e.seriesId}` as const));
    return top.map((e) => ({ ...e, item: items.get(`tv:${e.seriesId}`) }));
  },
};
