import { storage } from '../db';
import { emit } from '../services/events';
import type { CollectionItem, CustomCollection, MediaItem } from '../types/db';
import type { MediaKey } from '../types/media';
import { createId } from '../utils/text';
import { mediaRepository } from './mediaRepository';

export const MAX_COLLECTION_NAME = 60;
export const MAX_COLLECTION_DESCRIPTION = 500;

function validateName(name: string): string {
  const clean = name.trim();
  if (!clean) throw new Error('Koleksiyon adı boş olamaz');
  if (clean.length > MAX_COLLECTION_NAME) throw new RangeError(`Koleksiyon adı en fazla ${MAX_COLLECTION_NAME} karakter olabilir`);
  return clean;
}

const itemId = (collectionId: string, key: MediaKey) => `${collectionId}|${key}`;

export interface CollectionWithCount extends CustomCollection {
  count: number;
  previewPosters: (string | null)[];
}

export const collectionRepository = {
  async create(name: string, description = ''): Promise<CustomCollection> {
    const now = Date.now();
    const c: CustomCollection = {
      id: createId(),
      name: validateName(name),
      description: description.trim().slice(0, MAX_COLLECTION_DESCRIPTION),
      coverPath: null,
      createdAt: now,
      updatedAt: now,
    };
    await storage().put('collections', c);
    emit('collections');
    return c;
  },

  get: (id: string) => storage().get<CustomCollection>('collections', id),

  async update(id: string, patch: Partial<Pick<CustomCollection, 'name' | 'description' | 'coverPath'>>) {
    const c = await this.get(id);
    if (!c) throw new Error('Koleksiyon bulunamadı');
    const next: CustomCollection = {
      ...c,
      ...(patch.name !== undefined ? { name: validateName(patch.name) } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim().slice(0, MAX_COLLECTION_DESCRIPTION) } : {}),
      ...(patch.coverPath !== undefined ? { coverPath: patch.coverPath } : {}),
      updatedAt: Date.now(),
    };
    await storage().put('collections', next);
    emit('collections');
    return next;
  },

  /** Koleksiyonu ve ona bağlı tüm içerik bağlantılarını siler (içeriklerin kendisi silinmez). */
  async remove(id: string) {
    const items = await storage().getAllByIndex<CollectionItem>('collectionItems', 'byCollection', id);
    await storage().deleteMany('collectionItems', items.map((i) => i.id));
    await storage().delete('collections', id);
    emit('collections');
  },

  async list(): Promise<CollectionWithCount[]> {
    const [cols, items, media] = await Promise.all([
      storage().getAll<CustomCollection>('collections'),
      storage().getAll<CollectionItem>('collectionItems'),
      mediaRepository.getAll(),
    ]);
    const mediaMap = new Map(media.map((m) => [m.key, m]));
    return cols
      .map((c) => {
        const own = items.filter((i) => i.collectionId === c.id).sort((a, b) => b.addedAt - a.addedAt);
        return {
          ...c,
          count: own.length,
          previewPosters: own.slice(0, 3).map((i) => mediaMap.get(i.key)?.posterPath ?? null),
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async addItem(collectionId: string, item: MediaItem): Promise<'added' | 'exists'> {
    const c = await this.get(collectionId);
    if (!c) throw new Error('Koleksiyon bulunamadı');
    await mediaRepository.upsert(item);
    const id = itemId(collectionId, item.key);
    if (await storage().get('collectionItems', id)) return 'exists';
    await storage().put<CollectionItem>('collectionItems', { id, collectionId, key: item.key, addedAt: Date.now() });
    await storage().put('collections', { ...c, coverPath: c.coverPath ?? item.backdropPath, updatedAt: Date.now() });
    emit('collections');
    return 'added';
  },

  async removeItem(collectionId: string, key: MediaKey) {
    await storage().delete('collectionItems', itemId(collectionId, key));
    emit('collections');
  },

  async items(collectionId: string): Promise<(CollectionItem & { item: MediaItem | undefined })[]> {
    const rows = await storage().getAllByIndex<CollectionItem>('collectionItems', 'byCollection', collectionId);
    const media = await mediaRepository.getMany(rows.map((r) => r.key));
    return rows.map((r) => ({ ...r, item: media.get(r.key) }));
  },

  async collectionsContaining(key: MediaKey): Promise<string[]> {
    const rows = await storage().getAllByIndex<CollectionItem>('collectionItems', 'byKey', key);
    return rows.map((r) => r.collectionId);
  },
};
