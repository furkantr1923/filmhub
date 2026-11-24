import type { ContentKind, MediaType } from '../types/media';

const dateLong = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateShort = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
const monthYear = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });
const weekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' });
const num = new Intl.NumberFormat('tr-TR');
const compact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

let regionNames: Intl.DisplayNames | null = null;
let languageNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(['tr'], { type: 'region' });
  languageNames = new Intl.DisplayNames(['tr'], { type: 'language' });
} catch { /* eski tarayıcılarda kodlar gösterilir */ }

/** "2024-05-01" → Date (saat dilimi kaymasını önlemek için yerel tarih olarak) */
export function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export const fmt = {
  date: (d: string | null | undefined) => {
    const x = parseDate(d);
    return x ? dateLong.format(x) : '';
  },
  dateShort: (d: string | Date | null | undefined) => {
    const x = d instanceof Date ? d : parseDate(d);
    return x ? dateShort.format(x) : '';
  },
  monthYear: (d: Date) => monthYear.format(d),
  weekday: (d: Date) => weekday.format(d),
  timestamp: (ts: number) => dateLong.format(new Date(ts)),
  number: (n: number) => num.format(n),
  compact: (n: number) => compact.format(n),
  money: (n: number | null) => (n ? usd.format(n) : ''),
  rating: (n: number) => (n > 0 ? n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–'),
  personalRating: (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 1 }),
  runtime: (min: number | null | undefined) => {
    if (!min) return '';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h} sa ${m ? `${m} dk` : ''}`.trim() : `${m} dk`;
  },
  country: (code: string) => {
    try {
      return regionNames?.of(code) ?? code;
    } catch {
      return code;
    }
  },
  language: (code: string) => {
    try {
      return languageNames?.of(code) ?? code;
    } catch {
      return code;
    }
  },
  relativeDays: (d: string | null) => {
    const x = parseDate(d);
    if (!x) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((x.getTime() - today.getTime()) / 86_400_000);
    if (diff === 0) return 'Bugün';
    if (diff === 1) return 'Yarın';
    if (diff > 1 && diff < 7) return `${diff} gün sonra`;
    return '';
  },
};

export const KIND_LABEL: Record<ContentKind, string> = {
  movie: 'Film',
  series: 'Dizi',
  documentary: 'Belgesel',
};

export const TYPE_LABEL: Record<MediaType, string> = { movie: 'Film', tv: 'Dizi' };

const STATUS: Record<string, string> = {
  Released: 'Yayınlandı',
  'Post Production': 'Post prodüksiyon',
  'In Production': 'Yapım aşamasında',
  Planned: 'Planlandı',
  Rumored: 'Söylenti',
  Canceled: 'İptal edildi',
  'Returning Series': 'Devam ediyor',
  Ended: 'Sona erdi',
  Pilot: 'Pilot',
};

export const statusLabel = (s: string) => STATUS[s] ?? s;

export const VIDEO_TYPE_LABEL: Record<string, string> = {
  Trailer: 'Fragman',
  Teaser: 'Teaser',
  Clip: 'Klip',
  Featurette: 'Kamera Arkası',
  'Behind the Scenes': 'Kamera Arkası',
};
