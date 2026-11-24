import { useState } from 'react';
import { tmdb } from '../api/tmdb';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { TmdbImage } from '../components/MediaCard';
import { PosterGrid, PosterGridSkeleton } from '../components/Row';
import { EmptyState, ErrorState, Segmented, Select, Skeleton } from '../components/ui';
import { useQuery } from '../hooks/hooks';
import { img } from '../utils/images';

type Kind = 'all' | 'movie' | 'tv';
type Sort = 'popularity' | 'newest' | 'rating';

/** Kişi sayfası: sade tutulur (biyografi / kariyer veritabanı yok) — fotoğraf, ad, görev ve yapımlar. */
export default function Person({ params }: { params: { id: string } }) {
  const q = useQuery(() => tmdb.person(Number(params.id)), [params.id]);
  const [kind, setKind] = useState<Kind>('all');
  const [sort, setSort] = useState<Sort>('popularity');

  if (q.error) return <Page className="pt-24 lg:pt-12"><ErrorState error={q.error} onRetry={q.reload} /></Page>;
  const p = q.data;
  const credits = (p?.credits ?? [])
    .filter((c) => kind === 'all' || c.type === kind)
    .sort((a, b) => sort === 'popularity' ? b.popularity - a.popularity : sort === 'rating' ? b.voteAverage - a.voteAverage : (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
  const roles = new Map<string, string>(credits.map((c) => [c.key, c.role]));

  return (
    <Page className="pb-12 pt-20 lg:pt-12">
      <header className="mb-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <div className="size-36 shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/10 md:size-44">
          {p ? <TmdbImage src={img(p.profilePath, 'h632')} alt={p.name} eager className="size-full object-cover" fallback={<Icon name="user" size={44} />} /> : <Skeleton className="size-full rounded-full" />}
        </div>
        <div>
          {p ? <>
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/45">{p.department}</p>
            <h1 className="mt-1 text-[34px] font-bold tracking-tight md:text-[44px]">{p.name}</h1>
            <p className="mt-1 text-[14px] text-white/50">{p.credits.length} yapım</p>
          </> : <><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-10 w-64" /></>}
        </div>
      </header>
      <div className="mb-7 flex flex-wrap items-center gap-3">
        <Segmented value={kind} onChange={setKind} options={[
          { value: 'all', label: 'Tümü', count: p?.credits.length },
          { value: 'movie', label: 'Filmler', count: p?.credits.filter((c) => c.type === 'movie').length },
          { value: 'tv', label: 'Diziler', count: p?.credits.filter((c) => c.type === 'tv').length },
        ]} />
        <Select label="Sıralama" value={sort} onChange={setSort} options={[
          { value: 'popularity', label: 'Popülerlik' },
          { value: 'newest', label: 'En yeni' },
          { value: 'rating', label: 'Puan' },
        ]} />
      </div>
      {!p ? <PosterGridSkeleton /> : credits.length === 0 ? <EmptyState title="Yapım bulunamadı" /> : (
        <PosterGrid items={credits} renderSubtitle={(m) => [m.year, roles.get(m.key)].filter(Boolean).join(' · ')} />
      )}
    </Page>
  );
}
