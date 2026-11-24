import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { subscribe, type DataTopic } from '../services/events';

export interface QueryState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * Asenkron veri yükleme kancası. Bileşen kaldırıldıktan sonra gelen yanıtlar yok sayılır;
 * bağımlılıklar değişince eski istek sonucu yeni durumu ezemez (yarış koşulu önlenir).
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[], opts: { enabled?: boolean } = {}): QueryState<T> {
  const enabled = opts.enabled ?? true;
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>({
    data: undefined,
    error: undefined,
    loading: enabled,
  });
  const [nonce, setNonce] = useState(0);
  const run = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const id = ++run.current;
    setState((s) => ({ data: s.data, error: undefined, loading: true }));
    fetcher().then(
      (data) => id === run.current && setState({ data, error: undefined, loading: false }),
      (error) => id === run.current && setState({ data: undefined, error, loading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

/** Yerel veritabanı sorgusu: ilgili veri değiştiğinde kendini otomatik yeniler. */
export function useLiveQuery<T>(fetcher: () => Promise<T>, topics: DataTopic[], deps: unknown[] = []): QueryState<T> {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribe((t) => {
    if (topics.includes(t)) setVersion((v) => v + 1);
  }), [topics.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = useQuery(fetcher, [...deps, version]);
  // Yeniden yüklemede eski veriyi göstermeye devam et (titreme olmasın)
  const last = useRef<T | undefined>(undefined);
  if (q.data !== undefined) last.current = q.data;
  return { ...q, data: q.data ?? (q.loading ? last.current : undefined) };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useMediaQuery(query: string): boolean {
  const get = () => typeof matchMedia !== 'undefined' && matchMedia(query).matches;
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Eleman ekrana yaklaşınca true olur (tembel yükleme için). */
export function useInView<T extends Element>(rootMargin = '400px'): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true);
        io.disconnect();
      }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);
  return [ref, inView];
}

export interface PagedState<T> {
  items: T[];
  loading: boolean;
  error: unknown;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
  retry: () => void;
}

/** Sayfalı API listeleri için "daha fazla yükle" kancası; tekrar eden kayıtları ayıklar. */
export function usePaged<T extends { key?: string; id?: number }>(
  fetchPage: (page: number) => Promise<{ results: T[]; totalPages: number; totalResults: number }>,
  deps: unknown[],
  opts: { enabled?: boolean; maxPages?: number } = {},
): PagedState<T> {
  const enabled = opts.enabled ?? true;
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const gen = useRef(0);
  const busy = useRef(false);

  const load = useCallback(async (p: number, g: number) => {
    busy.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const r = await fetchPage(p);
      if (g !== gen.current) return;
      setItems((prev) => {
        const base = p === 1 ? [] : prev;
        const seen = new Set(base.map((i) => String(i.key ?? i.id)));
        return [...base, ...r.results.filter((i) => !seen.has(String(i.key ?? i.id)))];
      });
      setPage(p);
      setTotalPages(Math.min(r.totalPages, opts.maxPages ?? 500));
      setTotal(r.totalResults);
    } catch (e) {
      if (g === gen.current) setError(e);
    } finally {
      if (g === gen.current) {
        setLoading(false);
        busy.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const g = ++gen.current;
    setItems([]);
    setPage(0);
    setTotal(0);
    if (enabled) load(1, g);
    else setLoading(false);
  }, [load, enabled]);

  return {
    items,
    loading,
    error,
    total,
    hasMore: page < totalPages,
    loadMore: () => {
      if (!busy.current && page < totalPages && !error) load(page + 1, gen.current);
    },
    retry: () => load(page + 1 || 1, gen.current),
  };
}
