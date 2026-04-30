import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, '..', 'dist');

const ROUTES = ['/', '/privacy', '/auth/login', '/community-map'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function safeJoin(base, target) {
  const resolved = normalize(join(base, target));
  if (!resolved.startsWith(base)) return join(base, 'index.html');
  return resolved;
}

function startServer(port) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      // Mimic Vercel: filesystem-first, with clean-url folders.
      const candidates = [
        safeJoin(dist, url),
        safeJoin(dist, join(url, 'index.html')),
        join(dist, 'index.html'),
      ];
      let filePath = join(dist, 'index.html');
      for (const c of candidates) {
        try {
          if (existsSync(c) && statSync(c).isFile()) {
            filePath = c;
            break;
          }
        } catch {
          // ignore and continue
        }
      }
      const ext = extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(readFileSync(filePath));
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const port = 4500 + Math.floor(Math.random() * 200);
  const server = await startServer(port);
  console.log(`verify-hydration: serving dist/ on http://127.0.0.1:${port}`);

  const browser = await chromium.launch();
  let exitCode = 0;

  for (const route of ROUTES) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    const warnings = [];

    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') errors.push(`console.error: ${text}`);
      else if (msg.type() === 'warning' && /hydrat/i.test(text)) warnings.push(text);
    });

    await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(500);

    const hydrationErrors = errors.filter((e) => /hydrat|#418|#419|#420|#421|#422|#423|#425/i.test(e));
    const otherErrors = errors.filter((e) => !/hydrat|#418|#419|#420|#421|#422|#423|#425/i.test(e));

    const status = hydrationErrors.length === 0 ? 'PASS' : 'FAIL';
    if (status === 'FAIL') exitCode = 1;

    console.log(`  ${status}  ${route}`);
    if (hydrationErrors.length) {
      hydrationErrors.forEach((e) => console.log(`    hydration: ${e.slice(0, 200)}`));
    }
    if (warnings.length) {
      warnings.forEach((w) => console.log(`    warn: ${w.slice(0, 200)}`));
    }
    if (otherErrors.length) {
      otherErrors.slice(0, 3).forEach((e) => console.log(`    other: ${e.slice(0, 200)}`));
    }

    await context.close();
  }

  await browser.close();
  server.close();
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
