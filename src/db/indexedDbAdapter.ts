import { StorageError, type StorageAdapter } from './adapter';
import { DB_NAME, DB_VERSION, MIGRATIONS, type StoreName } from './schema';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new StorageError('Veritabanı işlemi başarısız', r.error));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(new StorageError('İşlem iptal edildi', tx.error));
    tx.onerror = () => reject(new StorageError('İşlem başarısız', tx.error));
  });
}

/** Sürüm yükseltmelerinde yalnızca eksik migration adımlarını uygular. */
function upgrade(db: IDBDatabase, tx: IDBTransaction, oldVersion: number) {
  for (const m of MIGRATIONS) {
    if (m.version <= oldVersion) continue;
    for (const s of m.stores) {
      const store = db.objectStoreNames.contains(s.name)
        ? tx.objectStore(s.name)
        : db.createObjectStore(s.name, { keyPath: s.keyPath });
      for (const i of s.indexes) {
        if (!store.indexNames.contains(i.name)) store.createIndex(i.name, i.keyPath, { unique: !!i.unique });
      }
    }
    for (const a of m.addIndexes ?? []) {
      const store = tx.objectStore(a.store);
      if (!store.indexNames.contains(a.index.name)) {
        store.createIndex(a.index.name, a.index.keyPath, { unique: !!a.index.unique });
      }
    }
  }
}

export async function openIndexedDb(name = DB_NAME): Promise<StorageAdapter> {
  if (typeof indexedDB === 'undefined') throw new StorageError('Bu cihazda yerel veritabanı (IndexedDB) desteklenmiyor');
  const open = indexedDB.open(name, DB_VERSION);
  open.onupgradeneeded = (e) => upgrade(open.result, open.transaction!, e.oldVersion);
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(new StorageError('Veritabanı açılamadı', open.error));
    open.onblocked = () => reject(new StorageError('Veritabanı başka bir pencere tarafından kullanılıyor'));
  });
  // Kalıcı depolama izni iste (tarayıcı veriyi kendiliğinden silmesin)
  try { await navigator.storage?.persist?.(); } catch { /* desteklenmiyorsa sorun değil */ }

  db.onversionchange = () => db.close();

  const store = (s: StoreName, mode: IDBTransactionMode) => db.transaction(s, mode).objectStore(s);

  return {
    name: 'indexeddb',
    get: <T>(s: StoreName, key: IDBValidKey) => req(store(s, 'readonly').get(key)) as Promise<T | undefined>,
    getAll: <T>(s: StoreName) => req(store(s, 'readonly').getAll()) as Promise<T[]>,
    getAllByIndex: <T>(s: StoreName, index: string, value: IDBValidKey) =>
      req(store(s, 'readonly').index(index).getAll(value)) as Promise<T[]>,
    async put<T>(s: StoreName, value: T) {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).put(value);
      await done(tx);
    },
    async putMany<T>(s: StoreName, values: T[]) {
      if (!values.length) return;
      const tx = db.transaction(s, 'readwrite');
      const os = tx.objectStore(s);
      for (const v of values) os.put(v);
      await done(tx);
    },
    async delete(s: StoreName, key: IDBValidKey) {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).delete(key);
      await done(tx);
    },
    async deleteMany(s: StoreName, keys: IDBValidKey[]) {
      if (!keys.length) return;
      const tx = db.transaction(s, 'readwrite');
      const os = tx.objectStore(s);
      for (const k of keys) os.delete(k);
      await done(tx);
    },
    count: (s: StoreName) => req(store(s, 'readonly').count()),
    async clear(s: StoreName) {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).clear();
      await done(tx);
    },
    close: () => db.close(),
  };
}
