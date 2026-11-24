import { useState } from 'react';
import { tmdb } from '../api/tmdb';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { TmdbImage } from '../components/MediaCard';
import { Button, Chip, EmptyState, ErrorState, IconButton, ProgressBar, Skeleton, useFeedback } from '../components/ui';
import { useLiveQuery, useQuery } from '../hooks/hooks';
import { episodeId, seriesRepository } from '../repositories/seriesRepository';
import { Link, navigate } from '../router/router';
import { SERIES_STATUS_LABEL } from '../services/seriesProgress';
import type { Episode } from '../types/media';
import { fmt } from '../utils/format';
import { img } from '../utils/images';

const today = () => new Date().toISOString().slice(0, 10);

export default function Season({ params }: { params: { id: string; season: string } }) {
  const seriesId = Number(params.id);
  const seasonNumber = Number(params.season);
  const { toast } = useFeedback();
  const [busy, setBusy] = useState<string | null>(null);

  const series = useQuery(() => tmdb.details('tv', seriesId), [seriesId]);
  const season = useQuery(() => tmdb.season(seriesId, seasonNumber), [seriesId, seasonNumber]);
  const watched = useLiveQuery(async () => new Set((await seriesRepository.getWatchedEpisodes(seriesId)).map((e) => e.id)), ['series'], [seriesId]);
  const progress = useLiveQuery(() => seriesRepository.progress(seriesId), ['series'], [seriesId]);

  const error = series.error ?? season.error;
  if (error) return <Page className="pt-24 lg:pt-12"><ErrorState error={error} onRetry={() => { series.reload(); season.reload(); }} /></Page>;
  if (!series.data || !season.data) {
    return (
      <Page className="space-y-4 pt-24 lg:pt-12">
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </Page>
    );
  }

  const d = series.data;
  const s = season.data;
  const set = watched.data ?? new Set<string>();
  const aired = (e: Episode) => !e.airDate || e.airDate <= today();
  const airedEpisodes = s.episodes.filter(aired);
  const watchedHere = s.episodes.filter((e) => set.has(episodeId(seriesId, e.seasonNumber, e.episodeNumber))).length;
  const allWatched = airedEpisodes.length > 0 && airedEpisodes.every((e) => set.has(episodeId(seriesId, e.seasonNumber, e.episodeNumber)));
  const p = progress.data;
  const regularSeasons = d.seasons.filter((x) => x.episodeCount > 0).sort((a, b) => (a.seasonNumber === 0 ? 1 : b.seasonNumber === 0 ? -1 : a.seasonNumber - b.seasonNumber));

  const toggleEpisode = async (e: Episode) => {
    const id = episodeId(seriesId, e.seasonNumber, e.episodeNumber);
    setBusy(id);
    try {
      const record = await seriesRepository.ensure(d);
      const was = set.has(id);
      await seriesRepository.setEpisodeWatched(record, e, !was);
      if (!was) {
        const np = await seriesRepository.progress(seriesId);
        if (np?.status === 'completed') toast('Tebrikler! Diziyi tamamladınız', { icon: 'sparkle' });
        else if (np?.status === 'caught-up') toast('Yayınlanan tüm bölümleri izlediniz', { icon: 'check' });
      }
    } catch (err) {
      toast((err as Error).message, { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const toggleSeason = async () => {
    setBusy('season');
    try {
      const record = await seriesRepository.ensure(d);
      await seriesRepository.setSeasonWatched(record, s.episodes, !allWatched);
      toast(allWatched ? 'Sezon işaretleri kaldırıldı' : `${s.name} izlendi olarak işaretlendi`);
    } catch (err) {
      toast((err as Error).message, { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="relative h-[34vh] min-h-[240px] w-full overflow-hidden">
        <TmdbImage src={img(d.backdropPath, 'w1280')} alt="" eager className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
      </div>
      <Page className="relative -mt-36 pb-12">
        <Link to={`/dizi/${seriesId}`} className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-white/60 hover:text-white">
          <Icon name="chevronLeft" size={16} /> {d.title}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight md:text-[42px]">{s.name}</h1>
            <p className="mt-1 text-[14px] text-white/55">
              {[s.airDate && fmt.date(s.airDate), `${s.episodes.length} bölüm`, `${watchedHere} izlendi`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Button variant={allWatched ? 'secondary' : 'primary'} icon={allWatched ? 'close' : 'check'} disabled={busy === 'season' || airedEpisodes.length === 0} onClick={toggleSeason}>
            {allWatched ? 'Sezon işaretini kaldır' : 'Sezonu izledim'}
          </Button>
        </div>

        {p && (
          <div className="mt-6 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.06]">
            <div className="mb-2 flex justify-between text-[13px]">
              <span className="font-medium">Dizi ilerlemesi · {SERIES_STATUS_LABEL[p.status]}</span>
              <span className="tabular-nums text-white/50">{p.watched}/{p.total} · %{p.percent}</span>
            </div>
            <ProgressBar value={p.percent} tone={p.status === 'completed' ? 'green' : 'white'} />
          </div>
        )}

        <div className="no-scrollbar -mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
          {regularSeasons.map((x) => (
            <Chip key={x.seasonNumber} active={x.seasonNumber === seasonNumber} onClick={() => navigate(`/dizi/${seriesId}/sezon/${x.seasonNumber}`, { replace: true })}>
              {x.seasonNumber === 0 ? 'Özel' : `${x.seasonNumber}. Sezon`}
            </Chip>
          ))}
        </div>

        {s.overview && <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-white/70">{s.overview}</p>}

        {s.episodes.length === 0 ? (
          <EmptyState icon="tv" title="Bölüm bilgisi yok" text="TMDB bu sezon için henüz bölüm listesi yayımlamadı." />
        ) : (
          <ol className="mt-8 space-y-3">
            {s.episodes.map((e) => {
              const id = episodeId(seriesId, e.seasonNumber, e.episodeNumber);
              const isWatched = set.has(id);
              const isAired = aired(e);
              return (
                <li key={id} className={`flex gap-4 rounded-2xl p-3 ring-1 transition md:p-4 ${isWatched ? 'bg-white/[0.06] ring-white/[0.1]' : 'bg-white/[0.025] ring-white/[0.05]'}`}>
                  <div className="relative hidden aspect-video w-[200px] shrink-0 overflow-hidden rounded-xl bg-white/[0.05] sm:block">
                    <TmdbImage src={img(e.stillPath, 'w300')} alt="" className={`size-full object-cover ${isWatched ? 'opacity-60' : ''}`} fallback={<Icon name="tv" size={22} />} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/40">{e.episodeNumber}. Bölüm</p>
                    <h3 className="mt-0.5 text-[15.5px] font-semibold leading-snug">{e.name}</h3>
                    <p className="mt-1 text-[12.5px] text-white/45">
                      {[e.airDate ? fmt.date(e.airDate) : 'Yayın tarihi belli değil', fmt.runtime(e.runtime), e.voteAverage > 0 ? `★ ${fmt.rating(e.voteAverage)}` : null].filter(Boolean).join(' · ')}
                    </p>
                    {e.overview && <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-white/60">{e.overview}</p>}
                  </div>
                  <div className="flex items-center">
                    {isAired ? (
                      <IconButton icon="check" label={isWatched ? 'İzlenmedi olarak işaretle' : 'İzlendi olarak işaretle'} active={isWatched} size={44} disabled={busy === id} onClick={() => toggleEpisode(e)} />
                    ) : (
                      <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[11.5px] font-medium text-white/50">Yakında</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Page>
    </div>
  );
}
