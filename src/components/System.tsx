import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { prefersReducedMotion } from '../platform/platform';
import { LogoMark } from './Icon';
import { Button } from './ui';

/** Açılış animasyonu: kısa (≈1,1 sn) ve hazır olunca hemen kapanır; erişime engel olmaz. */
export function Splash({ ready, error, onRetry }: { ready: boolean; error?: string | null; onRetry?: () => void }) {
  const [minDone, setMinDone] = useState(prefersReducedMotion());
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 1100);
    return () => clearTimeout(t);
  }, []);
  const leaving = ready && minDone && !error;
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setGone(true), 520);
    return () => clearTimeout(t);
  }, [leaving]);
  if (gone) return null;

  return (
    <div className={`splash fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      <div className="splash-glow absolute size-[420px] rounded-full" />
      <div className="splash-mark relative"><LogoMark size={88} /></div>
      <div className="splash-word relative mt-7 overflow-hidden text-[30px] font-semibold tracking-[0.42em] text-white">
        FILM<span className="text-white/50">HUB</span>
        <span className="splash-shine absolute inset-0" />
      </div>
      {error ? (
        <div className="relative mt-10 flex max-w-sm flex-col items-center gap-4 px-6 text-center">
          <p className="text-sm text-white/60">{error}</p>
          {onRetry && <Button variant="primary" icon="refresh" onClick={onRetry}>Tekrar dene</Button>}
        </div>
      ) : (
        <div className="splash-bar relative mt-10 h-[3px] w-28 overflow-hidden rounded-full bg-white/10"><span /></div>
      )}
    </div>
  );
}

interface EBState { error: Error | null }

/** Beklenmeyen bir arayüz hatasında tüm uygulamanın beyaz ekranda kalmasını önler. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, EBState> {
  override state: EBState = { error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FILMHUB] Arayüz hatası:', error, info.componentStack);
  }

  override componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="text-xl font-semibold text-white">Bu ekran yüklenirken bir sorun oluştu</h2>
        <p className="max-w-md text-sm text-white/50">Kişisel verileriniz güvende. Ekranı yeniden yüklemeyi deneyebilirsiniz.</p>
        <div className="flex gap-2">
          <Button variant="primary" icon="refresh" onClick={() => this.setState({ error: null })}>Tekrar dene</Button>
          <Button onClick={() => { window.location.hash = '#/'; this.setState({ error: null }); }}>Ana sayfa</Button>
        </div>
      </div>
    );
  }
}
