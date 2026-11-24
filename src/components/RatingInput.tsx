import { useState, type KeyboardEvent } from 'react';
import { fmt } from '../utils/format';

/**
 * 0–10 arası, 0,5 adımlı kişisel puan girişi.
 * 10 adet yuvarlak dilim; her dilimin sol yarısı yarım puanı temsil eder.
 * Fare, dokunma ve klavye (←/→) ile kullanılabilir.
 */
export function RatingInput({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  const pick = (e: { clientX: number; currentTarget: Element }, i: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const half = e.clientX - rect.left < rect.width / 2;
    return half ? i + 0.5 : i + 1;
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = value ?? 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(10, v + 0.5)); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(0, v - 0.5)); }
    if (e.key === 'Home') onChange(0);
    if (e.key === 'End') onChange(10);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <span className="text-[56px] font-bold leading-none tabular-nums tracking-tight text-white">{fmt.personalRating(shown)}</span>
        <span className="ml-1 text-xl font-medium text-white/35">/10</span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Kişisel puan"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value ?? 0}
        aria-valuetext={`${fmt.personalRating(value ?? 0)} / 10`}
        onKeyDown={onKey}
        onPointerLeave={() => setHover(null)}
        className="flex gap-1 rounded-full p-1 outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:gap-1.5"
      >
        {Array.from({ length: 10 }, (_, i) => {
          const fill = Math.max(0, Math.min(1, shown - i));
          return (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onPointerMove={(e) => setHover(pick(e, i))}
              onClick={(e) => onChange(pick(e, i))}
              className="relative h-9 w-[26px] overflow-hidden rounded-[9px] bg-white/[0.08] transition-transform active:scale-90 sm:h-10 sm:w-[30px]"
            >
              <span className="absolute inset-y-0 left-0 bg-white transition-[width] duration-150" style={{ width: `${fill * 100}%` }} />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold mix-blend-difference text-white/70">{i + 1}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-white/40">Yarım puan için dilimin soluna dokunun · Klavyede ← →</p>
    </div>
  );
}
