import { useEffect, useRef, useState } from 'react';
import { tmdb } from '../api/tmdb';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { mediaPath, TmdbImage } from '../components/MediaCard';
import { Button, ErrorState, PageHeader, Segmented, Select, useFeedback } from '../components/ui';
import { useQuery } from '../hooks/hooks';
import { navigate } from '../router/router';
import { toggleList, useLibraryIndex } from '../services/library';
import type { MediaSummary, MediaType } from '../types/media';
import { fmt, KIND_LABEL } from '../utils/format';
import { backdropSrcSet, img } from '../utils/images';

const DECADES = ['2020', '2010', '2000', '1990', '1980', '1970', '1960'];

/** "Ne izlesem?" — seçilen filtrelere uyan içerikler arasından rastgele seçim. */
export default function RandomPicker() {
  const { toast } = useFeedback();
  const lib = useLibraryIndex();
  const [type, setType] = useState<MediaType>('movie');
  const [genre, setGenre] = useState('');
  const [decade, setDecade] = useState('');
  const [rating, setRating] = useState('7');
  const [result, setResult] = useState<MediaSummary | null>(null);
  const [spinning, setSpinning] = useState<MediaSummary[] | null>(null);
  const [frame, setFrame] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const genres = useQuery(() => tmdb.genres(type), [type]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const pick = async () => {
    setError(null);
    try {
      const filters = {
        genreId: genre ? Number(genre) : null,
        decade: decade ? Number(decade) : null,
        minRating: rating ? Number(rating) : null,
        minVotes: 150,
        sort: 'votes' as const,
      };
      const first = await tmdb.discover(type, filters, 1);
      if (!first.results.length) {
        setResult(null);
        toast('Bu filtrelere uyan içerik bulunamadı', { tone: 'error' });
        return;
      }
      const page = 1 + Math.floor(Math.random() * Math.min(first.totalPages, 20));
      const pool = (page === 1 ? first : await tmdb.discover(type, filters, page)).results.filter((r) => r.posterPath);
      const candidates = pool.length ? pool : first.results;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)]!;
      // Kısa bir "çark" animasyonu
      setSpinning(candidates);
      setResult(null);
      let n = 0;
      timer.current = setInterval(() => {
        n++;
        setFrame(n);
        if (n > 11) {
          if (timer.current) clearInterval(timer.current);
          setSpinning(null);
          setResult(chosen);
        }
      }, 85);
    } catch (e) {
      setError(e);
    }
  };

  const shown = spinning ? spinning[frame % spinning.length]! : result;
  const inList = result ? lib.watchlist.has(result.key) : false;

  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <PageHeader title="Rastgele Seçici" subtitle="Kararsız kaldığınızda FILMHUB sizin için seçsin" />
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Segmented value={type} onChange={(v) => { setType(v); setGenre(''); }} options={[{ value: 'movie', label: 'Film' }, { value: 'tv', label: 'Dizi' }]} />
        <Select label="Tür" value={genre} onChange={setGenre} options={[{ value: '', label: 'Her tür' }, ...(genres.data ?? []).map((g) => ({ value: String(g.id), label: g.name }))]} />
        <Select label="Dönem" value={decade} onChange={setDecade} options={[{ value: '', label: 'Her dönem' }, ...DECADES.map((d) => ({ value: d, label: `${d}’ler` }))]} />
        <Select label="En düşük puan" value={rating} onChange={setRating} options={[{ value: '', label: 'Puan fark etmez' }, ...['8', '7', '6'].map((r) => ({ value: r, label: `${r}+ puan` }))]} />
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] ring-1 ring-white/[0.06]">
        {shown ? (
          <div className="relative">
            <div className="aspect-[4/5] sm:aspect-[21/9]">
              <TmdbImage key={shown.key} src={img(shown.backdropPath ?? shown.posterPath, 'w1280')} srcSet={backdropSrcSet(shown.backdropPath)} sizes="100vw" alt="" eager className="size-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent sm:bg-gradient-to-r sm:from-black sm:via-black/60" />
            <div className={`absolute inset-x-0 bottom-0 max-w-xl p-6 sm:inset-y-0 sm:flex sm:flex-col sm:justify-center md:p-10 ${spinning ? 'opacity-60 blur-[1px]' : 'animate-hero-text'}`}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/55">{KIND_LABEL[shown.kind]}</p>
              <h2 className="mt-2 text-[30px] font-bold leading-tight tracking-tight md:text-[42px]">{shown.title}</h2>
              <p className="mt-2 text-[13.5px] text-white/60">{[shown.year, shown.voteAverage ? `★ ${fmt.rating(shown.voteAverage)}` : null].filter(Boolean).join(' · ')}</p>
              {!spinning && shown.overview && <p className="mt-3 line-clamp-3 text-[14.5px] leading-relaxed text-white/70">{shown.overview}</p>}
              {!spinning && result && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button variant="primary" icon="play" iconFilled onClick={() => navigate(mediaPath(result.type, result.tmdbId))}>Detaylar</Button>
                  <Button variant="glass" icon={inList ? 'check' : 'plus'} onClick={async () => toast(await toggleList('watchlist', result.key, result.type, result.tmdbId, inList))}>{inList ? 'Listede' : 'İzleme listesine ekle'}</Button>
                  <Button variant="glass" icon="shuffle" onClick={pick}>Tekrar seç</Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-white/[0.06]"><Icon name="shuffle" size={36} className="text-white/70" /></div>
            <h2 className="text-[22px] font-semibold">Ne izlesem?</h2>
            <p className="mt-2 max-w-md text-[14px] text-white/50">Filtreleri seçin ve düğmeye basın. Seçim, TMDB’de yeterli oy almış içerikler arasından yapılır.</p>
            {error ? <div className="mt-6 w-full max-w-md"><ErrorState error={error} onRetry={pick} compact /></div> : null}
            <Button variant="primary" size="lg" icon="shuffle" className="mt-8" onClick={pick}>Rastgele seç</Button>
          </div>
        )}
      </div>
    </Page>
  );
}
