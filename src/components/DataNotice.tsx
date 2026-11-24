import { useLiveQuery } from '../hooks/hooks';
import { preferencesRepository } from '../repositories/preferencesRepository';
import { Icon } from './Icon';
import { Button } from './ui';

/** Yedekleme bilinçli olarak bulunmadığı için kullanıcı açıkça bilgilendirilir. */
export function DataNotice({ always }: { always?: boolean }) {
  const ack = useLiveQuery(() => preferencesRepository.get<boolean>('dataNoticeAcknowledged'), ['prefs']);
  if (!always && (ack.loading || ack.data)) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-amber-400/[0.08] p-4 ring-1 ring-amber-300/20 sm:flex-row sm:items-center">
      <Icon name="info" size={20} className="shrink-0 text-amber-200" />
      <p className="flex-1 text-[13.5px] leading-relaxed text-amber-50/80">
        Kişisel kayıtlarınız yalnızca bu cihazda saklanır. FILMHUB’da yedekleme, dışa aktarma ve bulut senkronizasyonu bulunmaz;
        uygulamayı kaldırmak veya tarayıcı verilerini silmek kayıtlarınızın <strong className="text-amber-50">kalıcı olarak kaybolmasına</strong> yol açabilir.
      </p>
      {!always && <Button size="sm" onClick={() => preferencesRepository.set('dataNoticeAcknowledged', true)}>Anladım</Button>}
    </div>
  );
}
