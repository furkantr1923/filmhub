import { useMemo, useState } from 'react';
import { DataNotice } from '../components/DataNotice';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { PosterCard } from '../components/MediaCard';
import { Button, EmptyState, PageHeader, Segmented, Select, useFeedback } from '../components/ui';
import { useLiveQuery } from '../hooks/hooks';
import { LIBRARY_LABEL, libraryRepository, type LibraryList } from '../repositories/libraryRepository';
import { mediaRepository } from '../repositories/mediaRepository';
import { ratingRepository } from '../repositories/ratingRepository';
import { seriesRepository } from '../repositories/seriesRepository';
import { navigate, setQuery, useLocation } from '../router/router';
import { filterLibrary, LIBRARY_SORT_LABEL, sortLibrary, type LibraryRow, type LibrarySort } from '../services/libraryQuery';
import type { ContentKind } from '../types/media';
import { fmt } from '../utils/format';

const TAB_SLUG: Record<string, LibraryList> = { izlenenler: 'watched', liste: 'watchlist', favoriler: 'favorites' };
const SLUG_OF: Record<LibraryList, string> = { watched: 'izlenenler', watchlist: 'liste', favorites: 'favoriler' };

export default function Library() {
  const { query } = useLocation();
  const list: LibraryList = TAB_SLUG[query.get('sekme') ?? ''] ?? 'watchlist';
  const { toast, confirm } = useFeedback();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<ContentKind | 'all'>('all');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState<LibrarySort>('added-desc');
  const [editing, setEditing] = useState(false);

  const data = useLiveQuery(async () => {
    const [watched, watchlist, favorites, media, ratings, notes] = await Promise.all([
      libraryRepository.list('watched'),
      libraryRepository.list('watchlist'),
      libraryRepository.list('favorites'),
      mediaRepository.getAll(),
      ratingRepository.getAllRatings(),
      libraryRepository.getAllNotes(),
    ]);
    const mediaMap = new Map(media.map((m) => [m.key, m]));
    const ratingMap = new Map(ratings.map((r) => [r.key, r.value]));
    const noteMap = new Map(notes.map((n) => [n.key, n.text]));
    const toRows = (entries: { key: string; addedAt: number; watchedAt?: number }[]): LibraryRow[] =>
      entries.flatMap((e) => {
        const item = mediaMap.get(e.key as never);
        return item ? [{ item, addedAt: e.watchedAt ?? e.addedAt, personalRating: ratingMap.get(e.key as never) ?? null, note: noteMap.get(e.key as never) ?? null }] : [];
      });
    return { watched: toRows(watched), watchlist: toRows(watchlist), favorites: toRows(favorites) };
  }, ['library', 'ratings', 'series']);

  const rows = data.data?.[list] ?? [];
  const genres = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of rows) for (const g of r.item.genres) m.set(g.id, g.name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'tr'));
  }, [rows]);
  const visible = sortLibrary(filterLibrary(rows, { query: search, kind, genreId: genre ? Number(genre) : null }), sort);

  const remove = async (row: LibraryRow) => {
    if (list === 'watched' && row.item.type === 'tv') {
      const ok = await confirm({ title: 'Dizi takibi silinsin mi?', text: `“${row.item.title}” için izlenen tüm bölüm kayıtları silinecek.`, confirmLabel: 'Sil', danger: true });
      if (!ok) return;
      await seriesRepository.removeTracking(row.item.tmdbId);
    } else {
      await libraryRepository.remove(list, row.item.key);
    }
    toast(`${row.item.title} — ${LIBRARY_LABEL[list]} listesinden çıkarıldı`);
  };

  const subtitleFor = (r: LibraryRow) => {
    if (r.personalRating !== null) return `Puanım ${fmt.personalRating(r.personalRating)} · ${r.item.year ?? ''}`.replace(/ · $/, '');
    if (list === 'watched') return `İzlendi: ${fmt.dateShort(new Date(r.addedAt))}`;
    return undefined;
  };

  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <PageHeader
        title="Kütüphanem"
        subtitle="İzlediklerin, izleme listen ve favorilerin"
        actions={rows.length > 0 && <Button size="sm" icon={editing ? 'check' : 'edit'} variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing((e) => !e)}>{editing ? 'Bitti' : 'Düzenle'}</Button>}
      />
      <div className="mb-6"><DataNotice /></div>
      <Segmented
        className="mb-5"
        value={list}
        onChange={(v) => { setEditing(false); setQuery({ sekme: SLUG_OF[v] }); }}
        options={(['watchlist', 'watched', 'favorites'] as LibraryList[]).map((l) => ({ value: l, label: LIBRARY_LABEL[l], count: data.data?.[l].length ?? 0 }))}
      />
      {rows.length > 0 && (
        <div className="mb-7 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kütüphanede ara (ad veya not)" aria-label="Kütüphanede ara"
              className="h-9 w-full rounded-full bg-white/[0.07] pl-10 pr-4 text-[13px] outline-none ring-1 ring-transparent placeholder:text-white/35 focus:ring-white/25" />
          </div>
          <Select label="İçerik türü" value={kind} onChange={setKind} options={[
            { value: 'all', label: 'Tüm içerikler' }, { value: 'movie', label: 'Filmler' }, { value: 'series', label: 'Diziler' }, { value: 'documentary', label: 'Belgeseller' },
          ]} />
          <Select label="Tür" value={genre} onChange={setGenre} options={[{ value: '', label: 'Tüm türler' }, ...genres.map(([id, name]) => ({ value: String(id), label: name }))]} />
          <Select label="Sıralama" value={sort} onChange={setSort} options={(Object.keys(LIBRARY_SORT_LABEL) as LibrarySort[]).map((s) => ({ value: s, label: LIBRARY_SORT_LABEL[s] }))} />
        </div>
      )}

      {data.loading && !data.data ? null : rows.length === 0 ? (
        <EmptyState
          icon={list === 'favorites' ? 'heart' : list === 'watched' ? 'check' : 'bookmark'}
          title={list === 'watchlist' ? 'İzleme listeniz boş' : list === 'watched' ? 'Henüz izlendi olarak işaretlenen içerik yok' : 'Henüz favoriniz yok'}
          text="Bir içeriğin detay sayfasındaki düğmelerle buraya ekleyebilirsiniz."
          action={<Button variant="primary" icon="compass" onClick={() => navigate('/')}>İçerik keşfet</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState icon="search" title="Eşleşen içerik yok" text="Arama veya filtreleri değiştirin." />
      ) : (
        <div className="poster-grid grid gap-x-3.5 gap-y-7 md:gap-x-5">
          {visible.map((r) => (
            <div key={r.item.key} className="relative">
              <PosterCard item={r.item} subtitle={subtitleFor(r)} badge={r.note ? <span title="Notunuz var" className="flex size-5 items-center justify-center rounded-md bg-black/60 text-white/90 backdrop-blur-md"><Icon name="note" size={12} /></span> : undefined} />
              {editing && (
                <button type="button" aria-label={`${r.item.title} öğesini kaldır`} onClick={() => remove(r)}
                  className="absolute -right-2 -top-2 z-10 flex size-8 items-center justify-center rounded-full bg-red-500 text-white shadow-xl ring-4 ring-black animate-pop-in">
                  <Icon name="close" size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
