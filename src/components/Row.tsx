import { useEffect, useRef, type ReactNode } from 'react';
import { useInView, useQuery } from '../hooks/hooks';
import { Link } from '../router/router';
import { Icon } from './Icon';
import { BackdropCard, PosterCard, PosterSkeleton, type CardMedia } from './MediaCard';
import { ErrorState, Skeleton } from './ui';

/** Yatay kaydırılan koleksiyon şeridi; ok düğmeleri masaüstünde görünür. */
export function Scroller({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };
  return (
    <div className={`group/row relative ${className}`}>
      <div ref={ref} className="no-scrollbar row-scroller flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-smooth pb-2 md:gap-5">
        {children}
      </div>
      <button type="button" aria-label="Geri kaydır" onClick={() => scroll(-1)}
        className="row-arrow absolute -left-3 top-[38%] z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white opacity-0 ring-1 ring-white/15 backdrop-blur-xl transition-opacity hover:bg-black/90 group-hover/row:opacity-100 md:flex">
        <Icon name="chevronLeft" size={20} />
      </button>
      <button type="button" aria-label="İleri kaydır" onClick={() => scroll(1)}
        className="row-arrow absolute -right-3 top-[38%] z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white opacity-0 ring-1 ring-white/15 backdrop-blur-xl transition-opacity hover:bg-black/90 group-hover/row:opacity-100 md:flex">
        <Icon name="chevronRight" size={20} />
      </button>
    </div>
  );
}

export function RowHeader({ title, to, subtitle }: { title: string; to?: string; subtitle?: string }) {
  const inner = (
    <>
      <span>{title}</span>
      {to && <Icon name="chevronRight" size={18} className="text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />}
    </>
  );
  return (
    <div className="mb-3.5 flex items-end justify-between gap-4 md:mb-4">
      <div>
        {to ? (
          <Link to={to} className="group inline-flex items-center gap-1 text-[19px] font-semibold tracking-tight text-white md:text-[21px]">{inner}</Link>
        ) : (
          <h2 className="text-[19px] font-semibold tracking-tight text-white md:text-[21px]">{title}</h2>
        )}
        {subtitle && <p className="mt-0.5 text-[13px] text-white/45">{subtitle}</p>}
      </div>
    </div>
  );
}

/**
 * Ana sayfa şeridi: ekrana yaklaştığında veriyi yükler (tembel yükleme),
 * hata olursa sayfanın geri kalanını bozmadan yeniden deneme sunar.
 */
export function MediaRow({ title, subtitle, to, load, variant = 'poster', label }: {
  title: string;
  subtitle?: string;
  to?: string;
  load: () => Promise<CardMedia[]>;
  variant?: 'poster' | 'backdrop';
  label?: string;
}) {
  const [ref, inView] = useInView<HTMLElement>('600px');
  const q = useQuery(load, [title], { enabled: inView });
  const items = q.data ?? [];
  const itemClass = variant === 'poster' ? 'row-item-poster' : 'row-item-backdrop';

  return (
    <section ref={ref} className="min-h-[200px]" aria-label={title}>
      <RowHeader title={title} to={to} subtitle={subtitle} />
      {q.error ? (
        <ErrorState error={q.error} onRetry={q.reload} compact />
      ) : !inView || q.loading ? (
        <Scroller>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`${itemClass} snap-start`}>
              {variant === 'poster' ? <PosterSkeleton /> : <Skeleton className="aspect-video" />}
            </div>
          ))}
        </Scroller>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white/[0.03] px-4 py-6 text-sm text-white/40">Bu bölümde şu an gösterilecek içerik yok.</p>
      ) : (
        <Scroller>
          {items.map((m) => (
            <div key={m.key} className={`${itemClass} snap-start`}>
              {variant === 'poster' ? <PosterCard item={m} /> : <BackdropCard item={m} label={label} />}
            </div>
          ))}
        </Scroller>
      )}
    </section>
  );
}

/** Duyarlı poster ızgarası. */
export function PosterGrid({ items, renderSubtitle }: { items: CardMedia[]; renderSubtitle?: (m: CardMedia) => string | undefined }) {
  return (
    <div className="poster-grid grid gap-x-3.5 gap-y-7 md:gap-x-5">
      {items.map((m) => <PosterCard key={m.key} item={m} subtitle={renderSubtitle?.(m)} />)}
    </div>
  );
}

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="poster-grid grid gap-x-3.5 gap-y-7 md:gap-x-5">
      {Array.from({ length: count }, (_, i) => <PosterSkeleton key={i} />)}
    </div>
  );
}

/** Izgara sonuna yerleşen, görünür olunca sonraki sayfayı yükleyen gözcü (sonsuz kaydırma). */
export function LoadMore({ onLoad, loading, hasMore, error, onRetry }: {
  onLoad: () => void;
  loading: boolean;
  hasMore: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onLoad);
  cb.current = onLoad;
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || loading || error || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && cb.current(), { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, error]);
  if (!hasMore && !loading) return null;
  return (
    <div ref={ref} className="flex justify-center py-10">
      {error ? (
        <ErrorState error={error} onRetry={onRetry} compact />
      ) : (
        <button type="button" onClick={onLoad} disabled={loading} className="flex h-10 items-center gap-2 rounded-full bg-white/[0.07] px-5 text-sm font-medium text-white/70 hover:bg-white/[0.12]">
          {loading ? <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <Icon name="chevronDown" size={16} />}
          {loading ? 'Yükleniyor…' : 'Daha fazla göster'}
        </button>
      )}
    </div>
  );
}
