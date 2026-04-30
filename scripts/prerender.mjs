import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, '..', 'dist');

const PROD_ORIGIN = process.env.PRERENDER_ORIGIN || 'https://tugon-rho.vercel.app';

const ROUTES = [
  '/',
  '/community-map',
  '/emergency',
  '/contact',
  '/privacy',
  '/terms',
  '/auth/login',
  '/auth/register',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
};

function safeJoin(base, target) {
  const resolved = normalize(join(base, target));
  if (!resolved.startsWith(base)) return join(base, 'index.html');
  return resolved;
}

function startServer(port, shellHtml) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = safeJoin(dist, url);

      // Always fall through unknown paths to the in-memory shell so prerendered
      // outputs from earlier iterations don't leak into later snapshots.
      let body;
      let contentType;
      try {
        if (existsSync(filePath) && statSync(filePath).isFile() && filePath !== join(dist, 'index.html')) {
          body = readFileSync(filePath);
          contentType = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
        } else {
          body = shellHtml;
          contentType = MIME['.html'];
        }
      } catch {
        body = shellHtml;
        contentType = MIME['.html'];
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(body);
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function snapshot(page, port, route) {
  const url = `http://127.0.0.1:${port}${route}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  return page.content();
}

function rewriteLocalOrigin(html, port) {
  return html.replaceAll(`http://127.0.0.1:${port}`, PROD_ORIGIN);
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('prerender: dist/index.html missing — run `vite build` first');
    process.exit(1);
  }

  const shellHtml = readFileSync(join(dist, 'index.html'));
  const port = 4300 + Math.floor(Math.random() * 200);
  const server = await startServer(port, shellHtml);
  console.log(`prerender: serving dist/ on http://127.0.0.1:${port}, canonical origin = ${PROD_ORIGIN}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ javaScriptEnabled: true });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.warn(`  page error: ${err.message}`));

  // Phase 1: snapshot every route into memory before touching the filesystem,
  // so each route boots from the original shell instead of a previous snapshot.
  const snapshots = [];
  let failures = 0;
  for (const route of ROUTES) {
    try {
      const raw = await snapshot(page, port, route);
      const html = rewriteLocalOrigin(raw, port);
      snapshots.push({ route, html });
      console.log(`  snapshot ${route}  ${(html.length / 1024).toFixed(1)} kB`);
    } catch (err) {
      failures += 1;
      console.error(`  FAIL ${route}: ${err.message}`);
    }
  }

  await browser.close();
  server.close();

  if (failures > 0) {
    console.error(`prerender: ${failures} route(s) failed — no files written`);
    process.exit(1);
  }

  // Phase 2: commit all snapshots to disk.
  for (const { route, html } of snapshots) {
    const outDir = route === '/' ? dist : join(dist, route);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf-8');
  }

  console.log(`prerender: ${snapshots.length} routes complete`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
