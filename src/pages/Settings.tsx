import type { ReactNode } from 'react';
import { keySource, setUserApiKey } from '../api/config';
import { clearApiCache } from '../api/tmdb';
import { ApiKeyForm } from '../components/ApiKeyForm';
import { DataNotice } from '../components/DataNotice';
import { Icon, LogoMark, type IconName } from '../components/Icon';
import { Page } from '../components/Layout';
import { Button, PageHeader, useFeedback } from '../components/ui';
import { storage } from '../db';
import { useLiveQuery } from '../hooks/hooks';
import { openExternal, platform, PLATFORM_LABEL } from '../platform/platform';
import { preferencesRepository, wipeAllPersonalData } from '../repositories/preferencesRepository';
import { searchHistoryRepository } from '../repositories/searchHistoryRepository';
import { fmt } from '../utils/format';

declare const __APP_VERSION__: string;

function Section({ icon, title, subtitle, children }: { icon: IconName; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/[0.06] md:p-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]"><Icon name={icon} size={19} /></span>
        <div>
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-white/45">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Settings() {
  const { toast, confirm } = useFeedback();
  const counts = useLiveQuery(async () => {
    const s = storage();
    const [watched, watchlist, favorites, ratings, reviews, episodes, collections, cache, history] = await Promise.all([
      s.count('watched'), s.count('watchlist'), s.count('favorites'), s.count('ratings'), s.count('reviews'),
      s.count('watchedEpisodes'), s.count('collections'), s.count('apiCache'), s.count('searchHistory'),
    ]);
    return { watched, watchlist, favorites, ratings, reviews, episodes, collections, cache, history };
  }, ['library', 'ratings', 'series', 'collections', 'history', 'prefs']);
  const keyInfo = useLiveQuery(async () => keySource(), ['prefs']);
  const c = counts.data;

  const removeKey = async () => {
    if (!(await confirm({ title: 'API anahtarı kaldırılsın mı?', text: 'İçerikler, yeni bir anahtar girilene kadar yüklenemez. Kişisel kayıtlarınız etkilenmez.', confirmLabel: 'Kaldır', danger: true }))) return;
    setUserApiKey(null);
    await preferencesRepository.remove('tmdbApiKey');
    await clearApiCache();
    toast('API anahtarı kaldırıldı');
  };

  const wipe = async () => {
    const ok = await confirm({
      title: 'Tüm kişisel veriler silinsin mi?',
      text: 'İzlediklerim, izleme listesi, favoriler, puanlar, yorumlar, notlar, dizi ilerlemesi, koleksiyonlar ve arama geçmişi kalıcı olarak silinecek. Yedekleme olmadığı için bu işlem geri alınamaz.',
      confirmLabel: 'Hepsini kalıcı olarak sil',
      danger: true,
    });
    if (!ok) return;
    await wipeAllPersonalData();
    toast('Tüm kişisel veriler silindi');
  };

  const stats: [string, number | undefined][] = [
    ['İzlenen', c?.watched], ['İzleme listesi', c?.watchlist], ['Favori', c?.favorites], ['Puan', c?.ratings],
    ['Yorum', c?.reviews], ['İzlenen bölüm', c?.episodes], ['Koleksiyon', c?.collections],
  ];

  return (
    <Page className="max-w-4xl pb-12 pt-20 lg:pt-10">
      <PageHeader title="Ayarlar" />
      <div className="space-y-5">
        <Section icon="key" title="TMDB bağlantısı" subtitle={
          keyInfo.data === 'user' ? 'Bu cihaza kaydedilmiş anahtar kullanılıyor.' : keyInfo.data === 'build' ? 'Derleme sırasında tanımlanan anahtar kullanılıyor.' : 'Henüz bir API anahtarı tanımlanmadı.'
        }>
          <ApiKeyForm />
          {keyInfo.data === 'user' && <Button size="sm" variant="danger" icon="trash" className="mt-4" onClick={removeKey}>Kayıtlı anahtarı kaldır</Button>}
        </Section>

        <Section icon="library" title="Verileriniz" subtitle="Tüm kişisel kayıtlar yalnızca bu cihazda tutulur; hesap, sunucu veya senkronizasyon yoktur.">
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(([label, n]) => (
              <div key={label} className="rounded-xl bg-white/[0.04] px-4 py-3">
                <p className="text-[20px] font-semibold tabular-nums">{n === undefined ? '–' : fmt.number(n)}</p>
                <p className="text-[12px] text-white/45">{label}</p>
              </div>
            ))}
          </div>
          <DataNotice always />
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" icon="refresh" onClick={async () => { await clearApiCache(); toast('Önbellek temizlendi'); }}>
              İçerik önbelleğini temizle{c ? ` (${fmt.number(c.cache)})` : ''}
            </Button>
            <Button size="sm" icon="history" disabled={!c?.history} onClick={async () => { await searchHistoryRepository.clear(); toast('Arama geçmişi temizlendi'); }}>
              Arama geçmişini temizle
            </Button>
            <Button size="sm" variant="danger" icon="trash" onClick={wipe}>Tüm kişisel verileri sil</Button>
          </div>
        </Section>

        <Section icon="info" title="Hakkında">
          <div className="flex items-center gap-4">
            <LogoMark size={60} />
            <div>
              <p className="text-[20px] font-semibold tracking-[0.18em]">FILM<span className="text-white/50">HUB</span></p>
              <p className="text-[13px] text-white/45">Sürüm {__APP_VERSION__} · {PLATFORM_LABEL[platform()]}</p>
            </div>
          </div>
          <p className="mt-5 text-[14px] leading-relaxed text-white/65">
            Film, dizi ve belgesel keşif ve kişisel koleksiyon platformu. FILMHUB tam uzunlukta film veya bölüm yayınlamaz;
            fragmanlar YouTube’un resmi oynatıcısıyla gösterilir.
          </p>
          <div className="mt-6 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.05]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md bg-gradient-to-r from-[#90cea1] to-[#01b4e4] px-2 py-1 text-[12px] font-black tracking-wider text-[#0d253f]">TMDB</span>
              <p className="flex-1 text-[12.5px] leading-relaxed text-white/55">
                Bu ürün TMDB API’sini kullanır ancak TMDB tarafından onaylanmamış veya sertifikalandırılmamıştır.
                Film ve dizi verileri, görseller ve puanlar The Movie Database (TMDB) kaynaklıdır.
              </p>
            </div>
            <button type="button" className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-white/60 hover:text-white" onClick={() => openExternal('https://www.themoviedb.org/')}>
              themoviedb.org <Icon name="external" size={12} />
            </button>
          </div>
          <p className="mt-8 text-center text-[12px] tracking-[0.2em] text-white/35">DESIGNED &amp; DEVELOPED BY FURKAN</p>
        </Section>
      </div>
    </Page>
  );
}
