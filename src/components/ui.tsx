import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { describeError } from '../api/errors';
import { navigate } from '../router/router';
import { Icon, type IconName } from './Icon';

/* ---------------- Düğmeler ---------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-white text-black hover:bg-white/90 active:bg-white/80',
  secondary: 'bg-white/10 text-white hover:bg-white/15 active:bg-white/20',
  glass: 'bg-white/15 text-white backdrop-blur-xl hover:bg-white/25 ring-1 ring-white/10',
  ghost: 'text-white/80 hover:text-white hover:bg-white/8',
  danger: 'bg-red-500/15 text-red-300 hover:bg-red-500/25',
};

export function Button({ variant = 'secondary', icon, iconFilled, size = 'md', className = '', children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; iconFilled?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-[15px] gap-2.5' };
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex select-none items-center justify-center rounded-full font-semibold transition-[background,transform,opacity] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${VARIANT[variant]} ${className}`}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 20 : 17} filled={iconFilled} />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, active, className = '', size = 40, filled, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; active?: boolean; size?: number; filled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      {...rest}
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95 disabled:opacity-40 ${
        active ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
      } ${className}`}
    >
      <Icon name={icon} size={Math.round(size * 0.47)} filled={filled ?? active} />
    </button>
  );
}

export function Chip({ active, children, onClick, className = '' }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors ${
        active ? 'bg-white text-black' : 'bg-white/[0.07] text-white/80 hover:bg-white/[0.12] hover:text-white'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------- Durum bileşenleri ---------------- */

export function Spinner({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Yükleniyor"
      className={`inline-block animate-spin rounded-full border-2 border-white/15 border-t-white/80 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function EmptyState({ icon = 'film', title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/[0.06] text-white/50">
        <Icon name={icon} size={30} />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {text && <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const d = describeError(error);
  const icon: IconName = d.kind === 'offline' || d.kind === 'network' ? 'wifiOff' : d.kind.includes('key') ? 'key' : 'alert';
  const needsKey = d.kind === 'missing-key' || d.kind === 'invalid-key';
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-white/70 ring-1 ring-white/[0.06]">
        <Icon name={icon} size={18} className="text-white/50" />
        <span className="flex-1">{d.title}</span>
        {needsKey ? (
          <Button size="sm" onClick={() => navigate('/ayarlar')}>Ayarlar</Button>
        ) : onRetry && (
          <Button size="sm" icon="refresh" onClick={onRetry}>Tekrar dene</Button>
        )}
      </div>
    );
  }
  return (
    <EmptyState
      icon={icon}
      title={d.title}
      text={d.hint}
      action={needsKey ? (
        <Button variant="primary" icon="key" onClick={() => navigate('/ayarlar')}>API anahtarını gir</Button>
      ) : onRetry && (
        <Button variant="primary" icon="refresh" onClick={onRetry}>Tekrar dene</Button>
      )}
    />
  );
}

export function ProgressBar({ value, className = '', tone = 'white' }: { value: number; className?: string; tone?: 'white' | 'accent' | 'green' }) {
  const tones = { white: 'bg-white', accent: 'bg-[var(--color-accent)]', green: 'bg-emerald-400' };
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/10 ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${tones[tone]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-white md:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Select<T extends string>({ value, onChange, options, label, className = '' }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
        className="h-9 w-full cursor-pointer appearance-none rounded-full bg-white/[0.07] pl-4 pr-9 text-[13px] font-medium text-white outline-none transition-colors hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-white/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-neutral-900">{o.label}</option>
        ))}
      </select>
      <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-3.5 text-white/50" />
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className = '' }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={`no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full bg-white/[0.07] p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-all ${
            value === o.value ? 'bg-white text-black shadow' : 'text-white/65 hover:text-white'
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className={`ml-1.5 tabular-nums ${value === o.value ? 'text-black/50' : 'text-white/35'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function TextField({ value, onChange, placeholder, label, type = 'text', autoFocus, maxLength, onEnter, className = '' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  type?: string;
  autoFocus?: boolean;
  maxLength?: number;
  onEnter?: () => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-white/60">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        className="h-11 w-full rounded-xl bg-white/[0.07] px-4 text-[15px] text-white outline-none ring-1 ring-white/[0.06] transition placeholder:text-white/30 focus:bg-white/[0.1] focus:ring-white/30"
      />
    </label>
  );
}

export function TextArea({ value, onChange, placeholder, label, rows = 4, maxLength }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-[13px] font-medium text-white/60">
        {label}
        {maxLength && <span className="tabular-nums text-white/30">{value.length}/{maxLength}</span>}
      </span>
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl bg-white/[0.07] px-4 py-3 text-[15px] leading-relaxed text-white outline-none ring-1 ring-white/[0.06] transition placeholder:text-white/30 focus:bg-white/[0.1] focus:ring-white/30"
      />
    </label>
  );
}

/* ---------------- Modal ---------------- */

/**
 * Modal pencere. Açılınca tarayıcı geçmişine bir kayıt eklenir; böylece Android geri tuşu
 * veya tarayıcı geri düğmesi önce modalı kapatır, sayfadan çıkmaz.
 */
export function Modal({ open, onClose, title, children, size = 'md', footer, history = true }: {
  open: boolean;
  /** false: geri tuşu kaydı eklenmez (ardından sayfa değiştirebilen onay pencereleri için) */
  history?: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Math.random().toString(36).slice(2);
    if (history) window.history.pushState({ ...(window.history.state ?? {}), fhModal: id }, '');
    const onPop = () => closeRef.current();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      if (history && window.history.state?.fhModal === id) window.history.back();
    };
  }, [open, history]);

  if (!open) return null;
  const widths = { sm: 'md:max-w-sm', md: 'md:max-w-lg', lg: 'md:max-w-3xl', xl: 'md:max-w-5xl' };
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`safe-bottom relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#161618] shadow-2xl ring-1 ring-white/10 animate-sheet-up md:rounded-3xl md:animate-pop-in ${widths[size]}`}>
        {title !== undefined && (
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 md:px-6">
            <h2 className="truncate text-[17px] font-semibold text-white">{title}</h2>
            <IconButton icon="close" label="Kapat" size={34} onClick={onClose} />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-4 md:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Bildirim (toast) ve onay penceresi ---------------- */

interface ToastItem { id: number; text: string; tone: 'default' | 'error'; icon?: IconName }
interface ConfirmOptions { title: string; text?: string; confirmLabel?: string; danger?: boolean }

const FeedbackContext = createContext<{
  toast: (text: string, opts?: { tone?: 'default' | 'error'; icon?: IconName }) => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
} | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);

  const toast = useCallback((text: string, opts: { tone?: 'default' | 'error'; icon?: IconName } = {}) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone: opts.tone ?? 'default', icon: opts.icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);
  const settle = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toast-area pointer-events-none fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full px-5 py-3 text-sm font-medium shadow-2xl ring-1 backdrop-blur-xl animate-toast ${
              t.tone === 'error' ? 'bg-red-950/90 text-red-100 ring-red-500/30' : 'bg-[#2a2a2d]/95 text-white ring-white/10'
            }`}
          >
            <Icon name={t.icon ?? (t.tone === 'error' ? 'alert' : 'check')} size={17} />
            {t.text}
          </div>
        ))}
      </div>
      <Modal
        open={!!pending}
        onClose={() => settle(false)}
        title={pending?.title ?? ''}
        size="sm"
        history={false}
        footer={<>
          <Button variant="ghost" onClick={() => settle(false)}>Vazgeç</Button>
          <Button variant={pending?.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>{pending?.confirmLabel ?? 'Onayla'}</Button>
        </>}
      >
        {pending?.text && <p className="px-5 py-5 text-[15px] leading-relaxed text-white/70 md:px-6">{pending.text}</p>}
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('FeedbackProvider eksik');
  return ctx;
}
