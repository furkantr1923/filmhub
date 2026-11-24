import { useState } from 'react';
import { tmdb } from '../api/tmdb';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { mediaPath, TmdbImage } from '../components/MediaCard';
import { LoadMore } from '../components/Row';
import { EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from '../components/ui';
import { usePaged } from '../hooks/hooks';
import { Link } from '../router/router';
import type { MediaSummary, MediaType } from '../types/media';
import { fmt, parseDate } from '../utils/format';
import { img } from '../utils/images';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Yaklaşan vizyon / yayın takvimi: önümüzdeki 90 gün, tarihe göre gruplanmış. */
export default function Calendar() {
  const [type, setType] = useState<MediaType>('movie');
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 90);
  const paged = usePaged<MediaSummary>((page) => tmdb.discover(type, {
    releasedFrom: iso(today),
    releasedTo: iso(end),
    sort: 'popularity',
  }, page), [type], { maxPages: 10 });

  const sorted = [...paged.items].filter((m) => m.releaseDate && m.posterPath).sort((a, b) => a.releaseDate!.localeCompare(b.releaseDate!));
  const months = new Map<string, Map<string, MediaSummary[]>>();
  for (const m of sorted) {
    const d = parseDate(m.releaseDate)!;
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    if (!months.has(mk)) months.set(mk, new Map());
    const days = months.get(mk)!;
    if (!days.has(m.releaseDate!)) days.set(m.releaseDate!, []);
    days.get(m.releaseDate!)!.push(m);
  }

  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <PageHeader title="Yayın Takvimi" subtitle="Önümüzdeki 90 gün içinde vizyona girecek filmler ve başlayacak diziler" />
      <Segmented className="mb-8" value={type} onChange={setType} options={[{ value: 'movie', label: 'Filmler' }, { value: 'tv', label: 'Yeni Diziler' }]} />
      {paged.error && !paged.items.length ? <ErrorState error={paged.error} onRetry={paged.retry} /> :
        paged.loading && !paged.items.length ? (
          <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : sorted.length === 0 ? <EmptyState icon="calendar" title="Yaklaşan yayın bulunamadı" /> : (
          <div className="space-y-12">
            {[...months.entries()].map(([mk, days]) => {
              const [y, m] = mk.split('-').map(Number);
              return (
                <section key={mk}>
                  <h2 className="sticky top-16 z-10 -mx-2 mb-4 bg-black/80 px-2 py-2 text-[20px] font-semibold capitalize backdrop-blur-xl lg:top-0">{fmt.monthYear(new Date(y!, m!, 1))}</h2>
                  <div className="space-y-6">
                    {[...days.entries()].map(([day, items]) => {
                      const d = parseDate(day)!;
                      const rel = fmt.relativeDays(day);
                      return (
                        <div key={day} className="flex gap-4 md:gap-6">
                          <div className="w-14 shrink-0 pt-1 text-center md:w-16">
                            <p className="text-[26px] font-bold leading-none tabular-nums">{d.getDate()}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-white/40">{fmt.weekday(d).slice(0, 3)}</p>
                            {rel && <p className="mt-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-black">{rel}</p>}
                          </div>
                          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                            {items.map((it) => (
                              <Link key={it.key} to={mediaPath(it.type, it.tmdbId)} className="flex items-center gap-3 rounded-2xl bg-white/[0.035] p-2.5 ring-1 ring-white/[0.05] transition hover:bg-white/[0.07]">
                                <span className="h-[72px] w-12 shrink-0 overflow-hidden rounded-lg bg-white/[0.05]">
                                  <TmdbImage src={img(it.posterPath, 'w154')} alt="" className="size-full object-cover" fallback={<Icon name="film" size={14} />} />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-[14.5px] font-medium">{it.title}</span>
                                  <span className="block truncate text-[12px] text-white/45">{it.originalTitle !== it.title ? it.originalTitle : fmt.date(it.releaseDate)}</span>
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      <LoadMore onLoad={paged.loadMore} loading={paged.loading} hasMore={paged.hasMore} error={paged.error} onRetry={paged.retry} />
    </Page>
  );
}
