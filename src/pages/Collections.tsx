import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { TmdbImage } from '../components/MediaCard';
import { Button, EmptyState, Modal, PageHeader, Select, TextArea, TextField, useFeedback } from '../components/ui';
import { useLiveQuery } from '../hooks/hooks';
import { collectionRepository, MAX_COLLECTION_DESCRIPTION, MAX_COLLECTION_NAME, type CollectionWithCount } from '../repositories/collectionRepository';
import { Link } from '../router/router';
import { img } from '../utils/images';

type Sort = 'updated' | 'name' | 'count' | 'created';

export function CollectionForm({ open, onClose, initial, onSubmit, title }: {
  open: boolean;
  onClose: () => void;
  initial?: { name: string; description: string };
  onSubmit: (name: string, description: string) => Promise<void>;
  title: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');
  const submit = async () => {
    try {
      await onSubmit(name, description);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<>
      <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
      <Button variant="primary" onClick={submit} disabled={!name.trim()}>Kaydet</Button>
    </>}>
      <div className="space-y-4 p-5 md:p-6">
        <TextField label="Koleksiyon adı" value={name} onChange={(v) => { setName(v); setError(''); }} autoFocus maxLength={MAX_COLLECTION_NAME} placeholder="Örn. Nolan maratonu" onEnter={submit} />
        <TextArea label="Açıklama (isteğe bağlı)" value={description} onChange={setDescription} rows={3} maxLength={MAX_COLLECTION_DESCRIPTION} />
        {error && <p className="text-[13px] text-red-300">{error}</p>}
      </div>
    </Modal>
  );
}

function CollectionCover({ c }: { c: CollectionWithCount }) {
  if (c.coverPath) return <TmdbImage src={img(c.coverPath, 'w780')} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />;
  const posters = c.previewPosters.filter(Boolean);
  if (!posters.length) return <div className="flex size-full items-center justify-center text-white/20"><Icon name="collection" size={40} /></div>;
  return (
    <div className="flex size-full items-center justify-center gap-2 bg-gradient-to-br from-white/[0.08] to-transparent p-4">
      {posters.map((p) => <TmdbImage key={p} src={img(p, 'w185')} alt="" className="h-[85%] rounded-md object-cover shadow-xl" />)}
    </div>
  );
}

export default function Collections() {
  const { toast } = useFeedback();
  const [creating, setCreating] = useState(false);
  const [sort, setSort] = useState<Sort>('updated');
  const [filter, setFilter] = useState('');
  const data = useLiveQuery(() => collectionRepository.list(), ['collections']);
  const list = (data.data ?? [])
    .filter((c) => !filter || c.name.toLocaleLowerCase('tr').includes(filter.toLocaleLowerCase('tr')))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'tr') : sort === 'count' ? b.count - a.count : sort === 'created' ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt);

  return (
    <Page className="pb-12 pt-20 lg:pt-10">
      <PageHeader title="Koleksiyonlar" subtitle="Kendi temalı listelerinizi oluşturun" actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yeni koleksiyon</Button>} />
      {(data.data?.length ?? 0) > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Koleksiyon ara" aria-label="Koleksiyon ara"
            className="h-9 rounded-full bg-white/[0.07] px-4 text-[13px] outline-none placeholder:text-white/35 focus:ring-1 focus:ring-white/25" />
          <Select label="Sıralama" value={sort} onChange={setSort} options={[
            { value: 'updated', label: 'Son güncellenen' }, { value: 'created', label: 'Son oluşturulan' }, { value: 'name', label: 'Ada göre' }, { value: 'count', label: 'İçerik sayısı' },
          ]} />
        </div>
      )}
      {data.loading && !data.data ? null : (data.data?.length ?? 0) === 0 ? (
        <EmptyState icon="collection" title="Henüz koleksiyonunuz yok" text="“Hafta sonu filmleri”, “Kore dizileri” gibi kendi listelerinizi oluşturun. İçerikleri detay sayfasından ekleyebilirsiniz."
          action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>İlk koleksiyonu oluştur</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((c) => (
            <Link key={c.id} to={`/koleksiyon/${c.id}`} className="group block">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] transition group-hover:ring-white/25">
                <CollectionCover c={c} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent" />
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur-md">{c.count} içerik</span>
              </div>
              <p className="mt-3 truncate text-[15.5px] font-semibold">{c.name}</p>
              {c.description && <p className="mt-0.5 line-clamp-1 text-[13px] text-white/45">{c.description}</p>}
            </Link>
          ))}
        </div>
      )}
      {creating && (
        <CollectionForm open title="Yeni koleksiyon" onClose={() => setCreating(false)} onSubmit={async (n, d) => {
          const c = await collectionRepository.create(n, d);
          toast(`“${c.name}” oluşturuldu`);
        }} />
      )}
    </Page>
  );
}
