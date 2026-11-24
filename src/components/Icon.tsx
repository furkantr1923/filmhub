/**
 * FILMHUB için çizilmiş tutarlı, ince çizgili ikon seti (24×24, 1.75 kalınlık).
 * Harici ikon kütüphanesi kullanılmaz; paket boyutu küçük kalır.
 */
const PATHS = {
  home: 'M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4.25v-5.25h-5.5v5.25H5A1.5 1.5 0 0 1 3.5 19z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5z',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.3-2.2L21 21',
  library: 'M4 4.5h3.5v15H4zM10 4.5h3.5v15H10zM16 5.5l3.3-.9 3.2 14.5-3.3.8z',
  tv: 'M3.5 6.5h17a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1ZM8 2.5l4 4 4-4M8 21.5h8',
  collection: 'M4 7.5h16v12H4zM6.5 4.5h11M9 2.5h6',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4',
  shuffle: 'M3 7h3.5c4 0 6 10 10 10H21m0 0-3-3m3 3-3 3M3 17h3.5c1.4 0 2.6-1.2 3.6-3M21 7h-4.5c-1.4 0-2.6 1.2-3.6 3M21 7l-3-3m3 3-3 3',
  compare: 'M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M12 2v20',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-1.6.9 1.6-1.9 3.3-1.8-.3a7.6 7.6 0 0 1-1.7 1L14.3 21h-4.6l-.6-2a7.6 7.6 0 0 1-1.7-1l-1.8.3L3.7 15l.9-1.6a7.8 7.8 0 0 1 0-2.8L3.7 9l1.9-3.3 1.8.3a7.6 7.6 0 0 1 1.7-1l.6-2h4.6l.6 2c.6.3 1.2.6 1.7 1l1.8-.3L20.3 9l-.9 1.6c.2.9.2 1.9 0 2.8Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  play: 'M7 4.5v15l12.5-7.5z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 10 17.5 19.5 7',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z',
  star: 'm12 3.5 2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.8l-5.4 2.9 1.2-5.9-4.4-4.1 6-.7z',
  bookmark: 'M6.5 3.5h11V21L12 17l-5.5 4z',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  close: 'M6 6l12 12M18 6 6 18',
  trash: 'M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5a7.5 7.5 0 0 1 15 0',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z',
  filter: 'M3.5 5h17l-6.5 8v6l-4 1.5V13z',
  sort: 'M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4m-3.5 3.5L17 4l3.5 3.5',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  wifiOff: 'M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.3-2.5M14.8 10.4A10 10 0 0 1 19 12.9M2 9.4a15 15 0 0 1 4.3-2.8M11 5.6A15 15 0 0 1 22 9.4M12 20h.01',
  key: 'M14.5 10a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM13.5 13l7 7M17.5 17l2-2',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.5h.01',
  alert: 'M12 4 2.5 20h19zM12 10v4.5M12 17.5h.01',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2 2.2.8-2.2.8L19 22l-.8-2.2-2.2-.8 2.2-.8z',
  layers: 'M12 3 2.5 8 12 13l9.5-5zM2.5 12 12 17l9.5-5M2.5 16 12 21l9.5-5',
  history: 'M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4.5H8M12 7.5V12l3 2',
  note: 'M5 3.5h10l4 4V20.5H5zM15 3.5v4h4M8.5 12h7M8.5 16h5',
  image: 'M3.5 5h17v14h-17zM3.5 16l5-5 4 4 3-3 5 5M15.5 9.5h.01',
  video: 'M3 6.5h12.5v11H3zM15.5 10.5 21 7v10l-5.5-3.5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className = '', filled = false, strokeWidth = 1.75 }: {
  name: IconName;
  size?: number;
  className?: string;
  filled?: boolean;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** FILMHUB logosu: film şeridi çerçevesi içinde oynat sembolü + yazı. */
export function Logo({ size = 28, withText = true, className = '' }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {withText && (
        <span className="font-semibold tracking-[0.18em] text-white" style={{ fontSize: size * 0.58 }}>
          FILM<span className="text-white/55">HUB</span>
        </span>
      )}
    </span>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="fh-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2a2e" />
          <stop offset="1" stopColor="#0c0c0e" />
        </linearGradient>
        <linearGradient id="fh-p" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9c9cf" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#fh-g)" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" />
      <g fill="rgba(255,255,255,.22)">
        <rect x="9" y="12" width="4" height="5" rx="1.2" /><rect x="9" y="22" width="4" height="5" rx="1.2" />
        <rect x="9" y="32" width="4" height="5" rx="1.2" /><rect x="9" y="42" width="4" height="5" rx="1.2" />
        <rect x="51" y="12" width="4" height="5" rx="1.2" /><rect x="51" y="22" width="4" height="5" rx="1.2" />
        <rect x="51" y="32" width="4" height="5" rx="1.2" /><rect x="51" y="42" width="4" height="5" rx="1.2" />
      </g>
      <path d="M26 20.5v23l18-11.5z" fill="url(#fh-p)" />
    </svg>
  );
}
