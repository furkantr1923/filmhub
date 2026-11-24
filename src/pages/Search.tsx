import { useEffect, useMemo, useRef, useState } from 'react';
import { tmdb } from '../api/tmdb';
import { FilterBar, filtersFromQuery, filtersToQuery, type FilterState } from '../components/Filters';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { mediaPath, PersonAvatar, TmdbImage } from '../components/MediaCard';
import { LoadMore, PosterGrid, PosterGridSkeleton, RowHeader, Scroller } from '../components/Row';
import { Chip, EmptyState, ErrorState, IconButton, Segmented, Spinner } from '../components/ui';
import { useDebounced, useLiveQuery, usePaged, useQuery } from '../hooks/hooks';
import { searchHistoryRepository } from '../repositories/searchHistoryRepository';
import { navigate, setQuery, useLocation } from '../router/router';
import { DOCUMENTARY_GENRE_ID, type MediaSummary, type MediaType, type PersonSummary } from '../types/media';
import { fmt, KIND_LABEL } from '../utils/format';
import { img } from '../utils/images';

type Tab = 'all' | 'movie' | 'tv' | 'documentary' | 'person';

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'movie', label: 'Filmler' },
  { value: 'tv', label: 'Diziler' },
  { value: 'documentary', label: 'Belgeseller' },
  { value: 'person', label: 'Oyuncu & Yönetmen' },
];

/** Metin aramasında TMDB filtre desteklemediği için tür / yıl / puan / sıralama istemci tarafında uygulanır. */
function applyClientFilters(items: MediaSummary[], f: FilterState): MediaSummary[] {
  let out = items.filter((m) =>
    (!f.genre || m.genreIds.includes(Number(f.genre))) &&
    (!f.year || m.year === Number(f.year)) &&
    (!f.rating || m.voteAverage >= Number(f.rating)),
  );
  const byDate = (m: MediaSummary) => m.releaseDate ?? '';
  if (f.sort === 'popularity') out = [...out].sort((a, b) => b.popularity - a.popularity);
  if (f.sort === 'rating') out = [...out].sort((a, b) => b.voteAverage - a.voteAverage);
  if (f.sort === 'votes') out = [...out].sort((a, b) => b.voteCount - a.voteCount);
  if (f.sort === 'newest') out = [...out].sort((a, b) => byDate(b).localeCompare(byDate(a)));
  if (f.sort === 'oldest') out = [...out].sort((a, b) => (byDate(a) || '9999').localeCompare(byDate(b) || '9999'));
  return out;
}

function Suggestions({ text, onPick }: { text: string; onPick: (label: string) => void }) {
  const q = useQuery(() => tmdb.searchMulti(text), [text], { enabled: text.length >= 2 });
  if (text.length < 2) return null;
  const media = q.data?.media.results.slice(0, 6) ?? [];
  const people = q.data?.people.slice(0, 3) ?? [];
  return (
    <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-[#1c1c1f]/98 shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl animate-pop-in" role="listbox" aria-label="Arama önerileri">
      {q.loading && !q.data ? (
        <div className="flex justify-center py-6"><Spinner size={20} /></div>
      ) : media.length + people.length === 0 ? (
        <p className="px-5 py-5 text-sm text-white/45">“{text}” için öneri bulunamadı.</p>
      ) : (
        <ul className="py-2">
          {media.map((m) => (
            <li key={m.key}>
              <button type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(m.title); navigate(mediaPath(m.type, m.tmdbId)); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/[0.06]">
                <span className="h-12 w-8 shrink-0 overflow-hidden rounded bg-white/[0.06]"><TmdbImage src={img(m.posterPath, 'w92')} alt="" className="size-full object-cover" fallback={<Icon name="film" size={12} />} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px]">{m.title}</span>
                  <span className="block text-[12px] text-white/40">{[KIND_LABEL[m.kind], m.year].filter(Boolean).join(' · ')}</span>
                </span>
                <Icon name="chevronRight" size={15} className="text-white/25" />
              </button>
            </li>
          ))}
          {people.map((p) => (
            <li key={p.id}>
              <button type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(p.name); navigate(`/kisi/${p.id}`); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/[0.06]">
                <span className="size-9 shrink-0 overflow-hidden rounded-full bg-white/[0.06]"><TmdbImage src={img(p.profilePath, 'w45')} alt="" className="size-full object-cover" fallback={<Icon name="user" size={14} />} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px]">{p.name}</span>
                  <span className="block text-[12px] text-white/40">{p.department}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PeopleGrid({ people }: { people: PersonSummary[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
      {people.map((p) => <div key={p.id} className="flex justify-center"><PersonAvatar id={p.id} name={p.name} role={p.department} profilePath={p.profilePath} size="lg" /></div>)}
    </div>
  );
}

function QueryResults({ q, tab, filters }: { q: string; tab: Tab; filters: FilterState }) {
  const year = filters.year ? Number(filters.year) : null;
  const paged = usePaged<MediaSummary>(async (page) => {
    if (tab === 'movie' || tab === 'tv') return tmdb.searchMedia(tab, q, page, year);
    const r = await tmdb.searchMulti(q, page);
    return tab === 'documentary' ? { ...r.media, results: r.media.results.filter((m) => m.genreIds.includes(DOCUMENTARY_GENRE_ID)) } : r.media;
  }, [q, tab, year], { enabled: tab !== 'person' });
  const people = useQuery(() => tmdb.searchPeople(q), [q], { enabled: tab === 'all' });
  const peoplePaged = usePaged<PersonSummary>((page) => tmdb.searchPeople(q, page), [q], { enabled: tab === 'person' });

  if (tab === 'person') {
    if (peoplePaged.error && !peoplePaged.items.length) return <ErrorState error={peoplePaged.error} onRetry={peoplePaged.retry} />;
    if (peoplePaged.loading && !peoplePaged.items.length) return <div className="flex justify-center py-16"><Spinner /></div>;
    if (!peoplePaged.items.length) return <EmptyState icon="user" title="Kişi bulunamadı" text={`“${q}” ile eşleşen oyuncu veya yönetmen yok.`} />;
    return <>
      <PeopleGrid people={peoplePaged.items} />
      <LoadMore onLoad={peoplePaged.loadMore} loading={peoplePaged.loading} hasMore={peoplePaged.hasMore} error={peoplePaged.error} onRetry={peoplePaged.retry} />
    </>;
  }

  const items = applyClientFilters(paged.items, filters);
  if (paged.error && !paged.items.length) return <ErrorState error={paged.error} onRetry={paged.retry} />;
  return (
    <div className="space-y-10">
      {tab === 'all' && (people.data?.results.length ?? 0) > 0 && (
        <section>
          <RowHeader title="Kişiler" />
          <Scroller>{people.data!.results.slice(0, 12).map((p) => <div key={p.id} className="snap-start"><PersonAvatar id={p.id} name={p.name} role={p.department} profilePath={p.profilePath} /></div>)}</Scroller>
        </section>
      )}
      <section>
        {!paged.loading || paged.items.length ? (
          <p className="mb-4 text-[13px] text-white/45">{paged.total ? `${fmt.number(paged.total)} sonuç bulundu` : ''}{items.length !== paged.items.length ? ` · filtrelerle ${items.length} gösteriliyor` : ''}</p>
        ) : null}
        {paged.loading && !paged.items.length ? <PosterGridSkeleton /> : items.length === 0 && !paged.hasMore ? (
          <EmptyState icon="search" title="Sonuç bulunamadı" text="Farklı bir yazım deneyin veya filtreleri gevşetin." />
        ) : <PosterGrid items={items} />}
        <LoadMore onLoad={paged.loadMore} loading={paged.loading} hasMore={paged.hasMore} error={paged.error} onRetry={paged.retry} />
      </section>
    </div>
  );
}

function DiscoverResults({ type, filters }: { type: MediaType | 'documentary'; filters: FilterState }) {
  const realType: MediaType = type === 'documentary' ? 'movie' : type;
  const genre = type === 'documentary' ? DOCUMENTARY_GENRE_ID : filters.genre ? Number(filters.genre) : null;
  const paged = usePaged<MediaSummary>((page) => tmdb.discover(realType, {
    genreId: genre,
    year: filters.year ? Number(filters.year) : null,
    minRating: filters.rating ? Number(filters.rating) : null,
    country: filters.country || null,
    sort: filters.sort === 'relevance' ? 'popularity' : filters.sort,
  }, page), [realType, genre, filters.year, filters.rating, filters.country, filters.sort]);
  if (paged.error && !paged.items.length) return <ErrorState error={paged.error} onRetry={paged.retry} />;
  return (
    <>
      {paged.loading && !paged.items.length ? <PosterGridSkeleton /> : paged.items.length === 0 ? (
        <EmptyState icon="filter" title="Bu filtrelerle içerik yok" text="Filtrelerden birini kaldırmayı deneyin." />
      ) : <PosterGrid items={paged.items} />}
      <LoadMore onLoad={paged.loadMore} loading={paged.loading} hasMore={paged.hasMore} error={paged.error} onRetry={paged.retry} />
    </>
  );
}

export default function Search() {
  const { query } = useLocation();
  const committed = query.get('q') ?? '';
  const rawTab = (query.get('tip') as Tab) || 'all';
  // Keşif modunda (arama boşken) "Tümü" ve "Kişi" sekmeleri yoktur
  const tab: Tab = !committed && (rawTab === 'all' || rawTab === 'person') ? 'movie' : rawTab;
  const filters = filtersFromQuery(query, committed ? 'relevance' : 'popularity');
  const [text, setText] = useState(committed);
  const [focused, setFocused] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(text.trim(), 450);
  const suggestText = useDebounced(text.trim(), 200);
  const history = useLiveQuery(() => searchHistoryRepository.list(10), ['history']);
  const trending = useQuery(() => tmdb.trending('all', 'day'), [], { enabled: !committed });

  // Yazarken sonuçlar otomatik güncellenir (debounce ile gereksiz istek atılmaz)
  useEffect(() => {
    if (debounced !== committed) setQuery({ q: debounced || null });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (value = text) => {
    const v = value.trim();
    setText(v);
    setQuery({ q: v || null });
    if (v) searchHistoryRepository.add(v).catch(() => undefined);
    setSuggestOpen(false);
    inputRef.current?.blur();
  };

  const setFilters = (f: FilterState) => setQuery(filtersToQuery(f));
  const discoverType: MediaType | 'documentary' = tab === 'tv' ? 'tv' : tab === 'documentary' ? 'documentary' : 'movie';
  const trendTitles = useMemo(() => (trending.data?.results ?? []).slice(0, 10).map((m) => m.title), [trending.data]);

  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <h1 className="mb-5 text-[28px] font-bold tracking-tight md:text-[34px]">Ara</h1>
      <div className="relative z-20 max-w-3xl">
        <form onSubmit={(e) => { e.preventDefault(); commit(); }} role="search">
          <Icon name="search" size={21} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            ref={inputRef}
            autoFocus
            value={text}
            onChange={(e) => { setText(e.target.value); setSuggestOpen(true); }}
            onKeyDown={(e) => e.key === 'Escape' && setSuggestOpen(false)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            placeholder="Film, dizi, belgesel, oyuncu veya yönetmen…"
            aria-label="Arama"
            enterKeyHint="search"
            className="h-14 w-full rounded-2xl bg-white/[0.08] pl-14 pr-14 text-[16px] text-white outline-none ring-1 ring-white/[0.08] transition placeholder:text-white/35 focus:bg-white/[0.11] focus:ring-white/25"
          />
          {text && (
            <button type="button" aria-label="Aramayı temizle" onClick={() => { setText(''); setQuery({ q: null }); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
              <Icon name="close" size={18} />
            </button>
          )}
        </form>
        {focused && suggestOpen && suggestText.length >= 2 && <Suggestions text={suggestText} onPick={(l) => commit(l)} />}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <Segmented value={tab} onChange={(v) => setQuery({ tip: v === 'all' ? null : v })}
         
          options={committed ? TABS : TABS.filter((t) => t.value !== 'person' && t.value !== 'all').map((t) => ({ ...t }))} />
        {tab !== 'person' && (
          <FilterBar
            type={discoverType === 'tv' ? 'tv' : 'movie'}
            value={filters}
            onChange={setFilters}
            allowRelevance={!!committed}
            disableCountry={!!committed}
          />
        )}
        {committed && tab !== 'person' && <p className="text-[12px] text-white/35">Ülke filtresi yalnızca keşif modunda (arama kutusu boşken) kullanılabilir.</p>}
      </div>

      <div className="mt-8">
        {committed ? (
          <QueryResults q={committed} tab={tab} filters={filters} />
        ) : (
          <div className="space-y-10">
            {(history.data?.length ?? 0) > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[17px] font-semibold">Son aramalar</h2>
                  <button type="button" onClick={() => searchHistoryRepository.clear()} className="text-[13px] font-medium text-white/45 hover:text-white">Geçmişi temizle</button>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {history.data!.map((h) => (
                    <li key={h.query} className="flex h-9 items-center gap-1 rounded-full bg-white/[0.07] pl-4 pr-1 text-[13.5px]">
                      <button type="button" onClick={() => commit(h.display)} className="flex items-center gap-2 text-white/80 hover:text-white"><Icon name="history" size={14} className="text-white/40" />{h.display}</button>
                      <IconButton icon="close" label={`“${h.display}” aramasını sil`} size={28} className="!bg-transparent text-white/40 hover:!bg-white/10" onClick={() => searchHistoryRepository.remove(h.query)} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {trendTitles.length > 0 && (
              <section>
                <h2 className="mb-3 text-[17px] font-semibold">Bugün popüler aramalar</h2>
                <div className="flex flex-wrap gap-2">{trendTitles.map((t) => <Chip key={t} onClick={() => commit(t)}>{t}</Chip>)}</div>
              </section>
            )}
            <section>
              <h2 className="mb-1 text-[17px] font-semibold">Keşfet: {discoverType === 'tv' ? 'Diziler' : discoverType === 'documentary' ? 'Belgeseller' : 'Filmler'}</h2>
              <p className="mb-5 text-[13px] text-white/45">Filtreleri kullanarak tür, yıl, puan ve ülkeye göre gezinin.</p>
              <DiscoverResults type={discoverType} filters={filters.sort === 'relevance' ? { ...filters, sort: 'popularity' } : filters} />
            </section>
          </div>
        )}
      </div>
    </Page>
  );
}

