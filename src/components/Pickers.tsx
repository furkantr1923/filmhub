import { useState } from 'react';
import { tmdb } from '../api/tmdb';
import { useDebounced, useLiveQuery, useQuery } from '../hooks/hooks';
import { collectionRepository } from '../repositories/collectionRepository';
import type { MediaItem } from '../types/db';
import type { MediaSummary } from '../types/media';
import { KIND_LABEL } from '../utils/format';
import { img } from '../utils/images';
import { Icon } from './Icon';
import { TmdbImage } from './MediaCard';
import { Button, EmptyState, ErrorState, Modal, Spinner, TextField, useFeedback } from './ui';

/** Arama yaparak bir film / dizi seçtiren modal (karşılaştırma ve koleksiyonlarda kullanılır). */
export function MediaPicker({ open, onClose, onPick, title = 'İçerik seç' }: {
  open: boolean;
  onClose: () => void;
  onPick: (m: MediaSummary) => void;
  title?: string;
}) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim(), 300);
  const res = useQuery(() => tmdb.searchMulti(dq), [dq], { enabled: open && dq.length >= 2 });
  const items = res.data?.media.results ?? [];
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="sticky top-0 z-10 bg-[#161618] px-5 pb-3 pt-4 md:px-6">
        <div className="relative">
          <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Film veya dizi adı yazın…"
            aria-label="Ara"
            className="h-12 w-full rounded-xl bg-white/[0.07] pl-11 pr-4 text-[15px] outline-none ring-1 ring-white/[0.06] focus:ring-white/30"
          />
        </div>
      </div>
      <div className="min-h-[300px] px-3 pb-4 md:px-4">
        {dq.length < 2 ? (
          <p className="px-3 py-10 text-center text-sm text-white/40">Aramak için en az 2 karakter yazın.</p>
        ) : res.loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : res.error ? (
          <ErrorState error={res.error} onRetry={res.reload} compact />
        ) : items.length === 0 ? (
          <EmptyState icon="search" title="Sonuç bulunamadı" text="Farklı bir yazım deneyin." />
        ) : (
          <ul>
            {items.map((m) => (
              <li key={m.key}>
                <button type="button" onClick={() => { onPick(m); onClose(); }} className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]">
                  <div className="h-[66px] w-11 shrink-0 overflow-hidden rounded-md bg-white/[0.05]">
                    <TmdbImage src={img(m.posterPath, 'w154')} alt="" className="size-full object-cover" fallback={<Icon name="film" size={16} />} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium">{m.title}</p>
                    <p className="text-[12.5px] text-white/45">{[KIND_LABEL[m.kind], m.year].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Icon name="plus" size={18} className="text-white/40" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** İçeriği bir veya birden fazla kişisel koleksiyona ekleme / çıkarma. */
export function CollectionPicker({ open, onClose, item }: { open: boolean; onClose: () => void; item: MediaItem | null }) {
  const { toast } = useFeedback();
  const [name, setName] = useState('');
  const data = useLiveQuery(async () => {
    if (!item) return { list: [], containing: new Set<string>() };
    const [list, containing] = await Promise.all([collectionRepository.list(), collectionRepository.collectionsContaining(item.key)]);
    return { list, containing: new Set(containing) };
  }, ['collections'], [item?.key, open]);

  const toggle = async (id: string, has: boolean) => {
    if (!item) return;
    try {
      if (has) {
        await collectionRepository.removeItem(id, item.key);
        toast('Koleksiyondan çıkarıldı');
      } else {
        await collectionRepository.addItem(id, item);
        toast('Koleksiyona eklendi');
      }
    } catch (e) {
      toast((e as Error).message, { tone: 'error' });
    }
  };

  const create = async () => {
    if (!item || !name.trim()) return;
    try {
      const c = await collectionRepository.create(name);
      await collectionRepository.addItem(c.id, item);
      setName('');
      toast(`“${c.name}” oluşturuldu`);
    } catch (e) {
      toast((e as Error).message, { tone: 'error' });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Koleksiyona ekle" size="sm">
      <div className="space-y-4 p-5 md:p-6">
        <div className="flex items-end gap-2">
          <TextField label="Yeni koleksiyon" value={name} onChange={setName} placeholder="Örn. Hafta sonu filmleri" maxLength={60} onEnter={create} className="flex-1" />
          <Button variant="primary" icon="plus" onClick={create} disabled={!name.trim()} className="h-11">Oluştur</Button>
        </div>
        {data.data?.list.length ? (
          <ul className="space-y-1">
            {data.data.list.map((c) => {
              const has = data.data!.containing.has(c.id);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => toggle(c.id, has)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.06]">
                    <span className={`flex size-6 items-center justify-center rounded-full ${has ? 'bg-white text-black' : 'ring-1 ring-white/30'}`}>
                      {has && <Icon name="check" size={14} strokeWidth={2.5} />}
                    </span>
                    <span className="flex-1 truncate text-[15px]">{c.name}</span>
                    <span className="text-[12px] tabular-nums text-white/40">{c.count} içerik</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-white/40">Henüz koleksiyonunuz yok. Yukarıdan ilkini oluşturun.</p>
        )}
      </div>
    </Modal>
  );
}
