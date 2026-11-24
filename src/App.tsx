import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType } from 'react';
import { setUserApiKey } from './api/config';
import { pruneApiCache } from './api/tmdb';
import { AppShell } from './components/Layout';
import { ErrorBoundary, Splash } from './components/System';
import { FeedbackProvider, Spinner } from './components/ui';
import { initStorage } from './db';
import { preferencesRepository } from './repositories/preferencesRepository';
import { matchRoute, useLocation, useScrollReset } from './router/router';
import { LibraryProvider } from './services/library';

/* Sayfalar ihtiyaç anında yüklenir (kod bölme): ilk açılış paketi küçük kalır. */
const page = lazy;
const Home = page(() => import('./pages/Home'));
const Detail = page(() => import('./pages/Detail'));
const Season = page(() => import('./pages/Season'));
const Search = page(() => import('./pages/Search'));
const Discover = page(() => import('./pages/Discover'));
const ListPage = page(() => import('./pages/ListPage'));
const Person = page(() => import('./pages/Person'));
const Library = page(() => import('./pages/Library'));
const Tracker = page(() => import('./pages/Tracker'));
const Collections = page(() => import('./pages/Collections'));
const CollectionDetail = page(() => import('./pages/CollectionDetail'));
const Stats = page(() => import('./pages/Stats'));
const RandomPicker = page(() => import('./pages/RandomPicker'));
const Compare = page(() => import('./pages/Compare'));
const Calendar = page(() => import('./pages/Calendar'));
const Settings = page(() => import('./pages/Settings'));
const NotFound = page(() => import('./pages/NotFound'));

type RouteComponent = ComponentType<{ params: Record<string, string> }>;

const ROUTES: [string, RouteComponent][] = [
  ['/', Home as RouteComponent],
  ['/film/:id', Detail as RouteComponent],
  ['/dizi/:id', Detail as RouteComponent],
  ['/dizi/:id/sezon/:season', Season as RouteComponent],
  ['/ara', Search as RouteComponent],
  ['/kesfet', Discover as RouteComponent],
  ['/kesfet/:type/:genre', Discover as RouteComponent],
  ['/liste/:slug', ListPage as RouteComponent],
  ['/kisi/:id', Person as RouteComponent],
  ['/kutuphane', Library as RouteComponent],
  ['/takip', Tracker as RouteComponent],
  ['/koleksiyonlar', Collections as RouteComponent],
  ['/koleksiyon/:id', CollectionDetail as RouteComponent],
  ['/istatistikler', Stats as RouteComponent],
  ['/rastgele', RandomPicker as RouteComponent],
  ['/karsilastir', Compare as RouteComponent],
  ['/takvim', Calendar as RouteComponent],
  ['/ayarlar', Settings as RouteComponent],
];

function Routes() {
  const { path } = useLocation();
  useScrollReset(path);
  let Comp: RouteComponent = NotFound as RouteComponent;
  let params: Record<string, string> = {};
  for (const [pattern, c] of ROUTES) {
    const m = matchRoute(pattern, path);
    if (m) {
      Comp = c;
      params = { ...m, kind: path.startsWith('/film') ? 'movie' : path.startsWith('/dizi') ? 'tv' : '' };
      break;
    }
  }
  return (
    <ErrorBoundary resetKey={path}>
      <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center"><Spinner size={28} /></div>}>
        <Comp key={path} params={params} />
      </Suspense>
    </ErrorBoundary>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boot = useCallback(async () => {
    setError(null);
    try {
      await initStorage();
      setUserApiKey((await preferencesRepository.get<string>('tmdbApiKey')) ?? null);
      pruneApiCache().catch(() => undefined);
      setReady(true);
    } catch (e) {
      console.error(e);
      setError('Yerel veritabanı açılamadı. Uygulamayı kapatıp yeniden açmayı deneyin; tarayıcıda gizli modda kişisel veriler saklanamayabilir.');
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  return (
    <>
      {ready && (
        <FeedbackProvider>
          <LibraryProvider>
            <AppShell>
              <Routes />
            </AppShell>
          </LibraryProvider>
        </FeedbackProvider>
      )}
      <Splash ready={ready} error={error} onRetry={boot} />
    </>
  );
}
