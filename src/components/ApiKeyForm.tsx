import { useState } from 'react';
import { keySource, setUserApiKey } from '../api/config';
import { describeError } from '../api/errors';
import { clearApiCache, validateApiKey } from '../api/tmdb';
import { openExternal } from '../platform/platform';
import { preferencesRepository } from '../repositories/preferencesRepository';
import { Icon } from './Icon';
import { Button, useFeedback } from './ui';

/** TMDB anahtarını doğrulayıp yalnızca bu cihazda saklayan form. */
export function ApiKeyForm({ onSaved, compact }: { onSaved?: () => void; compact?: boolean }) {
  const { toast } = useFeedback();
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    const key = value.trim();
    if (!key) return;
    setBusy(true);
    setMessage(null);
    try {
      const ok = await validateApiKey(key);
      if (!ok) {
        setMessage({ ok: false, text: 'TMDB bu anahtarı reddetti. Anahtarı eksiksiz kopyaladığınızdan emin olun.' });
        return;
      }
      setUserApiKey(key);
      await preferencesRepository.set('tmdbApiKey', key);
      await clearApiCache();
      setValue('');
      setMessage({ ok: true, text: 'Anahtar doğrulandı ve bu cihaza kaydedildi.' });
      toast('TMDB bağlantısı hazır');
      onSaved?.();
    } catch (e) {
      setMessage({ ok: false, text: describeError(e).hint });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className={`flex gap-2 ${compact ? 'flex-col sm:flex-row' : 'flex-col sm:flex-row'}`}>
        <div className="relative flex-1">
          <Icon name="key" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder={keySource() === 'none' ? 'API anahtarı veya API Read Access Token' : 'Yeni anahtar girerek değiştirin'}
            aria-label="TMDB API anahtarı"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-xl bg-white/[0.07] pl-11 pr-12 font-mono text-[14px] text-white outline-none ring-1 ring-white/[0.08] placeholder:font-sans placeholder:text-white/30 focus:ring-white/30"
          />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Anahtarı gizle' : 'Anahtarı göster'} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/40 hover:text-white">
            <Icon name="eye" size={17} />
          </button>
        </div>
        <Button variant="primary" size="lg" onClick={save} disabled={busy || !value.trim()}>{busy ? 'Doğrulanıyor…' : 'Kaydet ve doğrula'}</Button>
      </div>
      {message && (
        <p className={`flex items-start gap-2 text-[13px] ${message.ok ? 'text-emerald-300' : 'text-red-300'}`}>
          <Icon name={message.ok ? 'check' : 'alert'} size={16} className="mt-0.5" />{message.text}
        </p>
      )}
      <p className="text-[12.5px] leading-relaxed text-white/40">
        Anahtar yalnızca bu cihazda saklanır ve sadece TMDB’ye gönderilir. Ücretsiz anahtar almak için{' '}
        <button type="button" className="text-white/70 underline underline-offset-2 hover:text-white" onClick={() => openExternal('https://www.themoviedb.org/settings/api')}>
          themoviedb.org/settings/api
        </button>{' '}adresini ziyaret edin.
      </p>
    </div>
  );
}
