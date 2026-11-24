/**
 * FILMHUB — Windows masaüstü kabuğu (Electron ana süreç)
 *
 * • Uygulama dosyaları özel "app://" protokolüyle sunulur: kalıcı ve güvenli bir köken (origin)
 *   sağlar; IndexedDB verileri %APPDATA%\FILMHUB altında kalıcı olarak saklanır.
 * • Dış bağlantılar her zaman varsayılan tarayıcıda açılır.
 * • Node.js erişimi kapalıdır (contextIsolation + sandbox).
 */
const { app, BrowserWindow, Menu, nativeTheme, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const APP_ORIGIN = 'app://filmhub';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

app.setAppUserModelId('com.furkan.filmhub');

// Aynı anda yalnızca bir pencere: ikinci açılışta mevcut pencere öne gelir
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#000000',
    title: 'FILMHUB',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Yeni pencere istekleri (dış bağlantılar) → sistem tarayıcısı
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Uygulama dışına yönlenmeyi engelle
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) {
      event.preventDefault();
      if (/^https:\/\//.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(`${APP_ORIGIN}/index.html`);
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  Menu.setApplicationMenu(null);

  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return new Response('Erişim engellendi', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });

  // YouTube gömülü oynatıcısı geçerli bir HTTP(S) "Referer" bekler (aksi halde oynatma hatası verir)
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/*'] },
    (details, callback) => {
      details.requestHeaders.Referer = 'https://filmhub.app/';
      callback({ requestHeaders: details.requestHeaders });
    },
  );

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
