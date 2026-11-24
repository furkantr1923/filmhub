import { useState, type ReactNode } from 'react';
import { tmdb } from '../api/tmdb';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { mediaPath, TmdbImage } from '../components/MediaCard';
import { MediaPicker } from '../components/Pickers';
import { Button, ErrorState, IconButton, PageHeader, Skeleton } from '../components/ui';
import { useQuery } from '../hooks/hooks';
import { Link, setQuery, useLocation } from '../router/router';
import { parseKey, type MediaDetail } from '../types/media';
import { fmt, KIND_LABEL, statusLabel } from '../utils/format';
import { img } from '../utils/images';

function useDetail(key: string | null) {
  const parsed = key ? parseKey(key) : null;
  return useQuery(() => tmdb.details(parsed!.type, parsed!.id), [key], { enabled: !!parsed });
}

function Slot({ d, loading, error, onPick, onClear, retry }: { d?: MediaDetail; loading: boolean; error: unknown; onPick: () => void; onClear: () => void; retry: () => void }) {
  if (error) return <div className="rounded-2xl bg-white/[0.03] p-4"><ErrorState error={error} onRetry={retry} compact /></div>;
  if (loading) return <Skeleton className="aspect-[2/3] w-full max-w-[220px]" />;
  if (!d) {
    return (
      <button type="button" onClick={onPick} className="flex aspect-[2/3] w-full max-w-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 text-white/50 transition hover:border-white/50 hover:text-white">
        <Icon name="plus" size={30} />
        <span className="text-[14px] font-medium">İçerik seç</span>
      </button>
    );
  }
  return (
    <div className="relative w-full max-w-[220px]">
      <Link to={mediaPath(d.type, d.tmdbId)} className="block overflow-hidden rounded-2xl ring-1 ring-white/10">
        <TmdbImage src={img(d.posterPath, 'w342')} alt={d.title} className="aspect-[2/3] w-full object-cover" />
      </Link>
      <div className="absolute right-2 top-2 flex gap-1">
        <IconButton icon="refresh" label="Değiştir" size={32} className="!bg-black/60 backdrop-blur" onClick={onPick} />
        <IconButton icon="close" label="Kaldır" size={32} className="!bg-black/60 backdrop-blur" onClick={onClear} />
      </div>
      <p className="mt-3 text-[16px] font-semibold leading-tight">{d.title}</p>
      <p className="text-[12.5px] text-white/45">{[KIND_LABEL[d.kind], d.year].filter(Boolean).join(' · ')}</p>
    </div>
  );
}

type RowDef = { label: string; get: (d: MediaDetail) => ReactNode; num?: (d: MediaDetail) => number | null };

const ROWS: RowDef[] = [
  { label: 'TMDB puanı', get: (d) => (d.voteAverage ? `★ ${fmt.rating(d.voteAverage)}` : '–'), num: (d) => d.voteAverage || null },
  { label: 'Oy sayısı', get: (d) => fmt.number(d.voteCount), num: (d) => d.voteCount },
  { label: 'Yayın', get: (d) => fmt.date(d.releaseDate) || '–' },
  { label: 'Süre', get: (d) => (d.type === 'movie' ? fmt.runtime(d.runtime) : d.episodeRunTime ? `${fmt.runtime(d.episodeRunTime)} / bölüm` : '') || '–' },
  { label: 'Sezon / Bölüm', get: (d) => (d.type === 'tv' ? `${d.numberOfSeasons ?? '–'} / ${d.numberOfEpisodes ?? '–'}` : '–') },
  { label: 'Türler', get: (d) => d.genres.map((g) => g.name).join(', ') || '–' },
  { label: 'Yönetmen / Yaratıcı', get: (d) => d.directors.map((p) => p.name).join(', ') || '–' },
  { label: 'Başroller', get: (d) => d.cast.slice(0, 3).map((c) => c.name).join(', ') || '–' },
  { label: 'Ülke', get: (d) => (d.productionCountries.length ? d.productionCountries.map((c) => fmt.country(c.code)) : d.originCountries.map(fmt.country)).join(', ') || '–' },
  { label: 'Durum', get: (d) => statusLabel(d.status) || '–' },
  { label: 'Bütçe', get: (d) => fmt.money(d.budget) || '–', num: (d) => d.budget },
  { label: 'Hasılat', get: (d) => fmt.money(d.revenue) || '–', num: (d) => d.revenue },
];

export default function Compare() {
  const { query } = useLocation();
  const a = query.get('a');
  const b = query.get('b');
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  const da = useDetail(a);
  const db = useDetail(b);

  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <PageHeader title="Karşılaştır" subtitle="İki film veya diziyi yan yana inceleyin" />
      <div className="grid grid-cols-2 gap-4 md:gap-10">
        {(['a', 'b'] as const).map((slot) => {
          const q = slot === 'a' ? da : db;
          return (
            <div key={slot} className="flex justify-center">
              <Slot d={q.data} loading={q.loading} error={q.error} retry={q.reload} onPick={() => setPicking(slot)} onClear={() => setQuery({ [slot]: null })} />
            </div>
          );
        })}
      </div>

      {da.data && db.data ? (
        <div className="mt-10 overflow-hidden rounded-2xl ring-1 ring-white/[0.07]">
          <table className="w-full text-[13.5px]">
            <tbody>
              {ROWS.map((r, i) => {
                const na = r.num?.(da.data!) ?? null;
                const nb = r.num?.(db.data!) ?? null;
                const winA = na !== null && nb !== null && na > nb;
                const winB = na !== null && nb !== null && nb > na;
                return (
                  <tr key={r.label} className={i % 2 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}>
                    <td className={`w-[38%] px-4 py-3.5 text-right align-top ${winA ? 'font-semibold text-white' : 'text-white/75'}`}>{r.get(da.data!)}{winA && <Icon name="check" size={13} className="ml-1 inline text-emerald-300" />}</td>
                    <th className="w-[24%] px-2 py-3.5 text-center align-top text-[11px] font-semibold uppercase tracking-[0.1em] text-white/35">{r.label}</th>
                    <td className={`w-[38%] px-4 py-3.5 align-top ${winB ? 'font-semibold text-white' : 'text-white/75'}`}>{winB && <Icon name="check" size={13} className="mr-1 inline text-emerald-300" />}{r.get(db.data!)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-10 text-center text-[14px] text-white/40">Karşılaştırmak için iki içerik seçin.</p>
      )}
      {(a || b) && <div className="mt-6 flex justify-center"><Button size="sm" icon="refresh" onClick={() => setQuery({ a: null, b: null })}>Sıfırla</Button></div>}

      <MediaPicker open={picking !== null} onClose={() => setPicking(null)} title="Karşılaştırılacak içerik" onPick={(m) => picking && setTimeout(() => setQuery({ [picking]: m.key }), 60)} />
    </Page>
  );
}
