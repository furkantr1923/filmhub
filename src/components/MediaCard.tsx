import { memo, useState, type ReactNode } from 'react';
import { Link } from '../router/router';
import { useLibraryIndex } from '../services/library';
import type { ContentKind, MediaType } from '../types/media';
import { fmt, KIND_LABEL } from '../utils/format';
import { img, posterSrcSet } from '../utils/images';
import { Icon } from './Icon';

export interface CardMedia {
  key: string;
  tmdbId: number;
  type: MediaType;
  kind: ContentKind;
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  year: number | null;
  voteAverage: number;
}

export const mediaPath = (type: MediaType, id: number) => `/${type === 'movie' ? 'film' : 'dizi'}/${id}`;

/** TMDB görseli: tembel yükleme, yumuşak belirme ve görsel yoksa zarif yedek görünüm. */
export function TmdbImage({ src, srcSet, sizes, alt, className = '', fallback, eager }: {
  src: string | null;
  srcSet?: string;
  sizes?: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  eager?: boolean;
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  if (!src || state === 'error') {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-white/[0.07] to-white/[0.02] text-white/25 ${className}`} aria-label={alt}>
        {fallback ?? <Icon name="film" size={28} />}
      </div>
    );
  }
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => setState('ok')}
      onError={() => setState('error')}
      className={`transition-opacity duration-500 ${state === 'ok' ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}

function PosterFallback({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-3 text-center">
      <Icon name="film" size={26} className="text-white/25" />
      <span className="line-clamp-3 text-[12px] font-medium text-white/45">{title}</span>
    </div>
  );
}

export const PosterCard = memo(function PosterCard({ item, subtitle, badge, className = '' }: {
  item: CardMedia;
  subtitle?: string;
  badge?: ReactNode;
  className?: string;
}) {
  const lib = useLibraryIndex();
  const inWatched = lib.watched.has(item.key);
  const inList = lib.watchlist.has(item.key);
  const fav = lib.favorites.has(item.key);
  return (
    <Link to={mediaPath(item.type, item.tmdbId)} className={`group block w-full outline-none ${className}`} ariaLabel={`${item.title}${item.year ? ` (${item.year})` : ''}`}>
      <div className="poster relative aspect-[2/3] overflow-hidden rounded-[14px] bg-white/[0.04] shadow-lg ring-1 ring-white/[0.06] transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:ring-white/25 group-focus-visible:ring-2 group-focus-visible:ring-white">
        <TmdbImage
          src={img(item.posterPath, 'w342')}
          srcSet={posterSrcSet(item.posterPath)}
          sizes="(max-width: 640px) 34vw, 200px"
          alt={item.title}
          className="size-full object-cover"
          fallback={<PosterFallback title={item.title} />}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute left-2 top-2 flex gap-1">
          {item.kind !== 'movie' && (
            <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-md">
              {KIND_LABEL[item.kind]}
            </span>
          )}
          {badge}
        </div>
        {(inWatched || inList || fav) && (
          <div className="absolute right-2 top-2 flex gap-1">
            {fav && <span className="flex size-6 items-center justify-center rounded-full bg-black/60 text-rose-400 backdrop-blur-md" title="Favori"><Icon name="heart" size={13} filled /></span>}
            {inWatched ? (
              <span className="flex size-6 items-center justify-center rounded-full bg-white text-black" title="İzlendi"><Icon name="check" size={14} strokeWidth={2.5} /></span>
            ) : inList && (
              <span className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md" title="İzleme listesinde"><Icon name="bookmark" size={12} filled /></span>
            )}
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <p className="truncate text-[13.5px] font-medium text-white/90 group-hover:text-white">{item.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-white/45">
          {subtitle ?? (
            <>
              {item.year && <span>{item.year}</span>}
              {item.voteAverage > 0 && (
                <>
                  {item.year && <span className="text-white/20">•</span>}
                  <span className="inline-flex items-center gap-0.5 text-white/60">
                    <Icon name="star" size={11} filled className="text-[var(--color-gold)]" />
                    {fmt.rating(item.voteAverage)}
                  </span>
                </>
              )}
            </>
          )}
        </p>
      </div>
    </Link>
  );
});

export function BackdropCard({ item, label }: { item: CardMedia; label?: string }) {
  return (
    <Link to={mediaPath(item.type, item.tmdbId)} className="group block w-full outline-none">
      <div className="relative aspect-video overflow-hidden rounded-[14px] bg-white/[0.04] ring-1 ring-white/[0.06] transition-all duration-300 group-hover:ring-white/25 group-hover:shadow-2xl">
        <TmdbImage src={img(item.backdropPath, 'w780')} alt={item.title} className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          {label && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{label}</p>}
          <p className="truncate text-[15px] font-semibold text-white">{item.title}</p>
          <p className="text-[12px] text-white/55">{[item.year, KIND_LABEL[item.kind], item.voteAverage > 0 ? `★ ${fmt.rating(item.voteAverage)}` : null].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
    </Link>
  );
}

export function PersonAvatar({ id, name, role, profilePath, size = 'md' }: { id: number; name: string; role?: string; profilePath: string | null; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'size-28 md:size-32' : 'size-20 md:size-24';
  return (
    <Link to={`/kisi/${id}`} className="group flex w-24 shrink-0 flex-col items-center text-center md:w-28" ariaLabel={`${name}${role ? `, ${role}` : ''}`}>
      <div className={`${dim} overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] transition-all duration-300 group-hover:ring-2 group-hover:ring-white/40`}>
        <TmdbImage src={img(profilePath, 'w185')} alt={name} className="size-full object-cover" fallback={<Icon name="user" size={28} />} />
      </div>
      <p className="mt-2.5 line-clamp-2 text-[13px] font-medium leading-tight text-white/90">{name}</p>
      {role && <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-tight text-white/45">{role}</p>}
    </Link>
  );
}

export function PosterSkeleton() {
  return (
    <div className="w-full">
      <div className="skeleton aspect-[2/3] rounded-[14px]" />
      <div className="skeleton mt-2.5 h-3.5 w-4/5 rounded" />
      <div className="skeleton mt-1.5 h-3 w-2/5 rounded" />
    </div>
  );
}
