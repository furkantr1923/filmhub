import { useState } from 'react';
import { tmdb } from '../api/tmdb';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { TmdbImage } from '../components/MediaCard';
import { Button, EmptyState, PageHeader, ProgressBar, Segmented, useFeedback } from '../components/ui';
import { useLiveQuery } from '../hooks/hooks';
import { mediaRepository } from '../repositories/mediaRepository';
import { seriesRepository } from '../repositories/seriesRepository';
import { Link, navigate } from '../router/router';
import { computeSeriesProgress, SERIES_STATUS_LABEL, type SeriesProgress } from '../services/seriesProgress';
import type { MediaItem, SeriesRecord, SeriesStatus } from '../types/db';
import { fmt } from '../utils/format';
import { img } from '../utils/images';

interface Row { record: SeriesRecord; item: MediaItem | undefined; progress: SeriesProgress; lastWatch: number }

function SeriesCard({ row }: { row: Row }) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const { record, item, progress: p } = row;
  const title = item?.title ?? `Dizi #${record.tmdbId}`;

  /** Sıradaki bölümü tek dokunuşla işaretler (bölüm bilgisi sezon verisinden alınır). */
  const markNext = async () => {
    if (!p.next) return;
    setBusy(true);
    try {
      const season = await tmdb.season(record.tmdbId, p.next.seasonNumber);
      const ep = season.episodes.find((e) => e.episodeNumber === p.next!.episodeNumber);
      if (!ep) throw new Error('Bölüm bilgisi bulunamadı');
      await seriesRepository.setEpisodeWatched(record, ep, true);
      toast(`${title}: S${ep.seasonNumber} B${ep.episodeNumber} izlendi`);
    } catch (e) {
      toast((e as Error).message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-4 rounded-2xl bg-white/[0.035] p-3 ring-1 ring-white/[0.06] md:p-4">
      <Link to={`/dizi/${record.tmdbId}`} className="relative hidden aspect-video w-[200px] shrink-0 overflow-hidden rounded-xl bg-white/[0.05] sm:block">
        <TmdbImage src={img(item?.backdropPath, 'w300')} alt={title} className="size-full object-cover" fallback={<Icon name="tv" size={22} />} />
      </Link>
      <Link to={`/dizi/${record.tmdbId}`} className="h-[90px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-white/[0.05] sm:hidden">
        <TmdbImage src={img(item?.posterPath, 'w154')} alt={title} className="size-full object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link to={`/dizi/${record.tmdbId}`} className="truncate text-[16px] font-semibold hover:underline">{title}</Link>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${p.status === 'completed' ? 'bg-emerald-400/15 text-emerald-300' : p.status === 'caught-up' ? 'bg-sky-400/15 text-sky-300' : 'bg-white/10 text-white/70'}`}>
              {SERIES_STATUS_LABEL[p.status]}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-white/50">
            {p.watched} / {p.total} bölüm · %{p.percent}{p.remaining > 0 ? ` · ${p.remaining} yayınlanmış bölüm kaldı` : ''}
          </p>
        </div>
        <ProgressBar value={p.percent} tone={p.status === 'completed' ? 'green' : 'white'} />
        <div className="flex flex-wrap items-center gap-2">
          {p.next && (
            <>
              <Button size="sm" variant="primary" icon="check" disabled={busy} onClick={markNext}>S{p.next.seasonNumber} B{p.next.episodeNumber} izledim</Button>
              <Button size="sm" onClick={() => navigate(`/dizi/${record.tmdbId}/sezon/${p.next!.seasonNumber}`)}>Bölümler</Button>
            </>
          )}
          {!p.next && p.status !== 'completed' && <span className="text-[12.5px] text-white/45">Yeni bölüm bekleniyor</span>}
          {p.status !== 'completed' && record.ended && p.remaining === 0 && p.watched < p.total && <span className="text-[12.5px] text-white/45">Kalan bölümler yayın tarihine sahip değil</span>}
        </div>
      </div>
    </div>
  );
}

export default function Tracker() {
  const [tab, setTab] = useState<SeriesStatus | 'history'>('watching');
  const data = useLiveQuery(async () => {
    const [records, eps] = await Promise.all([seriesRepository.getAll(), seriesRepository.getAllWatchedEpisodes()]);
    const media = await mediaRepository.getMany(records.map((r) => r.key));
    const rows: Row[] = records.map((record) => {
      const own = eps.filter((e) => e.seriesId === record.tmdbId);
      return {
        record,
        item: media.get(record.key),
        progress: computeSeriesProgress(record, own),
        lastWatch: own.reduce((m, e) => Math.max(m, e.watchedAt), record.updatedAt),
      };
    }).sort((a, b) => b.lastWatch - a.lastWatch);
    return { rows, history: await seriesRepository.history(60) };
  }, ['series', 'library']);

  const rows = data.data?.rows ?? [];
  const count = (s: SeriesStatus) => rows.filter((r) => r.progress.status === s).length;
  const visible = rows.filter((r) => r.progress.status === tab);
  const history = data.data?.history ?? [];

  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <PageHeader title="Dizi Takibi" subtitle="Bölüm bölüm ilerlemeniz, kalan bölümler ve izleme geçmişiniz" />
      <Segmented className="mb-7" value={tab} onChange={setTab} options={[
        { value: 'watching', label: 'İzleniyor', count: count('watching') },
        { value: 'caught-up', label: 'Güncel', count: count('caught-up') },
        { value: 'completed', label: 'Tamamlanan', count: count('completed') },
        { value: 'history', label: 'Geçmiş', count: history.length },
      ]} />

      {data.loading && !data.data ? null : tab === 'history' ? (
        history.length === 0 ? (
          <EmptyState icon="history" title="İzleme geçmişi boş" text="Bir dizinin sezon sayfasında bölümleri işaretledikçe burada görünür." />
        ) : (
          <ol className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
            {history.map((h) => (
              <li key={h.id}>
                <Link to={`/dizi/${h.seriesId}/sezon/${h.seasonNumber}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-white/[0.04]">
                  <span className="aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-white/[0.05]">
                    <TmdbImage src={img(h.stillPath ?? h.item?.backdropPath, 'w185')} alt="" className="size-full object-cover" fallback={<Icon name="tv" size={16} />} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium">{h.item?.title ?? 'Dizi'}</span>
                    <span className="block truncate text-[12.5px] text-white/50">S{h.seasonNumber} · B{h.episodeNumber} — {h.name}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-white/40">{fmt.dateShort(new Date(h.watchedAt))}</span>
                </Link>
              </li>
            ))}
          </ol>
        )
      ) : visible.length === 0 ? (
        <EmptyState
          icon="tv"
          title={tab === 'watching' ? 'İzlemekte olduğunuz dizi yok' : tab === 'caught-up' ? 'Güncel dizi yok' : 'Tamamlanan dizi yok'}
          text={tab === 'caught-up' ? 'Devam eden bir dizinin yayınlanmış tüm bölümlerini izlediğinizde burada görünür.' : 'Bir dizinin sezon sayfasından bölümleri işaretleyerek takibe başlayın.'}
          action={tab === 'watching' ? <Button variant="primary" icon="compass" onClick={() => navigate('/liste/trend-diziler')}>Trend dizilere göz at</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{visible.map((r) => <SeriesCard key={r.record.tmdbId} row={r} />)}</div>
      )}
    </Page>
  );
}
