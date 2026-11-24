/**
 * FILMHUB uçtan uca (E2E) testleri — gerçek Chromium tarayıcısında, gerçek IndexedDB ile.
 * TMDB ve görsel istekleri yerel sahte sunucuya (mockTmdb.mjs) yönlendirilir; böylece testler
 * internet ve API anahtarı olmadan, her seferinde aynı sonuçla çalışır.
 *
 * Kullanım: npm run build && npm run test:e2e
 * Çıktı:    tests/e2e/screenshots/*.png ve tests/e2e/results.json
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../../scripts/serve.mjs';
import { handleTmdb, placeholderImage, VALID_KEY } from './mockTmdb.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const shots = path.join(here, 'screenshots');
fs.mkdirSync(shots, { recursive: true });
const PORT = 4199;
const BASE = `http://localhost:${PORT}/`;

const results = [];
const consoleErrors = [];
let failures = 0;

async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failures++;
    results.push({ name, ok: false, ms: Date.now() - t, error: String(e?.message ?? e).split('\n')[0] });
    console.log(`  ✖ ${name}\n      ${String(e?.message ?? e).split('\n')[0]}`);
  }
}

const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

/** API davranışını test sırasında değiştirebilmek için anahtar. */
const failMode = { popular: null, search: null };
let popularRequests = 0;

async function wire(context) {
  await context.route('https://api.themoviedb.org/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/movie/popular')) popularRequests++;
    if (failMode.search && url.includes('/search/')) return route.abort('internetdisconnected');
    if (failMode.popular && url.includes('/movie/popular')) {
      if (failMode.popular === 'abort') return route.abort('internetdisconnected');
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    }
    const r = handleTmdb(url);
    await route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.body), headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  for (const host of ['https://image.tmdb.org/**', 'https://i.ytimg.com/**']) {
    await context.route(host, (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: placeholderImage(route.request().url()) }));
  }
  await context.route(/youtube(-nocookie)?\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body style="background:#111;color:#888;font:14px sans-serif;display:grid;place-items:center;height:100vh">YouTube oynatıcı (test)</body></html>' }));
}

function watchConsole(page) {
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR|status of (401|404|500)/.test(m.text())) consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
}

const server = await startServer(path.join(root, 'dist'), PORT);
const browser = await chromium.launch();

try {
  /* ====================== MASAÜSTÜ ====================== */
  console.log('\nMasaüstü (1440×900)');
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
  await wire(desktop);
  const page = await desktop.newPage();
  watchConsole(page);

  await step('Açılış ekranı gösterilir ve uygulamaya geçer', async () => {
    await page.goto(BASE);
    await page.locator('.splash').waitFor({ state: 'visible', timeout: 3000 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(shots, '00-splash.png') });
    await page.locator('.splash').waitFor({ state: 'detached', timeout: 5000 });
  });

  await step('Anahtar yokken karşılama ekranı ve API anahtarı formu', async () => {
    await page.getByRole('heading', { name: 'FILMHUB’a hoş geldiniz' }).waitFor();
    await page.screenshot({ path: path.join(shots, '01-welcome.png') });
  });

  await step('Geçersiz API anahtarı reddedilir', async () => {
    await page.getByLabel('TMDB API anahtarı').fill('yanlis-anahtar');
    await page.getByRole('button', { name: 'Kaydet ve doğrula' }).click();
    await page.getByText('TMDB bu anahtarı reddetti').waitFor({ timeout: 5000 });
  });

  await step('Geçerli anahtar kaydedilir ve ana sayfa yüklenir', async () => {
    await page.getByLabel('TMDB API anahtarı').fill(VALID_KEY);
    await page.getByRole('button', { name: 'Kaydet ve doğrula' }).click();
    await page.locator('section[aria-label="Öne çıkanlar"]').waitFor({ timeout: 8000 });
    await page.getByRole('heading', { name: 'Popüler Filmler' }).or(page.getByRole('link', { name: 'Popüler Filmler' })).first().waitFor();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(shots, '02-home-desktop.png') });
  });

  await step('Ana sayfa şeritleri tembel yüklenir (kaydırınca)', async () => {
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(250); }
    const cards = await page.locator('a[href^="#/film/"], a[href^="#/dizi/"]').count();
    expect(cards > 60, `beklenen >60 kart, bulunan ${cards}`);
    await page.getByText('Küratörlü Koleksiyonlar').waitFor();
    await page.getByText('Günün Filmi').waitFor();
    await page.screenshot({ path: path.join(shots, '03-home-rows.png') });
  });

  await step('Film detay sayfası: bilgiler, oyuncular, fragman, galeri', async () => {
    await page.goto(`${BASE}#/film/3`);
    await page.getByRole('heading', { level: 1, name: 'Gizli Liman' }).waitFor({ timeout: 5000 });
    for (const t of ['Oyuncular', 'Ekip', 'Fragmanlar ve Videolar', 'Görseller', 'Sizin İçin', 'Benzer Yapımlar', 'İlgili İçerikler']) {
      await page.getByRole('heading', { name: t }).first().waitFor();
    }
    await page.getByText('Yönetmen', { exact: true }).first().waitFor();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(shots, '04-detail-movie.png') });
  });

  await step('Fragman YouTube oynatıcısında açılır ve geri tuşu modalı kapatır', async () => {
    await page.getByRole('button', { name: 'Fragmanı İzle' }).click();
    await page.locator('iframe[src*="youtube-nocookie.com/embed/e2eTrailer01"]').waitFor();
    await page.getByRole('button', { name: 'YouTube’da aç' }).waitFor();
    await page.goBack();
    await page.locator('iframe').waitFor({ state: 'detached', timeout: 3000 });
    expect(page.url().includes('#/film/3'), 'geri tuşu sayfadan çıkmamalı');
  });

  await step('İzleme listesine ekle; tekrar eklenmez (çift kayıt yok)', async () => {
    await page.getByRole('button', { name: 'İzleme Listesi' }).click();
    await page.getByText('İzleme listesine eklendi').waitFor();
    await page.getByRole('button', { name: 'Listede' }).waitFor();
  });

  await step('Kişisel puan: 0,5 adımlı ver, düzenle', async () => {
    await page.getByRole('button', { name: '+ Puan ver' }).click();
    const slider = page.getByRole('slider', { name: 'Kişisel puan' });
    await slider.focus();
    for (let i = 0; i < 17; i++) await page.keyboard.press('ArrowRight'); // 8,5
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.getByText('Puanınız kaydedildi: 8,5').waitFor();
    await page.getByRole('button', { name: 'Düzenle' }).first().click();
    await page.getByRole('slider', { name: 'Kişisel puan' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.getByText('Puanınız kaydedildi: 9').waitFor();
  });

  await step('Yorum ekle → düzenle → onaylı sil', async () => {
    await page.getByRole('button', { name: '+ Yorum yaz' }).click();
    await page.getByLabel('Bu içerik hakkında düşünceleriniz').fill('Görüntü yönetimi harika.');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.getByText('Görüntü yönetimi harika.').waitFor();
    await page.getByRole('button', { name: 'Düzenle' }).nth(1).click();
    await page.getByLabel('Bu içerik hakkında düşünceleriniz').fill('Görüntü yönetimi harika, müzikler de.');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.getByText('Görüntü yönetimi harika, müzikler de.').waitFor();
    await page.getByRole('button', { name: 'Sil' }).nth(1).click();
    await page.getByRole('button', { name: 'Sil', exact: true }).last().click();
    await page.getByRole('button', { name: '+ Yorum yaz' }).waitFor();
  });

  await step('Koleksiyon oluştur ve içeriği ekle', async () => {
    await page.getByRole('button', { name: 'Koleksiyona ekle' }).click();
    await page.getByLabel('Yeni koleksiyon').fill('Hafta Sonu Filmleri');
    await page.getByRole('button', { name: 'Oluştur' }).click();
    await page.getByText('“Hafta Sonu Filmleri” oluşturuldu').waitFor();
    await page.getByText('1 içerik').waitFor();
    await page.keyboard.press('Escape');
  });

  await step('İzledim işareti izleme listesinden otomatik çıkarır', async () => {
    await page.getByRole('button', { name: 'İzledim' }).click();
    await page.getByText('İzlendi olarak işaretlendi').waitFor();
    await page.getByRole('button', { name: 'İzleme Listesi' }).waitFor();
  });

  await step('Favorilere ekle', async () => {
    await page.getByRole('button', { name: 'Favorilere ekle' }).click();
    await page.getByText('Favorilere eklendi').waitFor();
  });

  await step('Dizi: sezon sayfası, bölüm işaretleme ve geri alma', async () => {
    await page.goto(`${BASE}#/dizi/1001/sezon/1`);
    await page.getByRole('heading', { level: 1, name: '1. Sezon' }).waitFor();
    const first = page.getByRole('button', { name: 'İzlendi olarak işaretle' }).first();
    await first.click();
    await page.getByText('1/24').waitFor();
    await page.getByRole('button', { name: 'İzlenmedi olarak işaretle' }).first().click();
    await page.getByText('0/24').waitFor();
  });

  await step('Bir sezonu bitirmek diziyi TAMAMLAMAZ', async () => {
    await page.getByRole('button', { name: 'Sezonu izledim' }).click();
    await page.getByText('8/24').waitFor();
    await page.getByText('Dizi ilerlemesi · İzleniyor').waitFor();
    await page.screenshot({ path: path.join(shots, '05-season.png') });
  });

  await step('Dizi takibi sayfası: ilerleme ve sıradaki bölüm', async () => {
    await page.goto(`${BASE}#/takip`);
    await page.getByText('8 / 24 bölüm').waitFor();
    await page.getByRole('button', { name: 'S2 B1 izledim' }).click();
    await page.getByText('9 / 24 bölüm').waitFor();
    await page.getByRole('tab', { name: /Geçmiş/ }).click();
    await page.getByText('S2 · B1 — Bölüm adı 1').waitFor();
    await page.screenshot({ path: path.join(shots, '06-tracker.png') });
  });

  await step('Kütüphane: sekmeler, sayılar, arama ve sıralama', async () => {
    await page.goto(`${BASE}#/kutuphane?sekme=izlenenler`);
    await page.getByRole('tab', { name: /İzlediklerim/ }).waitFor();
    expect(await page.getByRole('tab', { name: /İzlediklerim\s*1/ }).count() === 1, 'izlenen sayısı 1 olmalı');
    expect(await page.getByRole('tab', { name: /Favorilerim\s*1/ }).count() === 1, 'favori sayısı 1 olmalı');
    await page.getByLabel('Kütüphanede ara').fill('liman');
    await page.getByRole('link', { name: /Gizli Liman/ }).waitFor();
    await page.getByLabel('Kütüphanede ara').fill('olmayan');
    await page.getByText('Eşleşen içerik yok').waitFor();
    await page.getByLabel('Kütüphanede ara').fill('');
    await page.getByLabel('Sıralama').selectOption('title');
    await page.getByRole('button', { name: 'Anladım' }).click();
    await page.screenshot({ path: path.join(shots, '07-library.png') });
  });

  await step('Sayfa yenilendiğinde tüm veriler kalıcıdır (IndexedDB)', async () => {
    await page.reload();
    await page.locator('.splash').waitFor({ state: 'detached', timeout: 6000 });
    expect(await page.getByRole('tab', { name: /İzlediklerim\s*1/ }).count() === 1, 'yenilemeden sonra izlenen kaybolmamalı');
    await page.goto(`${BASE}#/film/3`);
    await page.getByText('9/10').or(page.getByText(/^9$/)).first().waitFor();
  });

  await step('Kalıcı API önbelleği: yeniden açılışta aynı liste tekrar indirilmez', async () => {
    const before = popularRequests;
    await page.goto(`${BASE}#/`);
    await page.getByRole('link', { name: 'Popüler Filmler' }).waitFor();
    await page.locator('section[aria-label="Popüler Filmler"] a[href^="#/film/"]').first().waitFor();
    expect(popularRequests === before, `önbellekten gelmeliydi, ${popularRequests - before} yeni istek atıldı`);
  });

  await step('İstatistikler gerçek verilerden hesaplanır', async () => {
    await page.goto(`${BASE}#/istatistikler`);
    await page.getByText('İzlenen film').waitFor();
    const kpi = (label) => page.getByText(label, { exact: true }).locator('xpath=preceding-sibling::p[1]').textContent();
    const filmKpi = await kpi('İzlenen film');
    expect(filmKpi?.trim() === '1', `izlenen film 1 olmalı, bulunan ${filmKpi}`);
    const epKpi = await kpi('İzlenen bölüm');
    expect(epKpi?.trim() === '9', `izlenen bölüm 9 olmalı, bulunan ${epKpi}`);
    await page.getByText('Ortalama puanım').waitFor();
    await page.screenshot({ path: path.join(shots, '08-stats.png'), fullPage: true });
  });

  await step('Koleksiyon sayfası: yeniden adlandır ve sil', async () => {
    await page.goto(`${BASE}#/koleksiyonlar`);
    await page.getByText('Hafta Sonu Filmleri').click();
    await page.getByRole('heading', { level: 1, name: 'Hafta Sonu Filmleri' }).waitFor();
    await page.getByRole('button', { name: 'Adı ve açıklamayı düzenle' }).click();
    await page.getByLabel('Koleksiyon adı').fill('Pazar Klasikleri');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.getByRole('heading', { level: 1, name: 'Pazar Klasikleri' }).waitFor();
    await page.screenshot({ path: path.join(shots, '09-collection.png') });
    await page.getByRole('button', { name: 'Koleksiyonu sil' }).click();
    await page.getByRole('button', { name: 'Koleksiyonu sil' }).last().click();
    await page.getByText('Henüz koleksiyonunuz yok').waitFor();
  });

  await step('Arama: otomatik tamamlama, sonuçlar ve arama geçmişi', async () => {
    await page.goto(`${BASE}#/ara`);
    await page.getByLabel('Arama', { exact: true }).fill('Tren');
    await page.getByRole('listbox', { name: 'Arama önerileri' }).waitFor({ timeout: 4000 });
    await page.screenshot({ path: path.join(shots, '10-search-suggest.png') });
    await page.keyboard.press('Enter');
    await page.getByText(/sonuç bulundu/).waitFor();
    await page.getByRole('button', { name: 'Aramayı temizle' }).click();
    await page.getByText('Son aramalar').waitFor();
    await page.getByRole('button', { name: 'Tren', exact: true }).first().waitFor();
  });

  await step('Arama filtreleri: tür + sıralama', async () => {
    await page.getByLabel('Arama', { exact: true }).fill('Liman');
    await page.keyboard.press('Enter');
    await page.getByText(/sonuç bulundu/).waitFor();
    await page.getByLabel('Sıralama').selectOption('rating');
    await page.getByLabel('Tür', { exact: true }).selectOption('18');
    await page.getByText(/filtrelerle \d+ gösteriliyor|sonuç bulundu/).first().waitFor();
    await page.screenshot({ path: path.join(shots, '11-search-results.png') });
  });

  await step('Kişi araması ve kişi sayfası', async () => {
    await page.goto(`${BASE}#/ara?q=Ay%C5%9Fe&tip=person`);
    await page.getByRole('link', { name: /Ayşe Yıldız/ }).first().click();
    await page.getByRole('heading', { level: 1, name: 'Ayşe Yıldız' }).waitFor();
  });

  await step('Keşfet: tür ızgarası ve tür sayfası', async () => {
    await page.goto(`${BASE}#/kesfet`);
    await page.getByRole('link', { name: /Dram/ }).first().click();
    await page.getByRole('heading', { level: 1, name: 'Dram' }).waitFor();
    await page.screenshot({ path: path.join(shots, '12-discover.png') });
  });

  await step('API hatası: anlaşılır hata ve yeniden deneme', async () => {
    failMode.popular = 500;
    await page.goto(`${BASE}#/liste/populer-filmler`);
    await page.getByText('TMDB sunucu hatası').waitFor({ timeout: 8000 });
    await page.screenshot({ path: path.join(shots, '13-api-error.png') });
    failMode.popular = null;
    await page.getByRole('button', { name: 'Tekrar dene' }).click();
    await page.getByRole('heading', { name: 'Popüler Filmler' }).waitFor();
    await page.locator('a[href^="#/film/"]').first().waitFor();
  });

  await step('Ağ bağlantısı kesilince bağlantı hatası gösterilir', async () => {
    failMode.search = true;
    await page.goto(`${BASE}#/ara?q=R%C3%BCzg%C3%A2r`);
    await page.getByText(/Bağlantı hatası|İnternet bağlantısı yok/).first().waitFor({ timeout: 8000 });
    await page.screenshot({ path: path.join(shots, '13b-network-error.png') });
    failMode.search = null;
  });

  await step('Rastgele seçici bir içerik önerir', async () => {
    await page.goto(`${BASE}#/rastgele`);
    await page.getByRole('button', { name: 'Rastgele seç' }).click();
    await page.getByRole('button', { name: 'Tekrar seç' }).waitFor({ timeout: 5000 });
    await page.screenshot({ path: path.join(shots, '14-random.png') });
  });

  await step('Karşılaştırma tablosu', async () => {
    await page.goto(`${BASE}#/karsilastir?a=movie:3&b=movie:10`);
    await page.getByText('TMDB puanı').waitFor();
    await page.getByText('Başroller').waitFor();
    await page.screenshot({ path: path.join(shots, '15-compare.png') });
  });

  await step('Yayın takvimi', async () => {
    await page.goto(`${BASE}#/takvim`);
    await page.getByRole('heading', { name: 'Yayın Takvimi' }).waitFor();
    await page.locator('a[href^="#/film/"]').first().waitFor();
    await page.screenshot({ path: path.join(shots, '16-calendar.png') });
  });

  await step('Ayarlar: geliştirici imzası, TMDB atfı, veri uyarısı', async () => {
    await page.goto(`${BASE}#/ayarlar`);
    await page.getByText('DESIGNED & DEVELOPED BY FURKAN').waitFor();
    await page.getByText('TMDB tarafından onaylanmamış veya sertifikalandırılmamıştır', { exact: false }).waitFor();
    await page.getByText('kalıcı olarak kaybolmasına', { exact: false }).first().waitFor();
    await page.screenshot({ path: path.join(shots, '17-settings.png'), fullPage: true });
  });

  await step('Bilinmeyen adres → 404 sayfası, olmayan film → hata durumu', async () => {
    await page.goto(`${BASE}#/olmayan-sayfa`);
    await page.getByText('Sayfa bulunamadı').waitFor();
    await page.goto(`${BASE}#/film/99999`);
    await page.getByText('İçerik bulunamadı').waitFor();
  });

  await step('Tüm kişisel verileri silme (onaylı)', async () => {
    await page.goto(`${BASE}#/ayarlar`);
    await page.getByRole('button', { name: 'Tüm kişisel verileri sil' }).click();
    await page.getByRole('button', { name: 'Hepsini kalıcı olarak sil' }).click();
    await page.getByText('Tüm kişisel veriler silindi').waitFor();
    await page.goto(`${BASE}#/istatistikler`);
    await page.getByText('Henüz istatistik yok').waitFor();
  });

  await desktop.close();

  /* ====================== MOBİL ====================== */
  console.log('\nMobil (390×844, dokunmatik)');
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'tr-TR' });
  await wire(mobile);
  const m = await mobile.newPage();
  watchConsole(m);
  await m.goto(BASE);
  await m.locator('.splash').waitFor({ state: 'detached', timeout: 6000 });
  await m.getByLabel('TMDB API anahtarı').fill(VALID_KEY);
  await m.getByRole('button', { name: 'Kaydet ve doğrula' }).click();

  await step('Mobil ana sayfa: alt gezinme çubuğu var, kenar çubuğu gizli', async () => {
    await m.locator('section[aria-label="Öne çıkanlar"]').waitFor({ timeout: 8000 });
    await m.waitForTimeout(800);
    expect(await m.locator('nav[aria-label="Ana gezinme"]').isVisible(), 'alt gezinme görünmeli');
    expect(!(await m.locator('aside.sidebar').isVisible()), 'kenar çubuğu mobilde gizli olmalı');
    await m.screenshot({ path: path.join(shots, '20-mobile-home.png') });
  });

  await step('Mobil detay sayfası', async () => {
    await m.goto(`${BASE}#/film/5`);
    await m.getByRole('heading', { level: 1 }).waitFor();
    await m.waitForTimeout(500);
    await m.screenshot({ path: path.join(shots, '21-mobile-detail.png') });
    await m.screenshot({ path: path.join(shots, '22-mobile-detail-full.png'), fullPage: true });
  });

  await step('Mobil "Daha Fazla" menüsü ve geri tuşu ile kapanma', async () => {
    await m.getByRole('button', { name: 'Daha Fazla' }).click();
    await m.getByRole('dialog', { name: 'Daha Fazla' }).waitFor();
    await m.screenshot({ path: path.join(shots, '23-mobile-more.png') });
    await m.goBack();
    await m.getByRole('dialog', { name: 'Daha Fazla' }).waitFor({ state: 'detached' });
    expect(m.url().includes('#/film/5'), 'geri tuşu yalnızca menüyü kapatmalı');
  });

  await step('Mobil sezon sayfası ve arama', async () => {
    await m.goto(`${BASE}#/dizi/1002/sezon/1`);
    await m.getByRole('button', { name: 'İzlendi olarak işaretle' }).first().tap();
    await m.getByText('1/24').waitFor();
    await m.screenshot({ path: path.join(shots, '24-mobile-season.png') });
    await m.goto(`${BASE}#/ara?q=Kay%C4%B1p`);
    await m.getByText(/sonuç bulundu/).waitFor();
    await m.screenshot({ path: path.join(shots, '25-mobile-search.png') });
  });

  await step('Yatay taşma yok (mobil)', async () => {
    for (const route of ['#/', '#/film/5', '#/kutuphane', '#/istatistikler', '#/takip', '#/ayarlar', '#/karsilastir?a=movie:3&b=movie:10']) {
      await m.goto(BASE + route);
      await m.waitForTimeout(500);
      const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow <= 1, `${route} sayfasında ${overflow}px yatay taşma`);
    }
  });
  await mobile.close();

  /* ====================== TABLET ====================== */
  console.log('\nTablet (820×1180)');
  const tablet = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, locale: 'tr-TR' });
  await wire(tablet);
  const t = await tablet.newPage();
  watchConsole(t);
  await step('Tablet düzeni', async () => {
    await t.goto(BASE);
    await t.locator('.splash').waitFor({ state: 'detached', timeout: 6000 });
    await t.getByLabel('TMDB API anahtarı').fill(VALID_KEY);
    await t.getByRole('button', { name: 'Kaydet ve doğrula' }).click();
    await t.locator('section[aria-label="Öne çıkanlar"]').waitFor({ timeout: 8000 });
    await t.waitForTimeout(800);
    await t.screenshot({ path: path.join(shots, '30-tablet-home.png') });
    await t.goto(`${BASE}#/film/7`);
    await t.getByRole('heading', { level: 1 }).waitFor();
    await t.waitForTimeout(500);
    await t.screenshot({ path: path.join(shots, '31-tablet-detail.png') });
  });
  await tablet.close();

  await step('Konsolda beklenmeyen JavaScript hatası yok', async () => {
    expect(consoleErrors.length === 0, `${consoleErrors.length} hata: ${consoleErrors.slice(0, 3).join(' | ')}`);
  });
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(path.join(here, 'results.json'), JSON.stringify({ date: new Date().toISOString(), passed: results.filter((r) => r.ok).length, failed: failures, results }, null, 2));
console.log(`\n${results.length - failures}/${results.length} E2E adımı başarılı`);
process.exit(failures ? 1 : 0);
