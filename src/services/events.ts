/**
 * Basit yayın/abone (pub/sub) veri olay yolu.
 * Bir repository veriyi değiştirdiğinde ilgili konuyu yayınlar; ekranlar bu konuya abone olup
 * kendini yeniler. Böylece global durum kütüphanesine gerek kalmaz.
 */
export type DataTopic = 'library' | 'ratings' | 'series' | 'collections' | 'history' | 'prefs';

type Listener = (topic: DataTopic) => void;
const listeners = new Set<Listener>();

export function emit(...topics: DataTopic[]) {
  for (const t of topics) for (const l of [...listeners]) l(t);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
