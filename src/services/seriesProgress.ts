import type { SeriesRecord, SeriesStatus } from '../types/db';
import type { SeasonSummary } from '../types/media';

export interface EpisodeRef {
  seasonNumber: number;
  episodeNumber: number;
}

export interface SeasonProgress {
  seasonNumber: number;
  watched: number;
  aired: number;
  total: number;
  percent: number;
  complete: boolean;
}

export interface SeriesProgress {
  watched: number;
  aired: number;
  total: number;
  remaining: number;
  percent: number;
  status: SeriesStatus;
  seasons: SeasonProgress[];
  next: EpisodeRef | null;
}

/**
 * Yayınlanmış bölüm sayısını sezon bazında hesaplar.
 * Son yayınlanan bölümden sonraki bölümler "yayınlanmadı" kabul edilir;
 * böylece devam eden bir dizi, henüz çıkmamış bölümler yüzünden eksik görünmez.
 */
export function buildSeasonCounts(
  seasons: SeasonSummary[],
  lastEpisodeToAir: EpisodeRef | null,
  ended: boolean,
): SeriesRecord['seasons'] {
  return seasons
    .filter((s) => s.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
    .map((s) => {
      let aired = s.episodeCount;
      if (!ended && lastEpisodeToAir) {
        if (s.seasonNumber > lastEpisodeToAir.seasonNumber) aired = 0;
        else if (s.seasonNumber === lastEpisodeToAir.seasonNumber) {
          aired = Math.min(s.episodeCount, lastEpisodeToAir.episodeNumber);
        }
      } else if (!ended && !lastEpisodeToAir) {
        aired = 0;
      }
      return { seasonNumber: s.seasonNumber, episodeCount: s.episodeCount, airedCount: aired };
    });
}

/**
 * Dizi ilerlemesini yalnızca izlenen bölümlerden hesaplar.
 * Kural: Bir sezonun tamamlanması diziyi tamamlamaz. Dizi ancak
 *  - kullanıcı elle "tamamlandı" işaretlediğinde ya da
 *  - dizi sona ermiş VE tüm bölümler izlenmişse "tamamlandı" olur.
 * Devam eden bir dizide yayınlanmış tüm bölümler izlendiyse durum "güncel"dir.
 */
export function computeSeriesProgress(record: SeriesRecord, watched: EpisodeRef[]): SeriesProgress {
  const watchedSet = new Set(watched.map((w) => `${w.seasonNumber}:${w.episodeNumber}`));
  let next: EpisodeRef | null = null;
  let total = 0;
  let aired = 0;
  let watchedCount = 0;
  let watchedAired = 0;
  const seasons: SeasonProgress[] = [];

  for (const s of record.seasons) {
    let w = 0;
    for (let e = 1; e <= s.episodeCount; e++) {
      if (watchedSet.has(`${s.seasonNumber}:${e}`)) {
        w++;
        if (e <= s.airedCount) watchedAired++;
      } else if (!next && e <= s.airedCount) {
        next = { seasonNumber: s.seasonNumber, episodeNumber: e };
      }
    }
    total += s.episodeCount;
    aired += s.airedCount;
    watchedCount += w;
    seasons.push({
      seasonNumber: s.seasonNumber,
      watched: w,
      aired: s.airedCount,
      total: s.episodeCount,
      percent: s.episodeCount ? Math.round((w / s.episodeCount) * 100) : 0,
      complete: s.episodeCount > 0 && w >= s.episodeCount,
    });
  }

  let status: SeriesStatus = 'watching';
  if (record.manuallyCompleted) status = 'completed';
  else if (aired > 0 && watchedAired >= aired) {
    status = record.ended && watchedCount >= total ? 'completed' : 'caught-up';
  }

  return {
    watched: watchedCount,
    aired,
    total,
    remaining: Math.max(0, aired - watchedAired),
    percent: total ? Math.round((watchedCount / total) * 100) : 0,
    status,
    seasons,
    next: status === 'completed' ? null : next,
  };
}

export const SERIES_STATUS_LABEL: Record<SeriesStatus, string> = {
  watching: 'İzleniyor',
  'caught-up': 'Güncel',
  completed: 'Tamamlandı',
};
