/**
 * FILMHUB build script
 * --------------------
 * Tek komutla üretim derlemesi üretir:
 *   1. TypeScript/React kaynaklarını esbuild ile paketler (kod bölme + minify)
 *   2. Tailwind CSS v4 derleyicisini programatik olarak çalıştırır
 *   3. public/ klasörünü ve index.html'i dist/ içine yazar
 *
 * Kullanım:
 *   node scripts/build.mjs            → üretim derlemesi (dist/)
 *   node scripts/build.mjs --watch    → değişiklikleri izler
 *   node scripts/build.mjs --serve    → dist/ klasörünü yerelde sunar
 */
import { build, context, transform } from 'esbuild';
import { compile } from 'tailwindcss';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const args = new Set(process.argv.slice(2));
const watch = args.has('--watch');
const serve = args.has('--serve');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

/** .env dosyasını (varsa) basitçe okur. Gizli anahtarlar asla repoya girmez. */
function loadEnv() {
  const env = { ...process.env };
  const file = path.join(root, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#') && env[m[1]] === undefined) {
        env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return env;
}

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.name !== 'index.html') fs.copyFileSync(s, d);
  }
}

/** Tailwind v4'ü CLI olmadan çalıştırır: kaynaklardaki sınıf adaylarını toplar ve CSS üretir. */
async function buildCss(minify) {
  const require = createRequire(import.meta.url);
  // tailwindcss/dist/lib.js → paket kökü
  const twRoot = path.resolve(path.dirname(require.resolve('tailwindcss', { paths: [root] })), '..');
  const input = fs.readFileSync(path.join(root, 'src/styles/app.css'), 'utf8');
  const compiler = await compile(input, {
    base: path.join(root, 'src/styles'),
    loadStylesheet: async (id, base) => {
      const file = id === 'tailwindcss'
        ? path.join(twRoot, 'index.css')
        : id.startsWith('tailwindcss/')
          ? path.join(twRoot, id.slice('tailwindcss/'.length))
          : path.resolve(base, id);
      return { path: file, base: path.dirname(file), content: fs.readFileSync(file, 'utf8') };
    },
  });
  const candidates = new Set();
  for (const file of walk(path.join(root, 'src'), ['.ts', '.tsx'])) {
    const text = fs.readFileSync(file, 'utf8');
    for (const token of text.split(/[\s"'`{}$;]+/)) {
      if (token && token.length < 120) candidates.add(token);
    }
  }
  let css = compiler.build([...candidates]);
  if (minify) css = (await transform(css, { loader: 'css', minify: true })).code;
  return css;
}

function esbuildOptions(env, minify) {
  return {
    entryPoints: [path.join(root, 'src/main.tsx')],
    bundle: true,
    splitting: true,
    format: 'esm',
    outdir: path.join(dist, 'assets'),
    entryNames: '[name]-[hash]',
    chunkNames: 'chunks/[name]-[hash]',
    assetNames: 'media/[name]-[hash]',
    metafile: true,
    minify,
    sourcemap: minify ? false : 'inline',
    target: ['chrome90', 'safari15', 'firefox100', 'edge90'],
    jsx: 'automatic',
    legalComments: 'none',
    loader: { '.svg': 'file', '.png': 'file' },
    define: {
      'process.env.NODE_ENV': JSON.stringify(minify ? 'production' : 'development'),
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_TMDB_KEY__: JSON.stringify(env.FILMHUB_TMDB_KEY || ''),
    },
    logLevel: 'warning',
  };
}

function writeHtml(metafile, css) {
  const outputs = Object.entries(metafile.outputs);
  const entry = outputs.find(([, o]) => o.entryPoint && o.entryPoint.endsWith('src/main.tsx'));
  if (!entry) throw new Error('Giriş dosyası bulunamadı');
  const entryFile = path.relative(dist, entry[0]).split(path.sep).join('/');
  const cssName = `assets/app-${Buffer.from(String(css.length)).toString('hex').slice(0, 8)}.css`;
  fs.writeFileSync(path.join(dist, cssName), css);
  const template = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const html = template
    .replace('<!--STYLE-->', `<link rel="stylesheet" href="./${cssName}">`)
    .replace('<!--SCRIPT-->', `<script type="module" src="./${entryFile}"></script>`);
  fs.writeFileSync(path.join(dist, 'index.html'), html);
}

async function once() {
  const env = loadEnv();
  const started = Date.now();
  fs.rmSync(dist, { recursive: true, force: true });
  copyDir(path.join(root, 'public'), dist);
  const result = await build(esbuildOptions(env, true));
  const css = await buildCss(true);
  writeHtml(result.metafile, css);
  const size = walk(dist, ['.js', '.css']).reduce((s, f) => s + fs.statSync(f).size, 0);
  console.log(`✔ FILMHUB ${pkg.version} derlendi → dist/ (${(size / 1024).toFixed(0)} KB JS+CSS, ${Date.now() - started} ms)`);
  if (!env.FILMHUB_TMDB_KEY) console.log('ℹ FILMHUB_TMDB_KEY tanımlı değil: anahtar uygulama içinden (Ayarlar) girilecek.');
}

async function dev() {
  const env = loadEnv();
  fs.rmSync(dist, { recursive: true, force: true });
  copyDir(path.join(root, 'public'), dist);
  const ctx = await context({
    ...esbuildOptions(env, false),
    plugins: [{
      name: 'html',
      setup(b) {
        b.onEnd(async (r) => {
          if (r.errors.length) return;
          for (const f of fs.readdirSync(path.join(dist, 'assets'))) {
            if (f.endsWith('.css')) fs.rmSync(path.join(dist, 'assets', f));
          }
          writeHtml(r.metafile, await buildCss(false));
          console.log('↻ yeniden derlendi', new Date().toLocaleTimeString('tr-TR'));
        });
      },
    }],
  });
  await ctx.watch();
  if (serve) await import('./serve.mjs').then((m) => m.startServer(dist, 5173));
}

if (watch) await dev();
else {
  await once();
  if (serve) await import('./serve.mjs').then((m) => m.startServer(dist, 4173));
}
