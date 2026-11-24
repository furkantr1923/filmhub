import type { ReactNode } from 'react';
import { ActivityHeatmap, BarChart, DonutChart, HBarList } from '../components/Charts';
import { Icon, type IconName } from '../components/Icon';
import { Page } from '../components/Layout';
import { Button, EmptyState, PageHeader } from '../components/ui';
import { useLiveQuery } from '../hooks/hooks';
import { libraryRepository } from '../repositories/libraryRepository';
import { mediaRepository } from '../repositories/mediaRepository';
import { ratingRepository } from '../repositories/ratingRepository';
import { seriesRepository } from '../repositories/seriesRepository';
import { navigate } from '../router/router';
import { computeStats, formatDuration } from '../services/stats';
import { fmt } from '../utils/format';

function Kpi({ icon, label, value, hint }: { icon: IconName; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/[0.06]">
      <div className="mb-4 flex size-9 items-center justify-center rounded-xl bg-white/[0.08] text-white/80"><Icon name={icon} size={18} /></div>
      <p className="whitespace-nowrap text-[24px] font-bold leading-none tabular-nums tracking-tight md:text-[26px]">{value}</p>
      <p className="mt-2 text-[13px] text-white/55">{label}</p>
      {hint && <p className="mt-1 text-[11.5px] text-white/35">{hint}</p>}
    </div>
  );
}

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/[0.06] md:p-6 ${className}`}>
      <h2 className="text-[16px] font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[12.5px] text-white/40">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Tüm sayılar yalnızca bu cihazda kayıtlı gerçek verilerden hesaplanır. */
export default function Stats() {
  const data = useLiveQuery(async () => {
    const [mediaItems, watched, ratings, episodes] = await Promise.all([
      mediaRepository.getAll(),
      libraryRepository.getWatched(),
      ratingRepository.getAllRatings(),
      seriesRepository.getAllWatchedEpisodes(),
    ]);
    return computeStats({ mediaItems, watched, ratings, episodes }, fmt.country);
  }, ['library', 'ratings', 'series']);

  const s = data.data;
  if (data.loading && !s) return null;
  if (!s || !s.hasData) {
    return (
      <Page className="pb-12 pt-20 lg:pt-10">
        <PageHeader title="İstatistikler" />
        <EmptyState icon="chart" title="Henüz istatistik yok"
          text="İçerikleri izlendi olarak işaretleyip puan verdikçe ve dizi bölümlerini takip ettikçe kişisel sinema istatistikleriniz burada oluşur."
          action={<Button variant="primary" icon="compass" onClick={() => navigate('/')}>Keşfetmeye başla</Button>} />
      </Page>
    );
  }

  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <PageHeader title="İstatistikler" subtitle="İzleme alışkanlıklarınız — yalnızca bu cihazdaki kayıtlarınızdan" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon="film" label="İzlenen film" value={fmt.number(s.movies)} />
        <Kpi icon="tv" label="Tamamlanan dizi" value={fmt.number(s.series)} />
        <Kpi icon="globe" label="Belgesel" value={fmt.number(s.documentaries)} />
        <Kpi icon="layers" label="İzlenen bölüm" value={fmt.number(s.episodes)} />
        <Kpi icon="clock" label="Tahmini izleme süresi" value={formatDuration(s.totalMinutes)} hint={s.unknownRuntime ? `${s.unknownRuntime} kaydın süresi bilinmiyor, hesaba katılmadı` : 'TMDB süre bilgilerine göre'} />
        <Kpi icon="star" label="Ortalama puanım" value={s.averageRating !== null ? fmt.personalRating(s.averageRating) : '–'} hint={`${s.ratingCount} puan`} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Aylık izleme" subtitle="Son 12 ay · film ve bölümler"><BarChart data={s.monthly} label="Aylık izleme" highlightLast /></Card>
        <Card title="Yıllara göre" subtitle="İzleme tarihine göre">
          {s.yearly.length ? <BarChart data={s.yearly} label="Yıllık izleme" /> : <p className="text-sm text-white/40">Veri yok</p>}
        </Card>
        <Card title="Tür dağılımı" subtitle="İzlenen içeriklerin türleri">
          {s.genres.length ? <DonutChart data={s.genres} label="Tür dağılımı" centerLabel="tür etiketi" /> : <p className="text-sm text-white/40">Veri yok</p>}
        </Card>
        <Card title="Ülke dağılımı" subtitle="Yapım ülkelerine göre">
          {s.countries.length ? <HBarList data={s.countries} label="Ülke dağılımı" /> : <p className="text-sm text-white/40">Veri yok</p>}
        </Card>
        <Card title="Puan dağılımı" subtitle="Verdiğiniz puanlar (0–10)">
          {s.ratingCount ? <BarChart data={s.ratingDistribution} label="Puan dağılımı" /> : <p className="text-sm text-white/40">Henüz puan vermediniz</p>}
        </Card>
        <Card title="İzleme etkinliği" subtitle="Son 52 hafta"><ActivityHeatmap activity={s.activity} /></Card>
      </div>
    </Page>
  );
}
