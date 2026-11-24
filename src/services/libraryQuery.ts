import type { MediaItem } from '../types/db';
import type { ContentKind } from '../types/media';
import { matchesQuery } from '../utils/text';

export interface LibraryRow {
  item: MediaItem;
  addedAt: number;
  personalRating: number | null;
  note: string | null;
}

export type LibrarySort = 'added-desc' | 'added-asc' | 'title' | 'year-desc' | 'year-asc' | 'personal-desc' | 'tmdb-desc';

export const LIBRARY_SORT_LABEL: Record<LibrarySort, string> = {
  'added-desc': 'Son eklenen',
  'added-asc': 'İlk eklenen',
  title: 'Ada göre (A–Z)',
  'year-desc': 'Yıl (yeni → eski)',
  'year-asc': 'Yıl (eski → yeni)',
  'personal-desc': 'Puanım (yüksek → düşük)',
  'tmdb-desc': 'TMDB puanı',
};

export interface LibraryFilter {
  query?: string;
  kind?: ContentKind | 'all';
  genreId?: number | null;
  minPersonalRating?: number | null;
}

const collator = new Intl.Collator('tr', { sensitivity: 'base' });

export function filterLibrary(rows: LibraryRow[], f: LibraryFilter): LibraryRow[] {
  return rows.filter((r) => {
    if (f.kind && f.kind !== 'all' && r.item.kind !== f.kind) return false;
    if (f.genreId && !r.item.genres.some((g) => g.id === f.genreId)) return false;
    if (f.minPersonalRating != null && (r.personalRating ?? -1) < f.minPersonalRating) return false;
    if (f.query && !matchesQuery(f.query, r.item.title, r.item.originalTitle, r.note)) return false;
    return true;
  });
}

export function sortLibrary(rows: LibraryRow[], sort: LibrarySort): LibraryRow[] {
  const out = [...rows];
  const byYear = (r: LibraryRow) => r.item.year ?? 0;
  switch (sort) {
    case 'added-desc': return out.sort((a, b) => b.addedAt - a.addedAt);
    case 'added-asc': return out.sort((a, b) => a.addedAt - b.addedAt);
    case 'title': return out.sort((a, b) => collator.compare(a.item.title, b.item.title));
    case 'year-desc': return out.sort((a, b) => byYear(b) - byYear(a));
    case 'year-asc': return out.sort((a, b) => byYear(a) - byYear(b));
    case 'personal-desc': return out.sort((a, b) => (b.personalRating ?? -1) - (a.personalRating ?? -1));
    case 'tmdb-desc': return out.sort((a, b) => b.item.voteAverage - a.item.voteAverage);
  }
}
