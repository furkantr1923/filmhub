import { useEffect, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';

/**
 * Hafif hash tabanlı yönlendirici.
 * Hash yönlendirme; Electron (yerel dosya), Android WebView ve statik web barındırmada
 * sunucu yapılandırması gerektirmeden aynı şekilde çalışır. Tarayıcı geçmişi korunduğu için
 * Android geri tuşu da doğal olarak bir önceki ekrana döner.
 */
export interface Location {
  path: string;
  query: URLSearchParams;
}

function read(): Location {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(qs ?? '') };
}

let current = read();
const listeners = new Set<() => void>();
const notify = () => {
  current = read();
  listeners.forEach((l) => l());
};
window.addEventListener('hashchange', notify);

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLocation(): Location {
  return useSyncExternalStore(subscribe, () => current);
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const hash = `#${to.startsWith('/') ? to : `/${to}`}`;
  if (opts.replace) {
    window.history.replaceState(window.history.state, '', hash);
    notify();
  } else if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function back(fallback = '/') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}

/** Sorgu parametrelerini günceller (geçmişi kirletmemek için replace). */
export function setQuery(patch: Record<string, string | number | null | undefined>) {
  const { path, query } = read();
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') query.delete(k);
    else query.set(k, String(v));
  }
  const qs = query.toString();
  navigate(`${path}${qs ? `?${qs}` : ''}`, { replace: true });
}

export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i]!.startsWith(':')) params[p[i]!.slice(1)] = decodeURIComponent(s[i]!);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, className, children, title, onClick, ariaLabel }: {
  to: string;
  className?: string;
  children: ReactNode;
  title?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onClick?.();
    navigate(to);
  };
  return (
    <a href={`#${to}`} className={className} onClick={handle} title={title} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

/** Her sayfa değişiminde sayfanın en üstüne kaydırır. */
export function useScrollReset(path: string) {
  const [prev, setPrev] = useState(path);
  useEffect(() => {
    if (prev !== path) {
      document.getElementById('main-scroll')?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
      setPrev(path);
    }
  }, [path, prev]);
}
