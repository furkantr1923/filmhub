import { useEffect, useState } from 'react';
import { openExternal } from '../platform/platform';
import type { Video } from '../types/media';
import { VIDEO_TYPE_LABEL } from '../utils/format';
import { youtubeEmbed, youtubeThumb, youtubeWatch } from '../utils/images';
import { Icon } from './Icon';
import { Button, Modal, Spinner } from './ui';

/**
 * YouTube fragman oynatıcı. Video yalnızca YouTube'un resmi gömme oynatıcısı ile oynatılır;
 * hiçbir video indirilmez veya barındırılmaz. Gömme engellenirse YouTube'da açma seçeneği sunulur.
 */
export function TrailerModal({ video, onClose, title }: { video: Video | null; onClose: () => void; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    if (!video) return;
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [video]);

  return (
    <Modal open={!!video} onClose={onClose} title={video ? `${title} — ${VIDEO_TYPE_LABEL[video.type] ?? video.type}` : ''} size="xl">
      {video && (
        <div>
          <div className="relative aspect-video w-full bg-black">
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-white/50">
                <Spinner size={30} />
                {slow ? 'Video yüklenemiyor olabilir. Aşağıdan YouTube’da açabilirsiniz.' : 'Fragman yükleniyor…'}
              </div>
            )}
            <iframe
              key={video.key}
              src={youtubeEmbed(video.key)}
              title={video.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setLoaded(true)}
              className={`absolute inset-0 size-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
            <p className="min-w-0 flex-1 truncate text-sm text-white/60">{video.name}</p>
            <Button size="sm" icon="external" onClick={() => openExternal(youtubeWatch(video.key))}>YouTube’da aç</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function VideoThumb({ video, onPlay }: { video: Video; onPlay: (v: Video) => void }) {
  const [err, setErr] = useState(false);
  return (
    <button type="button" onClick={() => onPlay(video)} className="group w-[260px] shrink-0 snap-start text-left md:w-[300px]">
      <div className="relative aspect-video overflow-hidden rounded-[14px] bg-white/[0.05] ring-1 ring-white/[0.06] transition group-hover:ring-white/25">
        {!err && <img src={youtubeThumb(video.key)} alt="" loading="lazy" onError={() => setErr(true)} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/40">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition-transform group-hover:scale-110">
            <Icon name="play" size={20} filled />
          </span>
        </div>
        <span className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
          {VIDEO_TYPE_LABEL[video.type] ?? video.type}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] font-medium text-white/80">{video.name}</p>
    </button>
  );
}
