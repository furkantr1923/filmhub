import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../platform/platform';
import { navigate } from '../router/router';
import type { MediaSummary } from '../types/media';
import { fmt, KIND_LABEL } from '../utils/format';
import { backdropSrcSet, img } from '../utils/images';
import { Icon } from './Icon';
import { mediaPath, TmdbImage } from './MediaCard';
import { Button, Skeleton } from './ui';

/** Sinematik öne çıkanlar alanı: büyük arka plan görseli, yavaşça değişen içerikler. */
export function Hero({ items }: { items: MediaSummary[] }) {
  const slides = items.filter((i) => i.backdropPath).slice(0, 6);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused || prefersReducedMotion()) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 8000);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  if (!slides.length) return null;
  const active = slides[index % slides.length]!;

  return (
    <section
      className="hero relative -mb-10 h-[72vh] min-h-[460px] w-full overflow-hidden md:-mb-24 md:h-[82vh] md:max-h-[880px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Öne çıkanlar"
    >
      {slides.map((s, i) => (
        <div key={s.key} className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${i === index ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i !== index}>
          <TmdbImage
            src={img(s.backdropPath, 'w1280')}
            srcSet={backdropSrcSet(s.backdropPath)}
            sizes="100vw"
            alt=""
            eager={i === 0}
            className={`size-full object-cover ${i === index ? 'hero-kenburns' : ''}`}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-transparent md:via-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30" />

      <div className="hero-content absolute inset-x-0 bottom-0 px-4 pb-20 md:px-8 md:pb-36 xl:px-12">
        <div key={active.key} className="max-w-2xl animate-hero-text">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-white/60">Bugün Trend · {KIND_LABEL[active.kind]}</p>
          <h1 className="text-[38px] font-bold leading-[1.02] tracking-tight text-white drop-shadow-2xl md:text-[64px]">{active.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-white/70">
            {active.year && <span>{active.year}</span>}
            {active.voteAverage > 0 && (
              <span className="inline-flex items-center gap-1"><Icon name="star" size={14} filled className="text-[var(--color-gold)]" />{fmt.rating(active.voteAverage)}</span>
            )}
            {active.originalTitle !== active.title && <span className="truncate text-white/45">{active.originalTitle}</span>}
          </div>
          {active.overview && <p className="mt-4 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-white/75 md:text-[16px]">{active.overview}</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" icon="play" iconFilled onClick={() => navigate(mediaPath(active.type, active.tmdbId))}>Detayları Gör</Button>
          </div>
        </div>
        {slides.length > 1 && (
          <div className="mt-8 flex gap-2" role="tablist" aria-label="Öne çıkan içerik seç">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={s.title}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/60'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative -mb-10 h-[72vh] min-h-[460px] w-full md:-mb-24 md:h-[82vh] md:max-h-[880px]">
      <Skeleton className="absolute inset-0 rounded-none opacity-40" />
      <div className="absolute bottom-24 left-4 w-2/3 max-w-xl space-y-4 md:bottom-36 md:left-12">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-12 w-44 rounded-full" />
      </div>
    </div>
  );
}
