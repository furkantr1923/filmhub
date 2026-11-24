import { useState } from 'react';
import { hasApiKey } from '../api/config';
import { tmdb } from '../api/tmdb';
import { ApiKeyForm } from '../components/ApiKeyForm';
import { Hero, HeroSkeleton } from '../components/Hero';
import { Icon, LogoMark } from '../components/Icon';
import { Page } from '../components/Layout';
import { mediaPath, TmdbImage } from '../components/MediaCard';
import { MediaRow, RowHeader, Scroller } from '../components/Row';
import { Button, ErrorState, Skeleton } from '../components/ui';
import { useInView, useLiveQuery, useQuery } from '../hooks/hooks';
import { seriesRepository } from '../repositories/seriesRepository';
import { Link, navigate } from '../router/router';
import { CURATED, type CuratedDef } from '../services/lists';
import { computeSeriesProgress } from '../services/seriesProgress';
import { mediaRepository } from '../repositories/mediaRepository';
import { fmt, KIND_LABEL } from '../utils/format';
import { backdropSrcSet, img } from '../utils/images';
import { daySeed } from '../utils/text';

const take = (n: number) => <T,>(p: { results: T[] }) => p.results.slice(0, n);

function Welcome({ onReady }: { onReady: () => void }) {
  return (
    <Page className="flex min-h-[88vh] items-center pt-24 lg:pt-10">
      <div className="mx-auto w-full max-w-2xl text-center animate-fade-in">
        <div className="mx-auto mb-8 w-fit"><LogoMark size={76} /></div>
        <h1 className="text-[34px] font-bold tracking-tight md:text-[46px]">FILMHUB’a hoş geldiniz</h1>
        <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/60">
          Filmleri, dizileri ve belgeselleri keşfedin; izleme listenizi, puanlarınızı ve dizi ilerlemenizi tek yerde tutun.
          Başlamak için ücretsiz bir TMDB API anahtarı yeterli.
        </p>
        <div className="mx-auto mt-10 max-w-xl rounded-3xl bg-white/[0.04] p-5 text-left ring-1 ring-white/[0.07] md:p-7">
          <ApiKeyForm onSaved={onReady} />
        </div>
        <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 text-left text-[13px] text-white/55 sm:grid-cols-3">
          {[
            ['library', 'Hesap gerekmez', 'Tüm kişisel veriler cihazınızda'],
            ['tv', 'Dizi takibi', 'Bölüm bölüm ilerleme'],
            ['chart', 'İstatistikler', 'Gerçek izleme verilerinizden'],
          ].map(([icon, t, d]) => (
            <div key={t} className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.05]">
              <Icon name={icon as 'library'} size={20} className="mb-2 text-white/70" />
              <p className="font-semibold text-white/85">{t}</p>
              <p className="mt-0.5">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

/** Günün filmi: en yüksek puanlı filmlerden tarihe göre sabit seçilir (her gün değişir, gün içinde aynı kalır). */
function FeaturedOfDay() {
  const q = useQuery(async () => {
    const seed = daySeed();
    const page = (seed % 5) + 1;
    const list = (await tmdb.topRatedMovies(page)).results.filter((m) => m.backdropPath && m.overview);
    return list.length ? list[seed % list.length]! : null;
  }, []);
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} compact />;
  if (q.loading || !q.data) return <Skeleton className="aspect-[21/9] w-full rounded-3xl" />;
  const m = q.data;
  return (
    <section aria-label="Günün filmi">
      <Link to={mediaPath(m.type, m.tmdbId)} className="group relative block overflow-hidden rounded-3xl ring-1 ring-white/[0.07]">
        <div className="aspect-[4/5] sm:aspect-[16/8] lg:aspect-[21/8]">
          <TmdbImage src={img(m.backdropPath, 'w1280')} srcSet={backdropSrcSet(m.backdropPath)} sizes="(max-width: 1024px) 100vw, 1400px" alt={m.title} className="size-full object-cover transition-transform duration-[1.5s] group-hover:scale-[1.03]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent sm:bg-gradient-to-r sm:from-black/90 sm:via-black/45" />
        <div className="absolute inset-x-0 bottom-0 max-w-xl p-6 sm:inset-y-0 sm:flex sm:flex-col sm:justify-center md:p-10">
          <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-xl">
            <Icon name="sparkle" size={13} /> Günün Filmi
          </p>
          <h2 className="text-[28px] font-bold leading-tight tracking-tight md:text-[40px]">{m.title}</h2>
          <p className="mt-2 text-[13px] text-white/55">{[m.year, `★ ${fmt.rating(m.voteAverage)}`, `${fmt.compact(m.voteCount)} oy`].filter(Boolean).join(' · ')}</p>
          <p className="mt-3 line-clamp-3 text-[14.5px] leading-relaxed text-white/70">{m.overview}</p>
        </div>
      </Link>
    </section>
  );
}

function CuratedCard({ def }: { def: CuratedDef }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const q = useQuery(() => def.fetch(1), [def.slug], { enabled: inView });
  const cover = q.data?.results.find((r) => r.backdropPath)?.backdropPath ?? null;
  return (
    <Link to={`/liste/${def.slug}`} className="group block w-full">
      <span ref={ref} className="relative block aspect-[16/10] overflow-hidden rounded-[16px] bg-white/[0.05] ring-1 ring-white/[0.06] transition group-hover:ring-white/25">
        {cover && <TmdbImage src={img(cover, 'w780')} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />}
        <span className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
        <span className="absolute inset-x-0 bottom-0 p-4">
          <span className="block text-[16px] font-semibold text-white">{def.title}</span>
          <span className="mt-0.5 block text-[12px] text-white/55">{def.description}</span>
        </span>
      </span>
    </Link>
  );
}

function GenreChips() {
  const q = useQuery(() => tmdb.genres('movie'), []);
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} compact />;
  return (
    <section aria-label="Popüler türler">
      <RowHeader title="Popüler Türler" to="/kesfet" />
      <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 md:flex-wrap">
        {(q.data ?? Array.from({ length: 12 }, (_, i) => ({ id: -i, name: '' }))).map((g) => (
          g.id < 0 ? <Skeleton key={g.id} className="h-11 w-28 shrink-0 rounded-full" /> : (
            <Link key={g.id} to={`/kesfet/movie/${g.id}`} className="flex h-11 shrink-0 items-center rounded-full bg-white/[0.07] px-5 text-[14px] font-medium text-white/85 ring-1 ring-white/[0.05] transition hover:bg-white hover:text-black">
              {g.name}
            </Link>
          )
        ))}
      </div>
    </section>
  );
}

/** Kullanıcının izlemeye devam ettiği diziler (yalnızca yerel veriden). */
function ContinueWatching() {
  const q = useLiveQuery(async () => {
    const [records, eps] = await Promise.all([seriesRepository.getAll(), seriesRepository.getAllWatchedEpisodes()]);
    const out = [];
    for (const r of records) {
      const own = eps.filter((e) => e.seriesId === r.tmdbId);
      const p = computeSeriesProgress(r, own);
      if (p.status === 'watching' && p.next && own.length) {
        const item = await mediaRepository.get(r.key);
        if (item) out.push({ item, p, last: Math.max(...own.map((e) => e.watchedAt)) });
      }
    }
    return out.sort((a, b) => b.last - a.last).slice(0, 12);
  }, ['series']);
  if (!q.data?.length) return null;
  return (
    <section aria-label="İzlemeye devam et">
      <RowHeader title="İzlemeye Devam Et" to="/takip" />
      <Scroller>
        {q.data.map(({ item, p }) => (
          <div key={item.key} className="row-item-backdrop snap-start">
            <Link to={`/dizi/${item.tmdbId}/sezon/${p.next!.seasonNumber}`} className="group block">
              <div className="relative aspect-video overflow-hidden rounded-[14px] bg-white/[0.05] ring-1 ring-white/[0.06] group-hover:ring-white/25">
                <TmdbImage src={img(item.backdropPath, 'w780')} alt={item.title} className="size-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <p className="truncate text-[14.5px] font-semibold">{item.title}</p>
                  <p className="text-[12px] text-white/60">Sıradaki: {p.next!.seasonNumber}. Sezon {p.next!.episodeNumber}. Bölüm</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full bg-white" style={{ width: `${p.percent}%` }} /></div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </Scroller>
    </section>
  );
}

export default function Home() {
  const [keyReady, setKeyReady] = useState(hasApiKey());
  const hero = useQuery(() => tmdb.trending('all', 'day').then(take(10)), [keyReady], { enabled: keyReady });

  if (!keyReady) return <Welcome onReady={() => setKeyReady(true)} />;

  return (
    <div>
      {hero.error ? (
        <Page className="pt-24 lg:pt-10"><ErrorState error={hero.error} onRetry={hero.reload} /></Page>
      ) : hero.loading || !hero.data ? <HeroSkeleton /> : <Hero items={hero.data} />}

      <Page className="relative z-10 space-y-11 pb-10 md:space-y-14">
        <ContinueWatching />
        <MediaRow title="Popüler Filmler" to="/liste/populer-filmler" load={() => tmdb.popularMovies().then(take(20))} />
        <MediaRow title="Trend Filmler" subtitle="Bu hafta en çok konuşulanlar" to="/liste/trend-filmler" load={() => tmdb.trending('movie').then(take(20))} />
        <MediaRow title="Trend Diziler" to="/liste/trend-diziler" load={() => tmdb.trending('tv').then(take(20))} />
        <FeaturedOfDay />
        <MediaRow title="Popüler Belgeseller" to="/liste/belgeseller" variant="backdrop" label="Belgesel" load={() => tmdb.popularDocumentaries().then((p) => p.results.filter((r) => r.backdropPath).slice(0, 16))} />
        <MediaRow title="En Yüksek Puanlılar" subtitle="TMDB topluluğunun favorileri" to="/liste/en-iyi-filmler" load={() => tmdb.topRatedMovies().then(take(20))} />
        <MediaRow title="Yakında" subtitle="Türkiye’de vizyona girecekler" to="/takvim" load={() => tmdb.upcomingMovies().then(take(20))} />
        <MediaRow title="Yeni Çıkanlar" subtitle="Şu anda vizyonda" to="/liste/yeni-cikanlar" load={() => tmdb.nowPlayingMovies().then(take(20))} />
        <section aria-label="Küratörlü koleksiyonlar">
          <RowHeader title="Küratörlü Koleksiyonlar" subtitle="TMDB verilerinden derlenmiş temalı listeler" />
          <Scroller>
            {CURATED.map((c) => <div key={c.slug} className="row-item-backdrop snap-start"><CuratedCard def={c} /></div>)}
          </Scroller>
        </section>
        <MediaRow title="En Yüksek Puanlı Diziler" to="/liste/en-iyi-diziler" load={() => tmdb.topRatedTv().then(take(20))} />
        <GenreChips />
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Button icon="shuffle" onClick={() => navigate('/rastgele')}>Ne izlesem? Rastgele seç</Button>
          <Button icon="compass" onClick={() => navigate('/kesfet')}>Türleri keşfet</Button>
        </div>
        <p className="text-center text-[11px] text-white/25">İçerik verileri TMDB’den sağlanır · {KIND_LABEL.movie}, {KIND_LABEL.series.toLowerCase()} ve {KIND_LABEL.documentary.toLowerCase()}</p>
      </Page>
    </div>
  );
}
