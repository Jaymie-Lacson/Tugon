import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const swPath = join(__dirname, '..', 'dist', 'sw.js');

if (!existsSync(swPath)) {
  console.error('stamp-sw: dist/sw.js missing — run `vite build` first');
  process.exit(1);
}

const buildId = process.env.STAMP_SW_BUILD_ID || String(Date.now());
const original = readFileSync(swPath, 'utf-8');

if (!original.includes('__BUILD_ID__')) {
  console.warn('stamp-sw: no __BUILD_ID__ placeholder found in dist/sw.js — skipping');
  process.exit(0);
}

const stamped = original.replaceAll('__BUILD_ID__', buildId);
writeFileSync(swPath, stamped, 'utf-8');
console.log(`stamp-sw: cache name pinned to tugon-static-${buildId}`);
