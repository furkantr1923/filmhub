import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { PosterCard, TmdbImage } from '../components/MediaCard';
import { MediaPicker } from '../components/Pickers';
import { Button, EmptyState, IconButton, Modal, Select, useFeedback } from '../components/ui';
import { useLiveQuery } from '../hooks/hooks';
import { collectionRepository } from '../repositories/collectionRepository';
import { Link, navigate } from '../router/router';
import { mediaItemFor } from '../services/library';
import { filterLibrary, sortLibrary, type LibrarySort } from '../services/libraryQuery';
import type { ContentKind } from '../types/media';
import { img } from '../utils/images';
import { CollectionForm } from './Collections';

export default function CollectionDetail({ params }: { params: { id: string } }) {
  const { toast, confirm } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [coverPicker, setCoverPicker] = useState(false);
  const [sort, setSort] = useState<LibrarySort>('added-desc');
  const [kind, setKind] = useState<ContentKind | 'all'>('all');

  const data = useLiveQuery(async () => {
    const c = await collectionRepository.get(params.id);
    if (!c) return null;
    return { c, items: await collectionRepository.items(params.id) };
  }, ['collections'], [params.id]);

  if (data.loading && !data.data) return null;
  if (!data.data) {
    return <Page className="pt-24 lg:pt-12"><EmptyState icon="collection" title="Koleksiyon bulunamadı" action={<Button onClick={() => navigate('/koleksiyonlar')}>Koleksiyonlara dön</Button>} /></Page>;
  }
  const { c, items } = data.data;
  const rows = items.flatMap((i) => (i.item ? [{ item: i.item, addedAt: i.addedAt, personalRating: null, note: null }] : []));
  const visible = sortLibrary(filterLibrary(rows, { kind }), sort);

  const del = async () => {
    if (!(await confirm({ title: 'Koleksiyon silinsin mi?', text: `“${c.name}” koleksiyonu silinecek. İçindeki içerikler kütüphanenizden silinmez.`, confirmLabel: 'Koleksiyonu sil', danger: true }))) return;
    await collectionRepository.remove(c.id);
    toast('Koleksiyon silindi');
    navigate('/koleksiyonlar', { replace: true });
  };

  return (
    <div>
      <div className="relative h-[38vh] min-h-[260px] overflow-hidden">
        {c.coverPath ? <TmdbImage src={img(c.coverPath, 'w1280')} alt="" eager className="size-full object-cover" /> : <div className="size-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
      </div>
      <Page className="relative -mt-40 pb-12">
        <Link to="/koleksiyonlar" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-white/60 hover:text-white"><Icon name="chevronLeft" size={16} /> Koleksiyonlar</Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[32px] font-bold tracking-tight md:text-[44px]">{c.name}</h1>
            {c.description && <p className="mt-2 max-w-2xl text-[15px] text-white/65">{c.description}</p>}
            <p className="mt-2 text-[13px] text-white/40">{items.length} içerik</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon="plus" onClick={() => setPicker(true)}>İçerik ekle</Button>
            <IconButton icon="edit" label="Adı ve açıklamayı düzenle" onClick={() => setEditing(true)} />
            <IconButton icon="image" label="Kapak görselini değiştir" disabled={!rows.some((r) => r.item.backdropPath)} onClick={() => setCoverPicker(true)} />
            <IconButton icon="trash" label="Koleksiyonu sil" onClick={del} />
          </div>
        </div>

        {rows.length > 0 && (
          <div className="mb-7 mt-8 flex flex-wrap items-center gap-2">
            <Select label="İçerik türü" value={kind} onChange={setKind} options={[
              { value: 'all', label: 'Tüm içerikler' }, { value: 'movie', label: 'Filmler' }, { value: 'series', label: 'Diziler' }, { value: 'documentary', label: 'Belgeseller' },
            ]} />
            <Select label="Sıralama" value={sort} onChange={setSort} options={[
              { value: 'added-desc', label: 'Son eklenen' }, { value: 'added-asc', label: 'İlk eklenen' }, { value: 'title', label: 'Ada göre' },
              { value: 'year-desc', label: 'Yıl (yeni)' }, { value: 'year-asc', label: 'Yıl (eski)' }, { value: 'tmdb-desc', label: 'TMDB puanı' },
            ]} />
            <Button size="sm" variant={removing ? 'primary' : 'secondary'} icon={removing ? 'check' : 'edit'} onClick={() => setRemoving((r) => !r)}>{removing ? 'Bitti' : 'Düzenle'}</Button>
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState icon="collection" title="Bu koleksiyon boş" text="Arayarak içerik ekleyin ya da bir film veya dizinin detay sayfasındaki koleksiyon düğmesini kullanın."
            action={<Button variant="primary" icon="plus" onClick={() => setPicker(true)}>İçerik ekle</Button>} />
        ) : visible.length === 0 ? (
          <EmptyState icon="filter" title="Bu filtreyle içerik yok" />
        ) : (
          <div className="poster-grid grid gap-x-3.5 gap-y-7 md:gap-x-5">
            {visible.map((r) => (
              <div key={r.item.key} className="relative">
                <PosterCard item={r.item} />
                {removing && (
                  <button type="button" aria-label={`${r.item.title} öğesini koleksiyondan çıkar`} onClick={async () => { await collectionRepository.removeItem(c.id, r.item.key); toast('Koleksiyondan çıkarıldı'); }}
                    className="absolute -right-2 -top-2 z-10 flex size-8 items-center justify-center rounded-full bg-red-500 text-white shadow-xl ring-4 ring-black animate-pop-in">
                    <Icon name="close" size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Page>

      {editing && (
        <CollectionForm open title="Koleksiyonu düzenle" initial={{ name: c.name, description: c.description }} onClose={() => setEditing(false)}
          onSubmit={async (name, description) => { await collectionRepository.update(c.id, { name, description }); toast('Koleksiyon güncellendi'); }} />
      )}
      <MediaPicker open={picker} onClose={() => setPicker(false)} title={`“${c.name}” koleksiyonuna ekle`} onPick={async (m) => {
        try {
          const r = await collectionRepository.addItem(c.id, await mediaItemFor(m.type, m.tmdbId));
          toast(r === 'exists' ? 'Bu içerik zaten koleksiyonda' : `${m.title} eklendi`);
        } catch (e) {
          toast((e as Error).message, { tone: 'error' });
        }
      }} />
      <Modal open={coverPicker} onClose={() => setCoverPicker(false)} title="Kapak görseli seç" size="lg">
        <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3 md:p-6">
          {rows.filter((r) => r.item.backdropPath).map((r) => (
            <button key={r.item.key} type="button" onClick={async () => { await collectionRepository.update(c.id, { coverPath: r.item.backdropPath }); setCoverPicker(false); toast('Kapak güncellendi'); }}
              className={`overflow-hidden rounded-xl ring-2 transition ${c.coverPath === r.item.backdropPath ? 'ring-white' : 'ring-transparent hover:ring-white/40'}`}>
              <TmdbImage src={img(r.item.backdropPath, 'w300')} alt={r.item.title} className="aspect-video w-full object-cover" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
