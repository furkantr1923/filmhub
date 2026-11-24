import { useState, type ReactNode } from 'react';
import { Link, navigate, useLocation } from '../router/router';
import { Icon, Logo, type IconName } from './Icon';
import { Modal } from './ui';

interface NavItem { to: string; label: string; icon: IconName; match: RegExp }

const PRIMARY: NavItem[] = [
  { to: '/', label: 'Ana Sayfa', icon: 'home', match: /^\/$/ },
  { to: '/kesfet', label: 'Keşfet', icon: 'compass', match: /^\/kesfet/ },
  { to: '/ara', label: 'Ara', icon: 'search', match: /^\/ara/ },
  { to: '/takvim', label: 'Takvim', icon: 'calendar', match: /^\/takvim/ },
];

const LIBRARY: NavItem[] = [
  { to: '/kutuphane', label: 'Kütüphanem', icon: 'library', match: /^\/kutuphane/ },
  { to: '/takip', label: 'Dizi Takibi', icon: 'tv', match: /^\/takip/ },
  { to: '/koleksiyonlar', label: 'Koleksiyonlar', icon: 'collection', match: /^\/koleksiyon/ },
  { to: '/istatistikler', label: 'İstatistikler', icon: 'chart', match: /^\/istatistikler/ },
];

const TOOLS: NavItem[] = [
  { to: '/rastgele', label: 'Rastgele Seçici', icon: 'shuffle', match: /^\/rastgele/ },
  { to: '/karsilastir', label: 'Karşılaştır', icon: 'compare', match: /^\/karsilastir/ },
];

const SETTINGS: NavItem = { to: '/ayarlar', label: 'Ayarlar', icon: 'settings', match: /^\/ayarlar/ };

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors ${
        active ? 'bg-white/[0.1] text-white' : 'text-white/55 hover:bg-white/[0.05] hover:text-white'
      }`}
    >
      <Icon name={item.icon} size={19} className={active ? 'text-white' : 'text-white/50'} />
      {item.label}
    </Link>
  );
}

function Sidebar({ path }: { path: string }) {
  const group = (title: string, items: NavItem[]) => (
    <div className="mt-7">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">{title}</p>
      <nav className="flex flex-col gap-0.5">{items.map((i) => <SideLink key={i.to} item={i} active={i.match.test(path)} />)}</nav>
    </div>
  );
  return (
    <aside className="sidebar fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/[0.06] bg-[#0a0a0b]/95 px-4 pb-5 pt-6 backdrop-blur-2xl lg:flex">
      <Link to="/" className="mb-3 px-3" ariaLabel="FILMHUB ana sayfa"><Logo size={30} /></Link>
      <div className="no-scrollbar flex-1 overflow-y-auto">
        <nav className="mt-6 flex flex-col gap-0.5">{PRIMARY.map((i) => <SideLink key={i.to} item={i} active={i.match.test(path)} />)}</nav>
        {group('Kütüphane', LIBRARY)}
        {group('Araçlar', TOOLS)}
      </div>
      <div className="border-t border-white/[0.06] pt-3">
        <SideLink item={SETTINGS} active={SETTINGS.match.test(path)} />
      </div>
    </aside>
  );
}

const BOTTOM: NavItem[] = [
  PRIMARY[0]!,
  PRIMARY[1]!,
  PRIMARY[2]!,
  LIBRARY[0]!,
];

function BottomNav({ path }: { path: string }) {
  const [more, setMore] = useState(false);
  const moreItems = [PRIMARY[3]!, ...LIBRARY.slice(1), ...TOOLS, SETTINGS];
  const moreActive = moreItems.some((i) => i.match.test(path));
  return (
    <>
      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0b0b0c]/[0.97] backdrop-blur-2xl lg:hidden" aria-label="Ana gezinme">
        <div className="mx-auto flex max-w-xl items-stretch justify-around">
          {BOTTOM.map((i) => {
            const active = i.match.test(path);
            return (
              <Link key={i.to} to={i.to} className={`flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2.5 text-[10.5px] font-medium transition-colors ${active ? 'text-white' : 'text-white/45'}`}>
                <Icon name={i.icon} size={23} strokeWidth={active ? 2.1 : 1.75} />
                {i.label === 'Kütüphanem' ? 'Kütüphane' : i.label}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMore(true)} className={`flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2.5 text-[10.5px] font-medium ${moreActive ? 'text-white' : 'text-white/45'}`}>
            <Icon name="grid" size={23} />
            Daha Fazla
          </button>
        </div>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="Daha Fazla" size="sm">
        <div className="grid grid-cols-3 gap-2 p-4">
          {moreItems.map((i) => (
            <button
              key={i.to}
              type="button"
              onClick={() => {
                setMore(false);
                // Modal geçmiş kaydı kapandıktan sonra yönlendir
                setTimeout(() => navigate(i.to), 60);
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-[12px] font-medium transition-colors ${i.match.test(path) ? 'bg-white text-black' : 'bg-white/[0.06] text-white/80 hover:bg-white/[0.1]'}`}
            >
              <Icon name={i.icon} size={24} />
              <span className="text-center leading-tight">{i.label}</span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}

function MobileTopBar() {
  return (
    <header className="mobile-top fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/50 to-transparent px-4 pb-6 lg:hidden">
      <Link to="/" ariaLabel="FILMHUB ana sayfa"><Logo size={26} /></Link>
      <Link to="/ara" ariaLabel="Ara" className="flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl">
        <Icon name="search" size={19} />
      </Link>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useLocation();
  return (
    <div className="min-h-dvh bg-black text-white">
      <Sidebar path={path} />
      <MobileTopBar />
      <main id="main-scroll" className="app-main lg:pl-[248px]">{children}</main>
      <BottomNav path={path} />
    </div>
  );
}

/** Sayfa içeriği için standart kenar boşlukları. */
export function Page({ children, className = '', flush }: { children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <div className={`page-enter mx-auto w-full max-w-[1680px] ${flush ? '' : 'page-pad px-4 md:px-8 xl:px-12'} ${className}`}>
      {children}
    </div>
  );
}
