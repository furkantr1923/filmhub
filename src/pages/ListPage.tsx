import { Page } from '../components/Layout';
import { LoadMore, PosterGrid, PosterGridSkeleton } from '../components/Row';
import { EmptyState, ErrorState, PageHeader } from '../components/ui';
import { usePaged } from '../hooks/hooks';
import { findList } from '../services/lists';
import type { MediaSummary } from '../types/media';

export default function ListPage({ params }: { params: { slug: string } }) {
  const def = findList(params.slug);
  const paged = usePaged<MediaSummary>((page) => def ? def.fetch(page) : Promise.resolve({ results: [], totalPages: 0, totalResults: 0 }), [params.slug], { maxPages: 50 });
  if (!def) return <Page className="pt-24 lg:pt-12"><EmptyState icon="alert" title="Liste bulunamadı" /></Page>;
  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <PageHeader title={def.title} subtitle={def.description} />
      {paged.error && !paged.items.length ? <ErrorState error={paged.error} onRetry={paged.retry} /> :
        paged.loading && !paged.items.length ? <PosterGridSkeleton count={18} /> :
          paged.items.length === 0 ? <EmptyState title="Bu listede şu an içerik yok" /> :
            <PosterGrid items={paged.items} />}
      <LoadMore onLoad={paged.loadMore} loading={paged.loading} hasMore={paged.hasMore} error={paged.error} onRetry={paged.retry} />
    </Page>
  );
}
