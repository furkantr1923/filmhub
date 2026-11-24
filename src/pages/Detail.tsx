import { useMemo, useState, type ReactNode } from 'react';
import { tmdb } from '../api/tmdb';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { PersonAvatar, PosterCard, TmdbImage } from '../components/MediaCard';
import { CollectionPicker } from '../components/Pickers';
import { RatingInput } from '../components/RatingInput';
import { RowHeader, Scroller } from '../components/Row';
import { TrailerModal, VideoThumb } from '../components/TrailerPlayer';
import { Button, ErrorState, IconButton, Modal, ProgressBar, Skeleton, TextArea, useFeedback } from '../components/ui';
import { useLiveQuery, useQuery } from '../hooks/hooks';
import { libraryRepository } from '../repositories/libraryRepository';
import { toMediaItem } from '../repositories/mediaRepository';
import { MAX_REVIEW_LENGTH, ratingRepository } from '../repositories/ratingRepository';
import { seriesRepository } from '../repositories/seriesRepository';
import { openExternal } from '../platform/platform';
import { Link, navigate } from '../router/router';
import { toggleList, useLibraryIndex } from '../services/library';
import { SERIES_STATUS_LABEL } from '../services/seriesProgress';
import type { MediaDetail, MediaType, Video } from '../types/media';
import { fmt, KIND_LABEL, statusLabel } from '../utils/format';
import { backdropSrcSet, img, posterSrcSet } from '../utils/images';

/* ---------------- Yardımcı bileşenler ---------------- */

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-[0.1em] text-white/35">{label}</dt>
      <dd className="mt-1 text-[14.5px] leading-snug text-white/85">{children}</dd>
    </div>
  );
}

function Section({ title, children, subtitle }: { title: string; children: ReactNode; subtitle?: string }) {
  return (
    <section className="animate-fade-in">
      <RowHeader title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return null;
  return (
    <Section title="Görseller" subtitle={`${images.length} görsel`}>
      <Scroller>
        {images.map((p, i) => (
          <button key={p} type="button" onClick={() => setOpen(i)} className="w-[280px] shrink-0 snap-start overflow-hidden rounded-[14px] ring-1 ring-white/[0.06] transition hover:ring-white/30 md:w-[340px]">
            <TmdbImage src={img(p, 'w780')} alt={`${title} görsel ${i + 1}`} className="aspect-video w-full object-cover" />
          </button>
        ))}
      </Scroller>
      <Modal open={open !== null} onClose={() => setOpen(null)} title={`${(open ?? 0) + 1} / ${images.length}`} size="xl">
        {open !== null && (
          <div className="relative bg-black">
            <TmdbImage src={img(images[open], 'w1280')} alt="" className="aspect-video w-full object-contain" eager />
            <div className="absolute inset-y-0 left-2 flex items-center">
              <IconButton icon="chevronLeft" label="Önceki" onClick={() => setOpen((open - 1 + images.length) % images.length)} />
            </div>
            <div className="absolute inset-y-0 right-2 flex items-center">
              <IconButton icon="chevronRight" label="Sonraki" onClick={() => setOpen((open + 1) % images.length)} />
            </div>
          </div>
        )}
      </Modal>
    </Section>
  );
}

/* ---------------- Kişisel bölüm: puan, yorum, not ---------------- */

function PersonalPanel({ detail }: { detail: MediaDetail }) {
  const { toast, confirm } = useFeedback();
  const data = useLiveQuery(async () => {
    const [rating, review, note] = await Promise.all([
      ratingRepository.getRating(detail.key),
      ratingRepository.getReview(detail.key),
      libraryRepository.getNote(detail.key),
    ]);
    return { rating, review, note };
  }, ['ratings', 'library'], [detail.key]);
  const [editor, setEditor] = useState<'rating' | 'review' | 'note' | null>(null);
  const [draftRating, setDraftRating] = useState<number | null>(null);
  const [draftText, setDraftText] = useState('');
  const item = useMemo(() => toMediaItem(detail), [detail]);

  const open = (kind: 'rating' | 'review' | 'note') => {
    setEditor(kind);
    if (kind === 'rating') setDraftRating(data.data?.rating?.value ?? null);
    if (kind === 'review') setDraftText(data.data?.review?.text ?? '');
    if (kind === 'note') setDraftText(data.data?.note?.text ?? '');
  };

  const save = async () => {
    try {
      if (editor === 'rating' && draftRating !== null) {
        await ratingRepository.setRating(item, draftRating);
        toast(`Puanınız kaydedildi: ${fmt.personalRating(draftRating)}`, { icon: 'star' });
      } else if (editor === 'review') {
        await ratingRepository.setReview(item, draftText);
        toast('Yorumunuz kaydedildi');
      } else if (editor === 'note') {
        await libraryRepository.setNote(detail.key, draftText);
        toast(draftText.trim() ? 'Not kaydedildi' : 'Not silindi');
      }
      setEditor(null);
    } catch (e) {
      toast((e as Error).message, { tone: 'error' });
    }
  };

  const remove = async (kind: 'rating' | 'review' | 'note') => {
    const labels = { rating: 'puanınız', review: 'yorumunuz', note: 'notunuz' };
    if (!(await confirm({ title: 'Silinsin mi?', text: `Bu içerik için ${labels[kind]} kalıcı olarak silinecek.`, confirmLabel: 'Sil', danger: true }))) return;
    if (kind === 'rating') await ratingRepository.deleteRating(detail.key);
    if (kind === 'review') await ratingRepository.deleteReview(detail.key);
    if (kind === 'note') await libraryRepository.setNote(detail.key, '');
    toast('Silindi');
  };

  const d = data.data;
  const card = (kind: 'rating' | 'review' | 'note', title: string, icon: 'star' | 'edit' | 'note', body: ReactNode, empty: string) => {
    const has = kind === 'rating' ? !!d?.rating : kind === 'review' ? !!d?.review : !!d?.note;
    return (
      <div className="flex flex-col rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/[0.06]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-white/80"><Icon name={icon} size={17} />{title}</h3>
          {has && (
            <div className="flex gap-1">
              <IconButton icon="edit" label="Düzenle" size={32} onClick={() => open(kind)} />
              <IconButton icon="trash" label="Sil" size={32} onClick={() => remove(kind)} />
            </div>
          )}
        </div>
        {has ? body : (
          <button type="button" onClick={() => open(kind)} className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/15 px-4 py-6 text-[13.5px] text-white/45 transition hover:border-white/35 hover:text-white">
            {empty}
          </button>
        )}
      </div>
    );
  };

  return (
    <Section title="Sizin İçin" subtitle="Kişisel kayıtlarınız yalnızca bu cihazda saklanır ve TMDB puanlarından ayrıdır">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {card('rating', 'Puanım', 'star', (
          <p className="text-[40px] font-bold leading-none tabular-nums">{d?.rating && fmt.personalRating(d.rating.value)}<span className="text-lg text-white/35">/10</span></p>
        ), '+ Puan ver')}
        {card('review', 'Yorumum', 'edit', (
          <><p className="line-clamp-5 whitespace-pre-line text-[14px] leading-relaxed text-white/75">{d?.review?.text}</p>
            <p className="mt-3 text-[11.5px] text-white/35">{d?.review && fmt.timestamp(d.review.updatedAt)}</p></>
        ), '+ Yorum yaz')}
        {card('note', 'Notum', 'note', (
          <p className="line-clamp-5 whitespace-pre-line text-[14px] leading-relaxed text-white/75">{d?.note?.text}</p>
        ), '+ Not ekle')}
      </div>
      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor === 'rating' ? 'Puanınız' : editor === 'review' ? 'Yorumunuz' : 'Kişisel not'}
        size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setEditor(null)}>Vazgeç</Button>
          <Button variant="primary" onClick={save} disabled={editor === 'rating' ? draftRating === null : editor === 'review' ? !draftText.trim() : false}>Kaydet</Button>
        </>}
      >
        <div className="p-5 md:p-6">
          <p className="mb-5 truncate text-sm text-white/50">{detail.title}</p>
          {editor === 'rating' && <RatingInput value={draftRating} onChange={setDraftRating} />}
          {editor === 'review' && <TextArea label="Bu içerik hakkında düşünceleriniz" value={draftText} onChange={setDraftText} rows={7} maxLength={MAX_REVIEW_LENGTH} placeholder="Neyi beğendiniz, neyi beğenmediniz?" />}
          {editor === 'note' && <TextArea label="Kendinize not (ör. kim önerdi, nerede izlenir)" value={draftText} onChange={setDraftText} rows={5} maxLength={2000} />}
        </div>
      </Modal>
    </Section>
  );
}

/* ---------------- Dizi: sezonlar ve ilerleme ---------------- */

function SeasonsSection({ detail }: { detail: MediaDetail }) {
  const progress = useLiveQuery(() => seriesRepository.progress(detail.tmdbId), ['series'], [detail.tmdbId]);
  const p = progress.data;
  const seasons = [...detail.seasons].sort((a, b) => (a.seasonNumber === 0 ? 1 : b.seasonNumber === 0 ? -1 : a.seasonNumber - b.seasonNumber));
  if (!seasons.length) return null;
  return (
    <Section title="Sezonlar" subtitle={`${detail.numberOfSeasons ?? seasons.length} sezon · ${detail.numberOfEpisodes ?? 0} bölüm`}>
      {p && (
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/[0.06]">
          <div className="min-w-[220px] flex-1">
            <div className="mb-2 flex justify-between text-[13px]">
              <span className="font-semibold text-white">{SERIES_STATUS_LABEL[p.status]}</span>
              <span className="tabular-nums text-white/50">{p.watched} / {p.total} bölüm · %{p.percent}</span>
            </div>
            <ProgressBar value={p.percent} tone={p.status === 'completed' ? 'green' : 'white'} />
          </div>
          {p.next && (
            <Button variant="primary" size="sm" icon="play" iconFilled onClick={() => navigate(`/dizi/${detail.tmdbId}/sezon/${p.next!.seasonNumber}`)}>
              Sıradaki: S{p.next.seasonNumber} · B{p.next.episodeNumber}
            </Button>
          )}
        </div>
      )}
      <Scroller>
        {seasons.map((s) => {
          const sp = p?.seasons.find((x) => x.seasonNumber === s.seasonNumber);
          return (
            <Link key={s.seasonNumber} to={`/dizi/${detail.tmdbId}/sezon/${s.seasonNumber}`} className="group w-[150px] shrink-0 snap-start md:w-[170px]">
              <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] bg-white/[0.04] ring-1 ring-white/[0.06] transition group-hover:-translate-y-1 group-hover:ring-white/25">
                <TmdbImage src={img(s.posterPath ?? detail.posterPath, 'w342')} alt={s.name} className="size-full object-cover" />
                {sp?.complete && <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white text-black"><Icon name="check" size={14} strokeWidth={2.5} /></span>}
                {sp && sp.watched > 0 && !sp.complete && (
                  <div className="absolute inset-x-2 bottom-2"><ProgressBar value={sp.percent} /></div>
                )}
              </div>
              <p className="mt-2.5 truncate text-[13.5px] font-medium">{s.name}</p>
              <p className="text-[12px] text-white/45">{s.episodeCount} bölüm{s.airDate ? ` · ${s.airDate.slice(0, 4)}` : ''}</p>
            </Link>
          );
        })}
      </Scroller>
    </Section>
  );
}

/* ---------------- Sayfa ---------------- */

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-[62vh] w-full rounded-none opacity-40" />
      <Page className="-mt-40 space-y-4">
        <Skeleton className="h-12 w-2/3 max-w-lg" />
        <Skeleton className="h-4 w-1/3 max-w-xs" />
        <Skeleton className="h-20 w-full max-w-2xl" />
      </Page>
    </div>
  );
}

export default function Detail({ params }: { params: { id: string; kind: string } }) {
  const type = params.kind as MediaType;
  const id = Number(params.id);
  const { toast } = useFeedback();
  const lib = useLibraryIndex();
  const q = useQuery(() => tmdb.details(type, id), [type, id], { enabled: Number.isFinite(id) });
  const [video, setVideo] = useState<Video | null>(null);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (q.error) return <Page className="pt-24 lg:pt-12"><ErrorState error={q.error} onRetry={q.reload} /></Page>;
  if (q.loading || !q.data) return <DetailSkeleton />;
  const d = q.data;
  const key = d.key;
  const status = { watched: lib.watched.has(key), watchlist: lib.watchlist.has(key), favorite: lib.favorites.has(key) };
  const trailer = d.videos.find((v) => v.type === 'Trailer') ?? d.videos[0] ?? null;
  const isTv = d.type === 'tv';

  const act = async (list: 'watched' | 'watchlist' | 'favorites', active: boolean) => {
    setBusy(list);
    try {
      toast(await toggleList(list, key, d.type, d.tmdbId, active), { icon: list === 'favorites' ? 'heart' : list === 'watchlist' ? 'bookmark' : 'check' });
    } catch (e) {
      toast((e as Error).message || 'İşlem başarısız', { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const meta = [
    d.year,
    isTv ? (d.numberOfSeasons ? `${d.numberOfSeasons} sezon` : null) : fmt.runtime(d.runtime),
    d.genres.slice(0, 3).map((g) => g.name).join(', '),
  ].filter(Boolean);

  return (
    <article>
      {/* Sinematik başlık alanı */}
      <div className="relative">
        <div className="relative h-[58vh] min-h-[380px] w-full overflow-hidden md:h-[72vh] md:max-h-[820px]">
          {d.backdropPath ? (
            <TmdbImage src={img(d.backdropPath, 'w1280')} srcSet={backdropSrcSet(d.backdropPath)} sizes="100vw" alt="" eager className="size-full object-cover" />
          ) : <div className="size-full bg-gradient-to-br from-neutral-800 to-black" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
        </div>

        <Page className="relative -mt-[30vh] md:-mt-[34vh]">
          <div className="flex flex-col gap-8 md:flex-row md:items-end">
            <div className="hidden w-[230px] shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 md:block xl:w-[260px]">
              <TmdbImage src={img(d.posterPath, 'w500')} srcSet={posterSrcSet(d.posterPath)} sizes="260px" alt={d.title} eager className="aspect-[2/3] w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 animate-hero-text">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/55">{KIND_LABEL[d.kind]}{d.status ? ` · ${statusLabel(d.status)}` : ''}</p>
              <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight md:text-[52px]">{d.title}</h1>
              {d.originalTitle && d.originalTitle !== d.title && <p className="mt-2 text-[15px] text-white/50">{d.originalTitle}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-white/70">
                {meta.map((m, i) => <span key={i} className="flex items-center gap-3">{i > 0 && <span className="text-white/25">•</span>}{m}</span>)}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {d.voteAverage > 0 && (
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold backdrop-blur-xl">
                    <Icon name="star" size={14} filled className="text-[var(--color-gold)]" /> {fmt.rating(d.voteAverage)}
                    <span className="font-normal text-white/45">TMDB · {fmt.compact(d.voteCount)} oy</span>
                  </span>
                )}
                {d.imdbId && (
                  <button type="button" onClick={() => openExternal(`https://www.imdb.com/title/${d.imdbId}/`)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold text-white/80 backdrop-blur-xl hover:bg-white/20">
                    <span className="rounded bg-[#f5c518] px-1 text-[10px] font-black text-black">IMDb</span> Sayfasını aç <Icon name="external" size={13} />
                  </button>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {trailer && <Button variant="primary" size="lg" icon="play" iconFilled onClick={() => setVideo(trailer)}>Fragmanı İzle</Button>}
                <Button variant={status.watchlist ? 'primary' : 'glass'} size="lg" icon={status.watchlist ? 'check' : 'plus'} disabled={busy === 'watchlist'} onClick={() => act('watchlist', status.watchlist)}>
                  {status.watchlist ? 'Listede' : 'İzleme Listesi'}
                </Button>
                <IconButton icon="check" label={isTv ? (status.watched ? 'Tamamlandı işaretini kaldır' : 'Tamamlandı olarak işaretle') : status.watched ? 'İzlendi işaretini kaldır' : 'İzledim'} active={status.watched} size={48} disabled={busy === 'watched'} onClick={() => act('watched', status.watched)} />
                <IconButton icon="heart" label={status.favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'} active={status.favorite} size={48} disabled={busy === 'favorites'} onClick={() => act('favorites', status.favorite)} className={status.favorite ? '!bg-rose-500 !text-white' : ''} />
                <IconButton icon="collection" label="Koleksiyona ekle" size={48} onClick={() => setCollectionOpen(true)} />
              </div>
              {d.tagline && <p className="mt-6 text-[15px] italic text-white/55">“{d.tagline}”</p>}
              {d.overview ? (
                <p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-white/80">{d.overview}</p>
              ) : (
                <p className="mt-3 text-[14px] text-white/40">Bu içerik için henüz özet bulunmuyor.</p>
              )}
            </div>
          </div>
        </Page>
      </div>

      <Page className="mt-12 space-y-12 pb-12 md:space-y-14">
        {/* Bilgiler */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/[0.05] sm:grid-cols-3 md:p-6">
            <InfoItem label={isTv ? 'İlk yayın' : 'Vizyon tarihi'}>{fmt.date(d.releaseDate)}</InfoItem>
            <InfoItem label={isTv ? 'Bölüm süresi' : 'Süre'}>{fmt.runtime(isTv ? d.episodeRunTime : d.runtime)}</InfoItem>
            <InfoItem label="Durum">{statusLabel(d.status)}</InfoItem>
            <InfoItem label={isTv ? 'Yaratıcı' : d.directors.length > 1 ? 'Yönetmenler' : 'Yönetmen'}>
              {d.directors.length ? d.directors.map((p, i) => <span key={p.id}>{i > 0 && ', '}<Link to={`/kisi/${p.id}`} className="hover:underline">{p.name}</Link></span>) : null}
            </InfoItem>
            <InfoItem label="Türler">{d.genres.map((g) => g.name).join(', ')}</InfoItem>
            <InfoItem label="Yapım ülkesi">{(d.productionCountries.length ? d.productionCountries.map((c) => fmt.country(c.code)) : d.originCountries.map(fmt.country)).join(', ')}</InfoItem>
            <InfoItem label="Diller">{d.spokenLanguages.slice(0, 4).map(fmt.language).join(', ')}</InfoItem>
            {isTv && <InfoItem label="Sezon / Bölüm">{d.numberOfSeasons ? `${d.numberOfSeasons} sezon · ${d.numberOfEpisodes} bölüm` : null}</InfoItem>}
            {!isTv && <InfoItem label="Bütçe">{fmt.money(d.budget)}</InfoItem>}
            {!isTv && <InfoItem label="Hasılat">{fmt.money(d.revenue)}</InfoItem>}
          </dl>
          {d.productionCompanies.length > 0 && (
            <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/[0.05] md:p-6">
              <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.1em] text-white/35">Yapım şirketleri</p>
              <ul className="space-y-2.5">
                {d.productionCompanies.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-[14px] text-white/80">
                    <span className="flex h-8 w-12 items-center justify-center rounded-md bg-white/90 p-1">
                      {c.logoPath ? <img src={img(c.logoPath, 'w92') ?? ''} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /> : <Icon name="film" size={14} className="text-black/40" />}
                    </span>
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {isTv && <SeasonsSection detail={d} />}

        {d.cast.length > 0 && (
          <Section title="Oyuncular">
            <Scroller>{d.cast.map((c) => <div key={`${c.id}-${c.character}`} className="snap-start"><PersonAvatar id={c.id} name={c.name} role={c.character} profilePath={c.profilePath} /></div>)}</Scroller>
          </Section>
        )}

        {(d.directors.length > 0 || d.crew.length > 0) && (
          <Section title="Ekip">
            <Scroller>
              {[...d.directors, ...d.crew.filter((c) => !d.directors.some((x) => x.id === c.id))].map((c) => (
                <div key={`${c.id}-${c.job}`} className="snap-start"><PersonAvatar id={c.id} name={c.name} role={c.job} profilePath={c.profilePath} /></div>
              ))}
            </Scroller>
          </Section>
        )}

        {d.videos.length > 0 && (
          <Section title="Fragmanlar ve Videolar" subtitle={`${d.videos.length} video · YouTube`}>
            <Scroller>{d.videos.slice(0, 16).map((v) => <VideoThumb key={v.key} video={v} onPlay={setVideo} />)}</Scroller>
          </Section>
        )}

        <Gallery images={d.backdrops} title={d.title} />

        <PersonalPanel detail={d} />

        {d.recommendations.length > 0 && (
          <Section title="İlgili İçerikler" subtitle="Bunu izleyenlerin ilgilendikleri">
            <Scroller>{d.recommendations.map((m) => <div key={m.key} className="row-item-poster snap-start"><PosterCard item={m} /></div>)}</Scroller>
          </Section>
        )}
        {d.similar.length > 0 && (
          <Section title="Benzer Yapımlar" subtitle="Tür ve anahtar kelimelere göre">
            <Scroller>{d.similar.map((m) => <div key={m.key} className="row-item-poster snap-start"><PosterCard item={m} /></div>)}</Scroller>
          </Section>
        )}

        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-6">
          <Button size="sm" icon="compare" onClick={() => navigate(`/karsilastir?a=${d.key}`)}>Başka bir yapımla karşılaştır</Button>
          <Button size="sm" icon="external" onClick={() => openExternal(`https://www.themoviedb.org/${d.type}/${d.tmdbId}`)}>TMDB’de görüntüle</Button>
        </div>
      </Page>

      <TrailerModal video={video} onClose={() => setVideo(null)} title={d.title} />
      <CollectionPicker open={collectionOpen} onClose={() => setCollectionOpen(false)} item={collectionOpen ? toMediaItem(d) : null} />
    </article>
  );
}

