import type { MediaItem, PersonalRating, WatchedEpisode, WatchedItem } from '../types/db';

export interface StatsInput {
  mediaItems: MediaItem[];
  watched: WatchedItem[];
  ratings: PersonalRating[];
  episodes: WatchedEpisode[];
  now?: Date;
}

export interface Slice {
  label: string;
  value: number;
}

export interface ViewingStats {
  movies: number;
  series: number;
  documentaries: number;
  episodes: number;
  totalMinutes: number;
  /** Süresi bilinmeyen (hesaba katılamayan) kayıt sayısı */
  unknownRuntime: number;
  averageRating: number | null;
  ratingCount: number;
  genres: Slice[];
  countries: Slice[];
  monthly: Slice[];
  yearly: Slice[];
  ratingDistribution: Slice[];
  /** "YYYY-MM-DD" → o gün izlenen film + bölüm sayısı (son 52 hafta) */
  activity: Map<string, number>;
  hasData: boolean;
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function dayKey(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function topSlices(counts: Map<string, number>, limit: number): Slice[] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
  const head = sorted.slice(0, limit).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(limit).reduce((n, [, v]) => n + v, 0);
  if (rest > 0) head.push({ label: 'Diğer', value: rest });
  return head;
}

/**
 * Tüm istatistikler yalnızca yerelde saklanan gerçek kullanıcı verisinden hesaplanır.
 * Süre bilgisi olmayan içerikler tahmine dahil edilmez, ayrıca sayılır ("unknownRuntime").
 */
export function computeStats(input: StatsInput, countryName: (code: string) => string = (c) => c): ViewingStats {
  const now = input.now ?? new Date();
  const media = new Map(input.mediaItems.map((m) => [m.key, m]));
  const watchedItems = input.watched
    .map((w) => ({ w, m: media.get(w.key) }))
    .filter((x): x is { w: WatchedItem; m: MediaItem } => !!x.m);

  let movies = 0;
  let series = 0;
  let documentaries = 0;
  let totalMinutes = 0;
  let unknownRuntime = 0;
  const genres = new Map<string, number>();
  const countries = new Map<string, number>();
  const activity = new Map<string, number>();
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
  }
  const monthly = new Map(monthKeys.map((k) => [k, 0]));
  const yearly = new Map<number, number>();

  const countEvent = (ts: number) => {
    const d = new Date(ts);
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthly.has(mk)) monthly.set(mk, monthly.get(mk)! + 1);
    yearly.set(d.getFullYear(), (yearly.get(d.getFullYear()) ?? 0) + 1);
    const dk = dayKey(d);
    activity.set(dk, (activity.get(dk) ?? 0) + 1);
  };

  for (const { w, m } of watchedItems) {
    if (m.kind === 'documentary') documentaries++;
    else if (m.type === 'movie') movies++;
    else series++;
    for (const g of m.genres) genres.set(g.name, (genres.get(g.name) ?? 0) + 1);
    for (const c of m.countries) {
      const name = countryName(c);
      countries.set(name, (countries.get(name) ?? 0) + 1);
    }
    // Diziler süreye bölüm bazında katılır; film ve belgesel filmler doğrudan
    if (m.type === 'movie') {
      if (m.runtime && m.runtime > 0) totalMinutes += m.runtime;
      else unknownRuntime++;
      countEvent(w.watchedAt);
    }
  }

  for (const e of input.episodes) {
    const runtime = e.runtime ?? media.get(`tv:${e.seriesId}`)?.runtime ?? null;
    if (runtime && runtime > 0) totalMinutes += runtime;
    else unknownRuntime++;
    countEvent(e.watchedAt);
  }

  const ratingValues = input.ratings.map((r) => r.value);
  const distribution = Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: 0 }));
  for (const v of ratingValues) distribution[Math.floor(v)]!.value++;

  return {
    movies,
    series,
    documentaries,
    episodes: input.episodes.length,
    totalMinutes,
    unknownRuntime,
    averageRating: ratingValues.length
      ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
      : null,
    ratingCount: ratingValues.length,
    genres: topSlices(genres, 7),
    countries: topSlices(countries, 7),
    monthly: monthKeys.map((k) => {
      const [y, mo] = k.split('-').map(Number);
      return { label: `${MONTHS[mo!]} ${String(y).slice(2)}`, value: monthly.get(k) ?? 0 };
    }),
    yearly: [...yearly.entries()].sort((a, b) => a[0] - b[0]).map(([y, v]) => ({ label: String(y), value: v })),
    ratingDistribution: distribution,
    activity,
    hasData: watchedItems.length > 0 || input.episodes.length > 0 || ratingValues.length > 0,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 dk';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} gün`);
  if (hours) parts.push(`${hours} sa`);
  if (mins && !days) parts.push(`${mins} dk`);
  return parts.join(' ');
}
