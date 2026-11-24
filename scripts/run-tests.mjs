/**
 * Birim test çalıştırıcı: TypeScript testlerini esbuild ile derleyip Node'un yerleşik
 * test koşucusu (node:test) ile çalıştırır. Ek test kütüphanesi gerekmez.
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.test-build');
const dir = path.join(root, 'tests/unit');
const entries = fs.readdirSync(dir).filter((f) => f.endsWith('.test.ts')).map((f) => path.join(dir, f));

fs.rmSync(out, { recursive: true, force: true });
await build({
  entryPoints: entries,
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: out,
  outExtension: { '.js': '.mjs' },
  target: 'node20',
  define: { __APP_VERSION__: '"test"', __BUILD_TMDB_KEY__: '""' },
  logLevel: 'warning',
});

const files = fs.readdirSync(out).filter((f) => f.endsWith('.mjs')).map((f) => path.join(out, f));
const res = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...files], { stdio: 'inherit' });
process.exit(res.status ?? 1);
