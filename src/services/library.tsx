import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { tmdb } from '../api/tmdb';
import { storage } from '../db';
import { libraryRepository, type LibraryList } from '../repositories/libraryRepository';
import { toMediaItem } from '../repositories/mediaRepository';
import { seriesRepository } from '../repositories/seriesRepository';
import type { MediaItem } from '../types/db';
import type { MediaDetail, MediaKey, MediaType } from '../types/media';
import { subscribe } from './events';

/**
 * Kartlarda "listede / izlendi / favori" rozetlerini göstermek için tüm kütüphane anahtarlarının
 * hafif bir dizinini bellekte tutar. Veri değişince otomatik yenilenir.
 */
interface LibraryIndex {
  watched: Set<string>;
  watchlist: Set<string>;
  favorites: Set<string>;
}

const empty: LibraryIndex = { watched: new Set(), watchlist: new Set(), favorites: new Set() };
const LibraryContext = createContext<LibraryIndex>(empty);

async function loadIndex(): Promise<LibraryIndex> {
  const [w, l, f] = await Promise.all([
    storage().getAll<{ key: string }>('watched'),
    storage().getAll<{ key: string }>('watchlist'),
    storage().getAll<{ key: string }>('favorites'),
  ]);
  return { watched: new Set(w.map((x) => x.key)), watchlist: new Set(l.map((x) => x.key)), favorites: new Set(f.map((x) => x.key)) };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<LibraryIndex>(empty);
  useEffect(() => {
    let alive = true;
    const refresh = () => loadIndex().then((i) => alive && setIndex(i)).catch(() => undefined);
    refresh();
    const off = subscribe((t) => (t === 'library' || t === 'series') && refresh());
    return () => {
      alive = false;
      off();
    };
  }, []);
  return <LibraryContext.Provider value={index}>{children}</LibraryContext.Provider>;
}

export const useLibraryIndex = () => useContext(LibraryContext);

/* ---------------- Kütüphane eylemleri ---------------- */

/** Kütüphaneye eklenen her içeriğin ayrıntısı TMDB'den alınır; böylece istatistikler doğru olur. */
export async function mediaItemFor(type: MediaType, id: number): Promise<MediaItem> {
  return toMediaItem(await tmdb.details(type, id));
}

export async function toggleList(list: LibraryList, key: MediaKey, type: MediaType, id: number, active: boolean): Promise<string> {
  if (active) {
    if (list === 'watched' && type === 'tv') {
      await seriesRepository.setManuallyCompleted(id, false);
      const p = await seriesRepository.progress(id);
      if (p?.status === 'completed') return 'Tüm bölümler izlendiği için dizi tamamlanmış görünmeye devam eder';
      return 'Dizi “tamamlandı” işareti kaldırıldı';
    }
    await libraryRepository.remove(list, key);
    return list === 'watchlist' ? 'İzleme listesinden çıkarıldı' : list === 'favorites' ? 'Favorilerden çıkarıldı' : 'İzlenenlerden çıkarıldı';
  }
  if (list === 'watched' && type === 'tv') {
    await seriesRepository.ensure(await tmdb.details('tv', id));
    await seriesRepository.setManuallyCompleted(id, true);
    return 'Dizi tamamlandı olarak işaretlendi';
  }
  const item = await mediaItemFor(type, id);
  if (list === 'watchlist') {
    const r = await libraryRepository.addToWatchlist(item);
    return r === 'exists' ? 'Zaten izleme listenizde' : 'İzleme listesine eklendi';
  }
  if (list === 'favorites') {
    const r = await libraryRepository.addFavorite(item);
    return r === 'exists' ? 'Zaten favorilerinizde' : 'Favorilere eklendi';
  }
  await libraryRepository.addWatched(item);
  return 'İzlendi olarak işaretlendi';
}

export async function ensureSeries(detail: MediaDetail) {
  return seriesRepository.ensure(detail);
}
