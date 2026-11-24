import type { StorageAdapter } from './adapter';
import { openIndexedDb } from './indexedDbAdapter';

/**
 * Uygulama genelinde tek bir depolama örneği kullanılır.
 * Web, Windows (Electron/Chromium) ve Android (WebView) aynı IndexedDB adaptörünü kullanır;
 * her platformda veri yalnızca o cihazda kalır ve cihazlar arasında senkronize edilmez.
 */
let instance: StorageAdapter | null = null;
let opening: Promise<StorageAdapter> | null = null;

export async function initStorage(): Promise<StorageAdapter> {
  if (instance) return instance;
  opening ??= openIndexedDb().then((db) => (instance = db)).finally(() => { opening = null; });
  return opening;
}

export function storage(): StorageAdapter {
  if (!instance) throw new Error('Depolama henüz başlatılmadı');
  return instance;
}

/** Testler için depolamayı değiştir. */
export function setStorage(adapter: StorageAdapter | null) {
  instance = adapter;
}

export type { StorageAdapter } from './adapter';
