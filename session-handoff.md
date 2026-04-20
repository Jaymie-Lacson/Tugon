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

---

## Current state

**Working:**
- `npm run build` passes clean (no errors, no type errors).
- All Phase 1 + Phase 2 deliverables landed.
- MUI is fully removed; no orphan imports remain.
- Typography tokens are now defined — headings render at their intended sizes.
- Hero image loads from local disk — no Pexels dependency at runtime.
- `AppErrorBoundary` catches render panics; `webVitals` logs in DEV.
- Zod schemas scaffolded and ready for wiring into forms.

**Broken / incomplete:**
- Zod schemas exist but are NOT wired into any form — `react-hook-form` + `@hookform/resolvers` integration still needed in auth pages and IncidentReport.
- `web-vitals` only logs to console in DEV — no analytics endpoint for production yet.
- Phase 3 (Performance) not started: no `manualChunks` in Vite config, Leaflet still eagerly loaded, no service-worker or manifest.
- Phase 4 (Polish) not started: no ARIA live regions, heading hierarchy unaudited, no Playwright harness.
- `ThemeToggle` rendering on mobile layouts still unverified at runtime (agent conflict from previous session unresolved).
- `public/hero-city.jpg` is 605 KB JPEG — no WebP/AVIF conversion or `<picture>` element yet (scheduled Phase 2 stretch, can be Phase 3).

---

## Files modified

| File | Change |
|------|--------|
| `src/styles/theme.css` | Added `--text-xs`→`--text-4xl` clamp tokens, `--leading-*`, `--tracking-*`, `--z-*` to `:root`; added `--breakpoint-*` and `--font-size-*` to `@theme inline` |
| `src/styles/mobile.css` | Fixed 900/901px → 63.9375rem/64rem; gated hover effects; fixed 2 Roboto font-family refs → inherit |
| `src/app/pages/Landing.tsx` | HERO_IMAGE → `/hero-city.jpg`; hero img gets fetchPriority/loading/decoding/aria attrs |
| `index.html` | Added `<link rel="preload">` for hero-city.jpg |
| `package.json` | Removed 6 dead MUI/emotion/popper deps; added zod + web-vitals |
| `CLAUDE.md` | Font token row: Roboto → Public Sans · IBM Plex Sans · IBM Plex Mono |
| `src/main.tsx` | Import + wire AppErrorBoundary wrapping render tree; import + call initWebVitals after render |
| `src/app/components/AppErrorBoundary.tsx` | New — class ErrorBoundary with Reload button, uses design tokens |
| `src/app/utils/webVitals.ts` | New — dynamic-imported web-vitals, console-only in DEV |
| `src/app/schemas/index.ts` | New — barrel export for all Zod schemas |
| `src/app/schemas/auth.ts` | New — loginSchema + registerSchema |
| `src/app/schemas/incidentReport.ts` | New — incidentReportSchema matching hard-rule incident types |
| `public/hero-city.jpg` | New — 605 KB JPEG downloaded from Pexels; replaces external URL |

---

## Open decisions

1. **WebP/AVIF conversion for hero-city.jpg** — the JPEG is 605 KB. Converting to WebP/AVIF would cut it to ~120–200 KB and justify the `<picture>` element. Simplest path: use sharp or squoosh CLI in a one-off script, drop both variants in `public/`, then update Landing.tsx with `<picture><source srcSet="/hero-city.avif" type="image/avif" /><source srcSet="/hero-city.webp" type="image/webp" /><img ... /></picture>`. Schedule for Phase 3.
2. **Zod wiring strategy** — schemas exist. Decision: wire into existing forms with `@hookform/resolvers/zod` (replace manual `validate` props) or leave forms as-is and only use Zod for API response validation? The auth pages are slated for rewrite in Phase 3; wiring Zod now into 45K-LOC scaffold forms is low ROI. Recommend: wire into Phase 3 rewrites only.
3. **`manualChunks` strategy for Phase 3** — split into: `vendor-leaflet` (Leaflet + react-leaflet), `vendor-charts` (recharts), `vendor-motion` (motion), `vendor-radix` (all @radix-ui/*). Existing `index-legacy` chunk at 699 KB is already addressed partially; the remaining 469 KB main bundle still bundles Radix monolithically.
4. **Service-worker scope** — plan calls for service-worker-lite covering `/citizen/report` draft recovery (IndexedDB). Confirm this stays out of full offline scope (CLAUDE.md hard rule #7 — server-side authoritative geofencing must not be bypassed offline).
5. **ThemeToggle visibility** — two prior agents disagreed. Needs a runtime check (open DevTools, navigate to each shell: Layout, CitizenDesktopNav, CitizenMobileMenu, SuperAdminLayout, confirm element visible).

---

## Traps to avoid

1. **`@theme inline` font-size mapping** — In Tailwind v4, `--font-size-base` maps to the `text-base` utility. This means `text-base` now resolves to `var(--text-base)` (our `clamp()` value). If any existing component hard-codes `text-[16px]` or `text-[1rem]` expecting a fixed size, those are now overriding our token — leave them alone.
2. **`xl:` breakpoint shift** — `--breakpoint-xl` was changed from Tailwind's default 80rem (1280px) to 90rem (1440px). Any existing `xl:` utility class now only activates at 1440px instead of 1280px. Check visually on 1280–1440px wide viewports before Phase 3.
3. **MUI removal is already done** — do not re-add MUI. No source imports existed before removal; confirmed via grep. If a future agent suggests importing `@mui/material`, reject it.
4. **`hero-city.jpg` is decorative** — `alt=""` and `aria-hidden="true"` are intentional; the hero text is in the DOM independently. Do not add a descriptive `alt` to the image; it would be read redundantly by screen readers.
5. **`react-popper` is removed** — If any component previously used `react-popper` for tooltip positioning, it now needs a Radix `@radix-ui/react-popover` replacement. Grep confirmed no source imports existed; safe.
6. **Do NOT run `npm audit fix --force`** — the 10 vulnerabilities listed are in dev/build tools (vite, eslint). `--force` would downgrade production deps. Ignore them.
7. **Build warning about chunks >500KB** — the Vite chunk warning on the 469 KB main bundle is expected and is the target of Phase 3 manualChunks work. Do not silence it with `build.chunkSizeWarningLimit`.
8. **`src/app/schemas/index.ts`** re-exports from `./incidentReport` and `./auth` — if the barrel is imported before those files exist, it will fail. Both files exist now; keep them in sync if schemas are added.

---

## Next steps (priority order)

1. **Phase 3 — Performance, Step 1: Vite `manualChunks`**
   Edit `vite.config.ts` → add `build.rollupOptions.output.manualChunks`:
   ```ts
   manualChunks: {
     'vendor-leaflet':  ['leaflet', 'react-leaflet'],
     'vendor-charts':   ['recharts'],
     'vendor-motion':   ['motion'],
     'vendor-radix':    [/* all @radix-ui/* package names */],
   }
   ```
   Target: main bundle ≤ 280 KB gz after split.

2. **Phase 3 — Performance, Step 2: Lazy-load Leaflet inside `Step2Location`**
   `IncidentReport.tsx` Step 2 eagerly imports Leaflet even on Step 1 (type selection). Wrap the Leaflet map in `React.lazy()` + `<Suspense>` so the 140 KB Leaflet bundle only loads when the user reaches Step 2.

3. **Phase 3 — Performance, Step 3: WebP/AVIF hero image**
   Run: `npx sharp-cli -i public/hero-city.jpg -o public/hero-city.webp --format webp --quality 80`
   Then update Landing.tsx to use `<picture>` with AVIF/WebP sources.

4. **Phase 3 — Performance, Step 4: Service-worker-lite + manifest**
   Create `public/manifest.webmanifest` with TUGON branding. Create `src/sw.ts` — cache-first for static assets, network-first for API. Register in `main.tsx`. Scope: citizen report draft recovery (IndexedDB) only.

5. **Phase 3 — Performance, Step 5: Decompose mega-pages**
   `IncidentReport.tsx` (2,222 LOC) → `IncidentReport/{index,Step1Type,Step2Location,Step3Description,Step4Evidence,Step5Review}.tsx`
   `CitizenDashboard.tsx` (1,768 LOC) → feature folder with sub-components
   Do not change props/state contracts — extraction only.

6. **Phase 4 — Polish: ARIA live regions**
   Add `aria-live="polite"` regions to status change toasts and incident submission feedback. Check `src/app/i18n/` for translation keys.

7. **Phase 4 — Polish: Heading hierarchy audit**
   Run `scripts/a11y-smoke.cjs` and fix any skipped heading levels (h1→h3 jumps).

8. **Phase 4 — Polish: Playwright e2e harness**
   Install `@playwright/test`, scaffold `playwright.config.ts`, write 5 flows × 3 viewports (375px mobile, 768px tablet, 1440px desktop): Landing → Login → Citizen Report form → Submission, Official Dashboard list view, SuperAdmin audit log.

---

## Relevant file paths

- `vite.config.ts` — Phase 3 manualChunks target (read before editing)
- `src/app/pages/IncidentReport.tsx` (2,222 LOC) — Phase 3 decomposition target; preserve all step state/props contracts
- `src/app/pages/CitizenDashboard.tsx` (1,768 LOC) — Phase 3 decomposition target
- `src/app/pages/CitizenMyReports.tsx` (1,633 LOC) — Phase 3 decomposition target
- `src/app/pages/superadmin/SABarangayMap.tsx` (1,409 LOC) — Phase 3 decomposition target
- `src/app/pages/Landing.tsx` — hero `<img>` at line ~420; `<picture>` upgrade in Phase 3
- `src/styles/theme.css` — all design tokens; `@theme inline` block for Tailwind mapping
- `src/styles/mobile.css` — responsive utilities; 900px breakpoints now fixed to 64rem
- `src/app/components/AppErrorBoundary.tsx` — new error boundary (Phase 1)
- `src/app/utils/webVitals.ts` — new web vitals init (Phase 1)
- `src/app/schemas/` — Zod schemas for auth + incident (Phase 1); not yet wired into forms
- `src/main.tsx` — bootstrap; AppErrorBoundary + initWebVitals wired here
- `public/hero-city.jpg` — local hero image (605 KB JPEG, needs WebP/AVIF in Phase 3)
- `index.html` — has preload link for hero; add font preconnect in Phase 3
- `scripts/a11y-smoke.cjs` — existing a11y smoke test to extend in Phase 4
- `CLAUDE.md` — project hard rules; font token now correct
- Graph MCP last built: 2026-04-20T10:19:26 @ commit `f76bf34` on `main` (580 nodes, 6368 edges, 52 files).
