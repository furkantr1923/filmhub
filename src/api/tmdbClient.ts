import { ApiError } from './errors';

/**
 * TMDB HTTP istemcisi.
 *  • İstek önbelleği (bellek + isteğe bağlı kalıcı önbellek, süreli)
 *  • Eşzamanlı aynı istekleri tekilleştirme (request deduplication)
 *  • Eşzamanlı istek sınırı ve 429 (rate limit) durumunda geri çekilerek yeniden deneme
 *  • Zaman aşımı, çevrimdışı tespiti ve Türkçe hata mesajları
 *
 * Anahtar iki biçimde kabul edilir: v4 "API Read Access Token" (Bearer) veya v3 API anahtarı.
 */
export const TMDB_BASE = 'https://api.themoviedb.org/3';

export interface PersistentCache {
  get(url: string): Promise<unknown | undefined>;
  set(url: string, data: unknown, ttlMs: number): Promise<void>;
}

export interface TmdbClientOptions {
  getKey: () => string | null;
  fetchImpl?: typeof fetch;
  persistentCache?: PersistentCache;
  maxConcurrent?: number;
  timeoutMs?: number;
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
  isOnline?: () => boolean;
}

export type Params = Record<string, string | number | boolean | null | undefined>;

const MEMORY_LIMIT = 400;

export function isBearerToken(key: string) {
  return key.startsWith('eyJ') && key.length > 60;
}

export function buildUrl(path: string, params: Params = {}): string {
  const usp = new URLSearchParams();
  for (const k of Object.keys(params).sort()) {
    const v = params[k];
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  }
  const qs = usp.toString();
  return `${TMDB_BASE}${path}${qs ? `?${qs}` : ''}`;
}

export class TmdbClient {
  private memory = new Map<string, { data: unknown; expiresAt: number }>();
  private inflight = new Map<string, Promise<unknown>>();
  private active = 0;
  private queue: (() => void)[] = [];
  private readonly o: Required<Omit<TmdbClientOptions, 'persistentCache'>> & { persistentCache?: PersistentCache };

  constructor(options: TmdbClientOptions) {
    this.o = {
      fetchImpl: (...a) => fetch(...a),
      maxConcurrent: 6,
      timeoutMs: 15000,
      retries: 2,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
      ...options,
    };
  }

  /** İstatistik/test amaçlı: ağdan gerçekten yapılan istek sayısı */
  networkRequests = 0;

  async get<T>(path: string, params: Params = {}, ttlMs = 10 * 60_000): Promise<T> {
    const url = buildUrl(path, params);
    const now = Date.now();
    const hit = this.memory.get(url);
    if (hit && hit.expiresAt > now) return hit.data as T;

    const pending = this.inflight.get(url);
    if (pending) return pending as Promise<T>;

    const task = (async () => {
      if (this.o.persistentCache) {
        try {
          const cached = await this.o.persistentCache.get(url);
          if (cached !== undefined) {
            this.remember(url, cached, ttlMs);
            return cached;
          }
        } catch { /* önbellek okunamazsa ağdan devam */ }
      }
      const data = await this.fetchWithRetry(url);
      this.remember(url, data, ttlMs);
      this.o.persistentCache?.set(url, data, ttlMs).catch(() => undefined);
      return data;
    })().finally(() => this.inflight.delete(url));

    this.inflight.set(url, task);
    return task as Promise<T>;
  }

  clearMemory() {
    this.memory.clear();
  }

  private remember(url: string, data: unknown, ttlMs: number) {
    if (this.memory.size >= MEMORY_LIMIT) {
      const oldest = this.memory.keys().next().value;
      if (oldest !== undefined) this.memory.delete(oldest);
    }
    this.memory.set(url, { data, expiresAt: Date.now() + ttlMs });
  }

  private async slot<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.o.maxConcurrent) await new Promise<void>((r) => this.queue.push(r));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }

  private async fetchWithRetry(url: string): Promise<unknown> {
    let attempt = 0;
    for (;;) {
      try {
        return await this.slot(() => this.fetchOnce(url));
      } catch (e) {
        const err = e as ApiError;
        if (!(err instanceof ApiError) || !err.retryable || err.kind === 'offline' || attempt >= this.o.retries) throw e;
        const wait = err.kind === 'rate-limited'
          ? Math.max(1000, (err as ApiError & { retryAfter?: number }).retryAfter ?? 0) * (attempt + 1)
          : 400 * 2 ** attempt;
        attempt++;
        await this.o.sleep(wait);
      }
    }
  }

  private async fetchOnce(url: string): Promise<unknown> {
    const key = this.o.getKey()?.trim();
    if (!key) throw new ApiError('missing-key');
    if (!this.o.isOnline()) throw new ApiError('offline');

    const headers: Record<string, string> = { Accept: 'application/json' };
    let finalUrl = url;
    if (isBearerToken(key)) headers.Authorization = `Bearer ${key}`;
    else finalUrl += `${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(key)}`;

    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl?.abort(), this.o.timeoutMs);
    let res: Response;
    try {
      this.networkRequests++;
      res = await this.o.fetchImpl(finalUrl, { headers, signal: ctrl?.signal });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw new ApiError('timeout');
      throw new ApiError(this.o.isOnline() ? 'network' : 'offline');
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      try {
        return await res.json();
      } catch {
        throw new ApiError('server', res.status, 'Geçersiz yanıt');
      }
    }
    if (res.status === 401) throw new ApiError('invalid-key', 401);
    if (res.status === 404) throw new ApiError('not-found', 404);
    if (res.status === 429) {
      const err = new ApiError('rate-limited', 429) as ApiError & { retryAfter?: number };
      const ra = Number(res.headers.get('Retry-After'));
      if (Number.isFinite(ra) && ra > 0) err.retryAfter = ra * 1000;
      throw err;
    }
    if (res.status >= 500) throw new ApiError('server', res.status);
    throw new ApiError('unknown', res.status);
  }
}
