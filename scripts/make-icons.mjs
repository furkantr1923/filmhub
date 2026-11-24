/**
 * Uygulama ikonlarını ve Android açılış görselini tek bir SVG kaynağından üretir.
 * Kaynak: public/icons/icon.svg  →  PNG çıktıları (Chromium ile render edilir)
 * Kullanım: node scripts/make-icons.mjs   (playwright gerektirir; çıktılar repoda tutulur)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = fs.readFileSync(path.join(root, 'public/icons/icon.svg'), 'utf8');
const mark = svg.replace('<svg ', '<svg width="100%" height="100%" ');

const jobs = [
  { out: 'public/icons/icon-192.png', size: 192, transparent: true, html: `<div style="width:192px;height:192px">${mark}</div>` },
  { out: 'public/icons/icon-512.png', size: 512, transparent: true, html: `<div style="width:512px;height:512px">${mark}</div>` },
  { out: 'build/icon.png', size: 1024, transparent: true, html: `<div style="width:1024px;height:1024px">${mark}</div>` },
  { out: 'resources/android/icon.png', size: 1024, transparent: true, html: `<div style="width:1024px;height:1024px">${mark}</div>` },
  // Uyarlanabilir (adaptive) ikon ön katmanı: güvenli alan için %62 ölçek, şeffaf zemin
  { out: 'resources/android/icon-foreground.png', size: 1024, transparent: true,
    html: `<div style="width:1024px;height:1024px;display:grid;place-items:center"><div style="width:635px;height:635px">${mark}</div></div>` },
  { out: 'resources/android/splash.png', size: 2048,
    html: `<div style="width:2048px;height:2048px;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:70px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <div style="width:330px;height:330px">${mark}</div>
      <div style="color:#fff;font-size:104px;font-weight:600;letter-spacing:.42em;padding-left:.42em">FILM<span style="color:rgba(255,255,255,.5)">HUB</span></div></div>` },
];

const browser = await chromium.launch();
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.size, height: j.size } });
  await page.setContent(`<html><body style="margin:0;background:${j.transparent ? 'transparent' : '#000'}">${j.html}</body></html>`);
  fs.mkdirSync(path.dirname(path.join(root, j.out)), { recursive: true });
  await page.screenshot({ path: path.join(root, j.out), omitBackground: !!j.transparent });
  await page.close();
  console.log('✔', j.out);
}
await browser.close();
