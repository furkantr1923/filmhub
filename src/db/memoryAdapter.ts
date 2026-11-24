import type { StorageAdapter } from './adapter';
import { finalSchema, type StoreName } from './schema';

/**
 * Bellek içi depolama: birim testlerinde IndexedDB ile aynı davranışı (birincil anahtar,
 * indeks sorguları, yapılandırılmış kopyalama) taklit eder.
 */
export function createMemoryAdapter(): StorageAdapter {
  const schema = new Map(finalSchema().map((s) => [s.name, s]));
  const data = new Map<StoreName, Map<string, unknown>>();
  const table = (s: StoreName) => {
    if (!schema.has(s)) throw new Error(`Bilinmeyen depo: ${s}`);
    if (!data.has(s)) data.set(s, new Map());
    return data.get(s)!;
  };
  const keyOf = (s: StoreName, value: unknown) => {
    const kp = schema.get(s)!.keyPath;
    const k = (value as Record<string, unknown>)[kp];
    if (k === undefined || k === null) throw new Error(`Birincil anahtar eksik: ${s}.${kp}`);
    return JSON.stringify(k);
  };
  const clone = <T>(v: T): T => structuredClone(v);

  return {
    name: 'memory',
    async get<T>(s: StoreName, key: IDBValidKey) {
      const v = table(s).get(JSON.stringify(key));
      return v === undefined ? undefined : clone(v as T);
    },
    async getAll<T>(s: StoreName) {
      return [...table(s).values()].map((v) => clone(v as T));
    },
    async getAllByIndex<T>(s: StoreName, index: string, value: IDBValidKey) {
      const def = schema.get(s)!.indexes.find((i) => i.name === index);
      if (!def) throw new Error(`Bilinmeyen indeks: ${s}.${index}`);
      return [...table(s).values()]
        .filter((v) => (v as Record<string, unknown>)[def.keyPath] === value)
        .map((v) => clone(v as T));
    },
    async put<T>(s: StoreName, value: T) {
      table(s).set(keyOf(s, value), clone(value));
    },
    async putMany<T>(s: StoreName, values: T[]) {
      for (const v of values) table(s).set(keyOf(s, v), clone(v));
    },
    async delete(s: StoreName, key: IDBValidKey) {
      table(s).delete(JSON.stringify(key));
    },
    async deleteMany(s: StoreName, keys: IDBValidKey[]) {
      for (const k of keys) table(s).delete(JSON.stringify(k));
    },
    async count(s: StoreName) {
      return table(s).size;
    },
    async clear(s: StoreName) {
      table(s).clear();
    },
    close() {},
  };
}
