import type { StoreName } from './schema';

/**
 * Platformdan bağımsız depolama arayüzü.
 * Repository katmanı yalnızca bu arayüzü bilir; altta IndexedDB (Web / Electron / Android WebView)
 * ya da testlerde bellek içi uygulama çalışır. İleride SQLite adaptörü eklemek için
 * yalnızca bu arayüzü uygulamak yeterlidir.
 */
export interface StorageAdapter {
  readonly name: string;
  get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined>;
  getAll<T>(store: StoreName): Promise<T[]>;
  getAllByIndex<T>(store: StoreName, index: string, value: IDBValidKey): Promise<T[]>;
  put<T>(store: StoreName, value: T): Promise<void>;
  putMany<T>(store: StoreName, values: T[]): Promise<void>;
  delete(store: StoreName, key: IDBValidKey): Promise<void>;
  deleteMany(store: StoreName, keys: IDBValidKey[]): Promise<void>;
  count(store: StoreName): Promise<number>;
  clear(store: StoreName): Promise<void>;
  close(): void;
}

export class StorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'StorageError';
  }
}
