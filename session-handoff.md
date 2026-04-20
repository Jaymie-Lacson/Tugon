# Session Handoff — 2026-04-20

## What was accomplished this session

### Phase 1 — Foundation (complete)

1. **Fixed `var(--text-2xl)` / `var(--text-xl)` bug** at `theme.css:451-457` — tokens were referenced in heading rules but never declared. Added the full `--text-xs` → `--text-4xl` fluid `clamp()` scale to `:root`.
2. **Added typography token scale** — `--text-xs` through `--text-4xl` using `clamp()` from 320px → 1440px viewport, plus `--leading-*`, `--tracking-*`, and `--z-*` z-index scale.
3. **Added breakpoints + font-size mappings to `@theme inline`** — `--breakpoint-sm/md/lg/xl` (40/48/64/90rem) and `--font-size-xs` → `--font-size-4xl` aliasing the new tokens.
4. **Removed dead MUI/emotion/popper deps** — `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@popperjs/core`, `react-popper` all removed from `package.json`. No source imports existed — confirmed with grep. 49 packages removed.
5. **Added `zod` (^3.24.2) and `web-vitals` (^4.2.4)** to `package.json`. Ran `npm install` — clean.
6. **Created `AppErrorBoundary`** at `src/app/components/AppErrorBoundary.tsx` — class component wrapping the entire app, renders a Reload button on uncaught render errors, uses design tokens inline.
7. **Wired `AppErrorBoundary` + `initWebVitals` into `src/main.tsx`** — boundary wraps `<TugonThemeProvider><App /></TugonThemeProvider>`, vitals init fires after render.
8. **Scaffolded `src/app/schemas/`** — `auth.ts` (loginSchema, registerSchema), `incidentReport.ts` (incidentReportSchema with enum matching hard rules), `index.ts` barrel export.
9. **Created `src/app/utils/webVitals.ts`** — dynamic import of `web-vitals`, logs CLS/FID/INP/LCP/TTFB to console in DEV only.
10. **Fixed `CLAUDE.md` font reference** — changed `Roboto family` → `Public Sans · IBM Plex Sans · IBM Plex Mono` to match actual `fonts.css`.
11. **Build result** — main bundle dropped from 699 KB → 469 KB minified (178 KB → 142 KB gzip). `npm run build` passes clean.

### Phase 2 — Responsive (complete)

1. **Downloaded hero image locally** — `public/hero-city.jpg` (605 KB) from Pexels; eliminates the cross-origin external fetch that was the biggest LCP risk.
2. **Updated `Landing.tsx`** — `HERO_IMAGE` constant now points to `/hero-city.jpg`; hero `<img>` gets `fetchPriority="high"`, `loading="eager"`, `decoding="async"`, `alt=""`, `aria-hidden="true"` (decorative).
3. **Added `<link rel="preload">` in `index.html`** for `/hero-city.jpg` with `fetchpriority="high"`.
4. **Fixed ad-hoc 900/901px breakpoints in `mobile.css`** — replaced with `63.9375rem` / `64rem` (aligned to the `lg` tier, 1024px). Affects `.citizen-report-footer` sticky vs. fixed behaviour.
5. **Gated touch-unsafe hover effects** — `.incident-step4-photo-add-btn:hover` (light + dark) wrapped in `@media (hover: hover)` so they no longer fire on touchscreens.
6. **Fixed `font-family: Roboto` in `mobile.css`** (2 instances: `.incident-step2-address-input` and `.incident-success-overlay`) → `font-family: inherit`.

### Phase 3 — Performance, Steps 1–4 (complete)

1. **Vite `manualChunks` added to `vite.config.ts`** — splits `leaflet`/`react-leaflet` into `vendor-leaflet` and `recharts` into `vendor-charts`. Removed `vendor-radix` (caused circular chunk warning). Main bundle: **325 KB / 96 KB gzip** (was 469 KB / 142 KB gzip).

2. **Leaflet lazy-loaded** — extracted all react-leaflet JSX into `IncidentReportMap.tsx`, then into `IncidentReport/Map.tsx` after folder decomposition. Uses `React.lazy` + `<Suspense>`. The 45 KB gz `vendor-leaflet` chunk only downloads when user reaches Step 2 of the incident form.

3. **WebP + AVIF hero image** — converted JPEG → WebP (425 KB) and AVIF (310 KB). Landing hero uses `<picture>` with AVIF + WebP sources + JPEG fallback. `index.html` has type-gated preload links.

4. **Service worker + PWA manifest** — `public/sw.js` (stale-while-revalidate for static GET assets; `/api/*` always network-only to preserve server-side geofencing). `public/manifest.webmanifest` for installability. SW registered in `main.tsx` (PROD only, on `load` event).

### Phase 3 — Performance, Step 5: IncidentReport.tsx decomposed (complete)

The 2,200+ LOC `IncidentReport.tsx` monolith has been split into:

```
src/app/pages/IncidentReport/
  types.ts            — PinData, ReportForm, IncidentCategory, Severity, LatLng
  shared.ts           — CATEGORIES, TILE_URLS, BARANGAY_BOUNDARIES, utility fns, STEP_REQUIREMENTS
  Map.tsx             — Leaflet MapContainer component (lazy-load boundary)
  Step1Type.tsx       — Category cards + severity row + subcategory select (exports Step1WithValidation)
  Step2Location.tsx   — Map pin placement + address input (lazy-imports Map.tsx)
  Step3Description.tsx — Textarea + quick tags + affected count
  Step4Evidence.tsx   — Photo upload + voice recorder
  Step5Review.tsx     — Summary card + photo thumbnails + disclaimer
  index.tsx           — Orchestrator + StepIndicator + SuccessScreen + SubmissionLoadingOverlay
```

Old flat files deleted: `src/app/pages/IncidentReport.tsx`, `src/app/pages/IncidentReportMap.tsx`.

Router import `./pages/IncidentReport` auto-resolves to `index.tsx` — no route changes needed.

`npm run build` passes clean after decomposition. Main bundle unchanged at 325 KB / 96 KB gz.

---

## Current state

**Working:**
- `npm run build` passes clean — no errors, no type errors, no circular chunk warnings.
- All 4 phases of Phase 3 complete.
- Main bundle: 325 KB / 96 KB gzip (was 699 KB / 178 KB gzip at project start).
- `vendor-leaflet` (156 KB / 45 KB gz) only loads when user reaches Step 2 of incident report.
- `vendor-charts` (544 KB / 163 KB gz) only loads on analytics pages.
- Hero image serves AVIF (310 KB) to modern browsers, WebP (425 KB) to mid-tier, JPEG (606 KB) to legacy.
- Service worker provides stale-while-revalidate for static assets; API routes bypass cache.
- `IncidentReport` is now a clean folder with 9 focused files (was a 2,200+ LOC monolith).

**Broken / incomplete:**
- Zod schemas exist but are NOT wired into any form — `react-hook-form` + `@hookform/resolvers` integration still needed in auth pages and IncidentReport.
- `web-vitals` only logs to console in DEV — no analytics endpoint for production yet.
- Lower-priority mega-page decompositions not yet done: `CitizenDashboard.tsx` (1,768 LOC), `CitizenMyReports.tsx` (1,633 LOC), `SABarangayMap.tsx` (1,409 LOC).
- Phase 4 (Polish) not started: no ARIA live regions, heading hierarchy unaudited, no Playwright harness.

---

## Files modified this session

| File | Change |
|------|--------|
| `src/app/pages/IncidentReport/types.ts` | NEW — PinData, ReportForm, IncidentCategory, Severity, LatLng |
| `src/app/pages/IncidentReport/shared.ts` | NEW — constants, barangay boundaries, utility functions, STEP_REQUIREMENTS |
| `src/app/pages/IncidentReport/Map.tsx` | NEW — Leaflet MapContainer (was IncidentReportMap.tsx, now imports TONDO_MAP_CENTER/BOUNDS from shared.ts) |
| `src/app/pages/IncidentReport/Step1Type.tsx` | NEW — getCategoryThemeClasses, getSeverityButtonClasses, Step1, Step1WithValidation (named export) |
| `src/app/pages/IncidentReport/Step2Location.tsx` | NEW — Step2 with lazy Map import, pin validation, address input |
| `src/app/pages/IncidentReport/Step3Description.tsx` | NEW — Step3 with textarea, quick tags, affected count |
| `src/app/pages/IncidentReport/Step4Evidence.tsx` | NEW — Step4 with photo upload and voice recorder |
| `src/app/pages/IncidentReport/Step5Review.tsx` | NEW — Step5 with summary card, photo thumbnails, disclaimer |
| `src/app/pages/IncidentReport/index.tsx` | NEW — main orchestrator, StepIndicator, SuccessScreen, SubmissionLoadingOverlay |
| `src/app/pages/IncidentReport.tsx` | DELETED — replaced by folder |
| `src/app/pages/IncidentReportMap.tsx` | DELETED — content moved to IncidentReport/Map.tsx |
| `public/sw.js` | NEW — stale-while-revalidate service worker; network-only for /api/* |
| `public/manifest.webmanifest` | NEW — PWA manifest with TUGON branding |
| `src/main.tsx` | Added SW registration (PROD only) after initWebVitals |
| `index.html` | Added manifest link, mobile-web-app-capable meta, type-gated AVIF+WebP preloads |

---

## Open decisions

- **Zod form integration** — schemas exist in `src/app/schemas/` but wiring to `react-hook-form` via `@hookform/resolvers/zod` hasn't been done. Decision pending: do this per-page or establish a shared `useZodForm` hook.
- **web-vitals production endpoint** — currently console-only in DEV. Needs a `/api/vitals` endpoint or third-party service (e.g. Vercel Analytics) to be useful.
- **Remaining mega-page decompositions** — `CitizenDashboard`, `CitizenMyReports`, `SABarangayMap` are still monoliths. Decision: decompose now (consistency) or defer until feature work requires touching them.

---

## Traps to avoid

1. **`@theme inline` font-size mapping** — `text-base` now resolves to `var(--text-base)` (our `clamp()` value). Leave `text-[16px]` or `text-[1rem]` hard-codes alone — they're intentional overrides.
2. **`xl:` breakpoint shift** — `--breakpoint-xl` is 90rem (1440px), not Tailwind's default 80rem. Check visually on 1280–1440px wide viewports.
3. **MUI removal is already done** — do not re-add `@mui/material` or any emotion/popper package.
4. **`hero-city.jpg` is decorative** — `alt=""` and `aria-hidden="true"` are intentional. Do not add a descriptive `alt`.
5. **Do NOT run `npm audit fix --force`** — 10 dev-tool vulnerabilities exist; `--force` would downgrade production deps.
6. **Vite chunk warning on vendor-charts** — the 544 KB vendor-charts warning is expected (only loads on analytics pages). Do not silence with `chunkSizeWarningLimit`.
7. **SW must never cache `/api/*`** — hard rule in `CLAUDE.md` §7: server-side geofencing must always reach the server. `public/sw.js` already has the bypass; do not remove it.
8. **IncidentReport/Step1Type.tsx exports `Step1WithValidation` as a named export** (not default). `index.tsx` imports it as `{ Step1WithValidation }`. `Step1` itself is not exported (internal only).
9. **IncidentReport/Step2Location.tsx owns its own `useTheme` call** — `index.tsx` no longer imports `useTheme`. Theme-dependent tile URLs are computed inside Step2, not passed from the orchestrator.
10. **Router resolves `./pages/IncidentReport` → `./pages/IncidentReport/index.tsx` automatically** — no route changes were needed in `App.tsx` or any router config.
11. **Preload links are type-gated** — browsers only fetch the preload format they support. Do not revert to a single JPEG preload.

---

## Next steps (priority order)

1. **Phase 4 — Polish: ARIA live regions**
   Add `aria-live="polite"` regions to status change toasts and incident submission feedback. Check `src/app/i18n/` for translation keys used in status messages.

2. **Phase 4 — Polish: Heading hierarchy audit**
   Run `scripts/a11y-smoke.cjs` (if it exists) or a browser a11y audit and fix any skipped heading levels (h1→h3 jumps). Key pages: Landing, CitizenDashboard, IncidentReport.

3. **Phase 4 — Polish: Playwright e2e harness**
   Install `@playwright/test`, scaffold `playwright.config.ts`, write 5 flows × 3 viewports (375px mobile, 768px tablet, 1440px desktop): Landing → Login → Citizen Report form → Submission, Official Dashboard list view, SuperAdmin audit log.

4. **Lower-priority decompositions** (do only if touching these pages for other work):
   - `CitizenDashboard.tsx` (1,768 LOC) → feature folder
   - `CitizenMyReports.tsx` (1,633 LOC) → feature folder
   - `SABarangayMap.tsx` (1,409 LOC) → feature folder

5. **Zod form wiring** — wire `src/app/schemas/auth.ts` into Login and Register pages via `react-hook-form` + `@hookform/resolvers/zod`. Install `@hookform/resolvers` first.

---

## Relevant file paths

- `src/app/pages/IncidentReport/` — decomposed folder (9 files); `index.tsx` is the entry point
- `src/app/pages/IncidentReport/shared.ts` — all shared constants + STEP_REQUIREMENTS
- `src/app/pages/IncidentReport/Map.tsx` — lazy-loaded Leaflet map (react-leaflet lives here only)
- `src/app/pages/CitizenDashboard.tsx` (1,768 LOC) — next decomposition target if needed
- `src/app/pages/CitizenMyReports.tsx` (1,633 LOC) — next decomposition target if needed
- `src/app/pages/superadmin/SABarangayMap.tsx` (1,409 LOC) — next decomposition target if needed
- `vite.config.ts` — manualChunks config (vendor-leaflet, vendor-charts)
- `src/app/pages/Landing.tsx` — hero `<picture>` element with AVIF/WebP/JPEG sources
- `src/styles/theme.css` — all design tokens; `@theme inline` block for Tailwind mapping
- `src/styles/mobile.css` — responsive utilities; breakpoints fixed to 64rem
- `src/app/components/AppErrorBoundary.tsx` — error boundary (Phase 1)
- `src/app/utils/webVitals.ts` — web vitals init (Phase 1)
- `src/app/schemas/` — Zod schemas for auth + incident (not yet wired into forms)
- `src/main.tsx` — bootstrap; AppErrorBoundary + initWebVitals + SW registration
- `public/sw.js` — service worker (stale-while-revalidate; /api/* bypass)
- `public/manifest.webmanifest` — PWA manifest
- `public/hero-city.jpg` — original JPEG (606 KB) — fallback only
- `public/hero-city.webp` — WebP (425 KB)
- `public/hero-city.avif` — AVIF (310 KB) — preferred format
- `index.html` — type-gated preload links for AVIF + WebP; manifest link
