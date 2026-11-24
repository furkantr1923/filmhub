import { tmdb, type DiscoverSort } from '../api/tmdb';
import { useQuery } from '../hooks/hooks';
import type { MediaType } from '../types/media';
import { fmt } from '../utils/format';
import { Select } from './ui';

export interface FilterState {
  genre: string;
  year: string;
  rating: string;
  country: string;
  sort: DiscoverSort | 'relevance';
}

export const EMPTY_FILTERS: FilterState = { genre: '', year: '', rating: '', country: '', sort: 'popularity' };

const COUNTRIES = ['TR', 'US', 'GB', 'FR', 'DE', 'IT', 'ES', 'JP', 'KR', 'IN', 'CN', 'SE', 'DK', 'NO', 'CA', 'AU', 'MX', 'BR', 'AR', 'IR', 'RU', 'BE', 'NL', 'IE', 'NZ'];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear + 2 - 1920 }, (_, i) => String(currentYear + 1 - i));

export function FilterBar({ type, value, onChange, allowRelevance, disableCountry }: {
  type: MediaType;
  value: FilterState;
  onChange: (v: FilterState) => void;
  allowRelevance?: boolean;
  disableCountry?: boolean;
}) {
  const genres = useQuery(() => tmdb.genres(type), [type]);
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
  const sortOptions: { value: FilterState['sort']; label: string }[] = [
    ...(allowRelevance ? [{ value: 'relevance' as const, label: 'En alakalı' }] : []),
    { value: 'popularity', label: 'Popülerlik' },
    { value: 'rating', label: 'Puan (yüksek)' },
    { value: 'newest', label: 'En yeni' },
    { value: 'oldest', label: 'En eski' },
    { value: 'votes', label: 'En çok oylanan' },
  ];
  const active = value.genre || value.year || value.rating || value.country;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select label="Tür" value={value.genre} onChange={(v) => set({ genre: v })}
        options={[{ value: '', label: 'Tüm türler' }, ...(genres.data ?? []).map((g) => ({ value: String(g.id), label: g.name }))]} />
      <Select label="Yıl" value={value.year} onChange={(v) => set({ year: v })}
        options={[{ value: '', label: 'Tüm yıllar' }, ...YEARS.map((y) => ({ value: y, label: y }))]} />
      <Select label="En düşük puan" value={value.rating} onChange={(v) => set({ rating: v })}
        options={[{ value: '', label: 'Tüm puanlar' }, ...['9', '8', '7', '6', '5'].map((r) => ({ value: r, label: `${r}+ puan` }))]} />
      {!disableCountry && (
        <Select label="Ülke" value={value.country} onChange={(v) => set({ country: v })}
          options={[{ value: '', label: 'Tüm ülkeler' }, ...COUNTRIES.map((c) => ({ value: c, label: fmt.country(c) })).sort((a, b) => a.label.localeCompare(b.label, 'tr'))]} />
      )}
      <Select label="Sıralama" value={value.sort} onChange={(v) => set({ sort: v })} options={sortOptions} />
      {active && (
        <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS, sort: value.sort })} className="h-9 rounded-full px-3 text-[13px] font-medium text-white/50 hover:text-white">
          Temizle
        </button>
      )}
    </div>
  );
}

export function filtersFromQuery(q: URLSearchParams, defaultSort: FilterState['sort'] = 'popularity'): FilterState {
  return {
    genre: q.get('tur') ?? '',
    year: q.get('yil') ?? '',
    rating: q.get('puan') ?? '',
    country: q.get('ulke') ?? '',
    sort: (q.get('sirala') as FilterState['sort']) || defaultSort,
  };
}

export function filtersToQuery(f: FilterState) {
  return { tur: f.genre || null, yil: f.year || null, puan: f.rating || null, ulke: f.country || null, sirala: f.sort };
}
