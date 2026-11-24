import { useEffect, useRef, useState } from 'react';
import type { Slice } from '../services/stats';
import { fmt } from '../utils/format';

/**
 * Bağımlılıksız, erişilebilir SVG grafikleri.
 * Tek renk tonu + parlaklık farkı kullanılır (sakin, premium görünüm); her grafik
 * ekran okuyucular için bir veri tablosuyla birlikte gelir.
 */
const PALETTE = ['#f5f5f7', '#c7c7cc', '#a1a1a6', '#8e8e93', '#6e6e73', '#56565b', '#48484a', '#3a3a3c'];

function SrTable({ data, label }: { data: Slice[]; label: string }) {
  return (
    <table className="sr-only">
      <caption>{label}</caption>
      <tbody>{data.map((d) => <tr key={d.label}><th>{d.label}</th><td>{d.value}</td></tr>)}</tbody>
    </table>
  );
}

export function BarChart({ data, label, height = 180, highlightLast }: { data: Slice[]; label: string; height?: number; highlightLast?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1]!;
  return (
    <figure className="w-full" aria-label={label}>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex flex-col justify-between pb-6">
          {[...ticks].reverse().map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="w-6 text-right text-[10px] tabular-nums text-white/30">{t}</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 left-8 flex items-end justify-around gap-[3%] pb-6">
          {data.map((d, i) => {
            const h = (d.value / top) * 100;
            const active = hover === i || (hover === null && highlightLast && i === data.length - 1);
            return (
              <div key={d.label} className="relative mx-auto flex h-full w-full max-w-[64px] flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                {hover === i && (
                  <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-black shadow-xl">
                    {d.label}: {fmt.number(d.value)}
                  </div>
                )}
                <div
                  className={`w-full rounded-t-[5px] transition-all duration-500 ${active ? 'bg-white' : 'bg-white/25'}`}
                  style={{ height: `${d.value ? Math.max(h, 2) : 0}%` }}
                />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/40">{d.label.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      </div>
      <SrTable data={data} label={label} />
    </figure>
  );
}

function niceTicks(max: number): number[] {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : Math.ceil(max / 4 / 5) * 5;
  const out: number[] = [];
  for (let v = 0; v <= max + step - 1; v += step) out.push(v);
  if (out[out.length - 1]! < max) out.push(out[out.length - 1]! + step);
  return out;
}

export function DonutChart({ data, label, centerLabel }: { data: Slice[]; label: string; centerLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((n, d) => n + d.value, 0);
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const active = hover !== null ? data[hover] : null;
  return (
    <figure className="flex flex-col items-center gap-6 sm:flex-row sm:items-center" aria-label={label}>
      <div className="relative size-[180px] shrink-0">
        <svg viewBox="0 0 180 180" className="size-full -rotate-90">
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="22" />
          {data.map((d, i) => {
            const len = total ? (d.value / total) * c : 0;
            const seg = (
              <circle
                key={d.label}
                cx="90" cy="90" r={r} fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={hover === i ? 26 : 22}
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                strokeDashoffset={-offset}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[26px] font-bold tabular-nums text-white">{active ? active.value : total}</span>
          <span className="max-w-[100px] truncate text-[11px] text-white/45">{active ? active.label : centerLabel}</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-2 text-[13px] min-[420px]:grid-cols-2 sm:grid-cols-1 xl:grid-cols-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2.5" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 truncate text-white/75">{d.label}</span>
            <span className="tabular-nums text-white/45">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
      <SrTable data={data} label={label} />
    </figure>
  );
}

export function HBarList({ data, label }: { data: Slice[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure aria-label={label}>
      <ul className="space-y-3">
        {data.map((d) => (
          <li key={d.label}>
            <div className="mb-1.5 flex justify-between text-[13px]">
              <span className="truncate text-white/80">{d.label}</span>
              <span className="tabular-nums text-white/45">{fmt.number(d.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-white/70 transition-[width] duration-700" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <SrTable data={data} label={label} />
    </figure>
  );
}

/** Son 52 haftalık izleme etkinliği (GitHub tarzı ısı haritası). */
export function ActivityHeatmap({ activity, now = new Date() }: { activity: Map<string, number>; now?: Date }) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 7 * 52 - ((end.getDay() + 6) % 7));
  const days: { key: string; date: Date; value: number }[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ key, date: new Date(d), value: activity.get(key) ?? 0 });
  }
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const level = (v: number) => (v === 0 ? 'bg-white/[0.05]' : v === 1 ? 'bg-white/25' : v <= 3 ? 'bg-white/50' : v <= 6 ? 'bg-white/75' : 'bg-white');
  const total = days.reduce((n, d) => n + d.value, 0);
  const scroller = useRef<HTMLDivElement>(null);
  // En güncel haftalar sağda: dar ekranlarda başlangıçta sona kaydır
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  return (
    <figure aria-label={`Son bir yılda ${total} izleme etkinliği`}>
      <div ref={scroller} className="no-scrollbar overflow-x-auto pb-1">
        <div className="flex w-max gap-[3px]">
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {w.map((d) => (
                <div key={d.key} title={`${fmt.dateShort(d.date)}: ${d.value} izleme`} className={`size-[11px] rounded-[3px] ${level(d.value)}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 flex items-center justify-between text-[11px] text-white/35">
        <span>Son 12 ayda {fmt.number(total)} izleme</span>
        <span className="flex items-center gap-1">Az
          {[0, 1, 2, 5, 8].map((v) => <span key={v} className={`size-[10px] rounded-[3px] ${level(v)}`} />)}
          Çok
        </span>
      </figcaption>
    </figure>
  );
}
