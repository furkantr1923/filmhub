import { tmdb } from '../api/tmdb';
import { FilterBar, filtersFromQuery, filtersToQuery } from '../components/Filters';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { TmdbImage } from '../components/MediaCard';
import { LoadMore, PosterGrid, PosterGridSkeleton } from '../components/Row';
import { EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from '../components/ui';
import { useInView, usePaged, useQuery } from '../hooks/hooks';
import { Link, navigate, setQuery, useLocation } from '../router/router';
import type { Genre, MediaSummary, MediaType } from '../types/media';
import { img } from '../utils/images';

function GenreTile({ genre, type }: { genre: Genre; type: MediaType }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const q = useQuery(() => tmdb.discover(type, { genreId: genre.id, sort: 'popularity', minVotes: 200 }), [genre.id, type], { enabled: inView });
  const cover = q.data?.results.find((r) => r.backdropPath)?.backdropPath ?? null;
  return (
    <Link to={`/kesfet/${type}/${genre.id}`} className="group block">
      <span ref={ref} className="relative block aspect-[16/9] overflow-hidden rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.06] transition group-hover:ring-white/30">
        {cover && <TmdbImage src={img(cover, 'w780')} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />}
        <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
          <span className="text-[17px] font-semibold text-white">{genre.name}</span>
          <Icon name="chevronRight" size={18} className="text-white/50 transition group-hover:translate-x-0.5 group-hover:text-white" />
        </span>
      </span>
    </Link>
  );
}

function GenreExplorer() {
  const { query } = useLocation();
  const type: MediaType = query.get('tip') === 'tv' ? 'tv' : 'movie';
  const genres = useQuery(() => tmdb.genres(type), [type]);
  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <PageHeader title="Keşfet" subtitle="Türlere göre film ve dizi dünyasında gezinin" />
      <Segmented className="mb-7" value={type} onChange={(v) => setQuery({ tip: v === 'movie' ? null : v })}
        options={[{ value: 'movie', label: 'Filmler' }, { value: 'tv', label: 'Diziler' }]} />
      {genres.error ? <ErrorState error={genres.error} onRetry={genres.reload} /> : (
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {genres.data ? genres.data.map((g) => <GenreTile key={g.id} genre={g} type={type} />)
            : Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-[16/9] rounded-2xl" />)}
        </div>
      )}
    </Page>
  );
}

function GenreResults({ type, genreId }: { type: MediaType; genreId: number }) {
  const { query } = useLocation();
  const filters = { ...filtersFromQuery(query), genre: String(genreId) };
  const genres = useQuery(() => tmdb.genres(type), [type]);
  const name = genres.data?.find((g) => g.id === genreId)?.name ?? '';
  const paged = usePaged<MediaSummary>((page) => tmdb.discover(type, {
    genreId,
    year: filters.year ? Number(filters.year) : null,
    minRating: filters.rating ? Number(filters.rating) : null,
    country: filters.country || null,
    sort: filters.sort === 'relevance' ? 'popularity' : filters.sort,
  }, page), [type, genreId, filters.year, filters.rating, filters.country, filters.sort]);

  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <Link to={`/kesfet${type === 'tv' ? '?tip=tv' : ''}`} className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-white/55 hover:text-white">
        <Icon name="chevronLeft" size={16} /> Tüm türler
      </Link>
      <PageHeader title={name || 'Tür'} subtitle={`${type === 'movie' ? 'Filmler' : 'Diziler'}${paged.total ? ` · ${paged.total.toLocaleString('tr-TR')} içerik` : ''}`} />
      <div className="mb-8">
        <FilterBar type={type} value={filters} onChange={(f) => {
          if (f.genre && f.genre !== String(genreId)) navigate(`/kesfet/${type}/${f.genre}`, { replace: true });
          else setQuery({ ...filtersToQuery(f), tur: null });
        }} />
      </div>
      {paged.error && !paged.items.length ? <ErrorState error={paged.error} onRetry={paged.retry} /> :
        paged.loading && !paged.items.length ? <PosterGridSkeleton /> :
          paged.items.length === 0 ? <EmptyState icon="filter" title="Bu filtrelerle içerik yok" text="Filtrelerden birini kaldırmayı deneyin." /> :
            <PosterGrid items={paged.items} />}
      <LoadMore onLoad={paged.loadMore} loading={paged.loading} hasMore={paged.hasMore} error={paged.error} onRetry={paged.retry} />
    </Page>
  );
}

export default function Discover({ params }: { params: { type?: string; genre?: string } }) {
  if (params.type && params.genre) {
    return <GenreResults type={params.type === 'tv' ? 'tv' : 'movie'} genreId={Number(params.genre)} />;
  }
  return <GenreExplorer />;
}
