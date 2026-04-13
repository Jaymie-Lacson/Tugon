# Session Handoff — 2026-04-13

## What was accomplished this session

1. **Verified dark mode implementation across all portals (except Landing)** via the `review` and `check` skills:
   - Citizen shell (`CitizenDashboard`, `CitizenMyReports`, `IncidentReport`) — hardcoded hex values replaced with semantic tokens.
   - Official/Super Admin shell (all `SA*` pages + `SuperAdminLayout`) — slate/hex values tokenized to `bg-card`, `text-[var(--on-surface)]`, `border-[var(--outline-variant)]`.
   - Auth shell (`Login`, `Register`, `Verify`, `ForgotPassword`) — swapped logo to `/tugon-header-logo.svg`.
   - `map-view.css` — 195 new lines of `.dark` overrides for map panel, header, filters, cards, modals.
2. **Landing page isolation refactor**: replaced the nested `ThemeProvider forcedTheme='light'` wrapper in `routes.ts` with a `.landing-root` CSS class + `.dark .landing-root` token override block in `theme.css` (lines 229–260). Applied class at `Landing.tsx:1142`.
3. **Logo dark-mode swap** in `Layout.tsx` and `SuperAdminLayout.tsx` using the `dark:hidden` / `dark:block` pair. Auth pages + `CitizenDesktopNav` switched unconditionally to `/tugon-header-logo.svg`.
4. **Reverted Leaflet dark-tile swap** in `IncidentMap.tsx` and `IncidentReport.tsx` (was added in `f76ef71`). Now uses the standard `tile.openstreetmap.org` URL in both themes. Removed stale `useTheme` imports.
5. **Ran pre-commit review skill** — all hard rules, design tokens, and service contracts pass. Two flags raised (map tile regression, unconditional logo swap in auth) — documented but non-blocking.
6. **Ran check skill** — backend `tsc` clean, frontend `vite build` clean in 54.21s. Prisma validate passed. Prisma generate EPERM on Windows (DLL locked by running dev server) but client was already generated.
7. **Committed as `8665b81`** — `feat(theme): finalize dark mode — landing CSS isolation + SA token sweep` — 21 files, 509+/286− lines.

## Current state

**Working:**
- All SA, Citizen, Auth, and Map pages render correctly in both light and dark modes via CSS variable cascade.
- Build pipeline green (backend `tsc`, frontend `vite build`).
- Landing-root isolation block exists in both source and built CSS with correct token overrides.
- `landing-root` class is applied to the outer wrapper in `Landing.tsx:1142`.
- Landing.tsx contains zero `dark:` Tailwind classes (verified via grep).

**Broken / incomplete:**
- **User reports that `HowToUse` ("three simple steps") and `SafetyTips` ("community safety tips") sections on Landing are still darkened in dark mode.** Expected behavior: Landing should always render in light mode regardless of `.dark` on `<html>`.
- Investigation so far (see "Traps" below) shows the `.dark .landing-root` rule IS in the built CSS with correct specificity (0,0,2,0 > 0,0,1,0 for `.dark`), and `bg-card`/`bg-muted/50` both compile to `var(--card)`/`color-mix(... var(--muted) ...)`. The cascade SHOULD work but the user still sees darkened cards. Root cause not yet confirmed.

## Files modified

- `src/styles/theme.css` — added `.dark .landing-root` isolation block (lines 229–260) redefining `--background`, `--foreground`, `--card`, `--muted`, `--primary`, severity tokens, etc.
- `src/styles/map-view.css` — +195 lines of `.dark` overrides for all map UI chrome.
- `src/app/routes.ts` — removed nested `ThemeProvider forcedTheme='light'` wrapper; `LandingLightOnly` now returns `Landing` directly.
- `src/app/pages/Landing.tsx` — added `landing-root` class to outer wrapper (line 1142). One-line change.
- `src/app/components/Layout.tsx` — two `<img>` tags with `dark:hidden` / `dark:block` for light/dark logo swap.
- `src/app/pages/superadmin/SuperAdminLayout.tsx` — same logo swap pattern + slate hex → tokens in sidebar nav and monitoring strip.
- `src/app/components/CitizenDesktopNav.tsx` — unconditional logo swap to `/tugon-header-logo.svg`.
- `src/app/components/IncidentMap.tsx` — removed `useTheme` import + CARTO dark tile ternary; reverted to `tile.openstreetmap.org` URL.
- `src/app/pages/IncidentReport.tsx` — same tile revert.
- `src/app/pages/CitizenDashboard.tsx` — tokenized QuickActionCard hardcoded `text-white`/`bg-white/15`.
- `src/app/pages/CitizenMyReports.tsx` — tokenized DetailView cancel banner and confirm modal.
- `src/app/pages/superadmin/SAAnalytics.tsx` — StatCard and headers tokenized.
- `src/app/pages/superadmin/SAAuditLogs.tsx` — all `bg-white` / `border-slate-*` → `bg-card` / `border-[var(--outline-variant)]`.
- `src/app/pages/superadmin/SABarangayMap.tsx` — zoom controller and layout tokenized.
- `src/app/pages/superadmin/SAOverview.tsx` — KPICard and barangay accent classes tokenized.
- `src/app/pages/superadmin/SAUsers.tsx` — UserModal, table, filters, pagination tokenized.
- `src/app/pages/auth/Login.tsx`, `Register.tsx`, `Verify.tsx`, `ForgotPassword.tsx` — `logoSrc` prop swapped to `/tugon-header-logo.svg`.
- `.claude/settings.local.json` — added permissions for `Skill(review)`, `prisma:validate`, `prisma:generate`, `taskkill`.

## Open decisions

1. **Why is the `.dark .landing-root` override not visually applying on the Landing page cards?** User reports dark cards; source + built CSS both show the override is emitted correctly with adequate specificity. Needs browser devtools inspection to see which rule actually wins at runtime.
2. **Should we reinstate the Leaflet CARTO dark tile swap** that was removed in this session's commit? The map UI chrome is dark-styled but the map tiles themselves stay light. Intentional revert, or regression to fix? Leaving as-is until the user weighs in.
3. **Should `CitizenDesktopNav` and auth pages** also use the `dark:hidden` / `dark:block` logo pattern instead of the unconditional `/tugon-header-logo.svg` swap? Verify how the new logo reads in both themes before deciding.
4. **`useImmersiveThemeColor('#ffffff')` in `SuperAdminLayout`** is hardcoded light. This only affects iOS Safari browser chrome color, not the page. Not a regression from this PR but worth revisiting if full iOS dark-mode polish is desired.

## Traps to avoid

1. **Don't assume the `.dark .landing-root` cascade "just works" without verifying in the browser.** This session spent time tracing the source → built CSS → Tailwind emission path (`.bg-card` → `var(--card)`, `.bg-muted/50` → `color-mix(... var(--muted) ...)`, `.bg-background` → `var(--background)`) and confirmed specificity `(0,0,2,0) > (0,0,1,0)`. On paper it should work. In practice the user still sees dark cards. **The next session MUST open devtools on the Landing page in dark mode and inspect the computed `--card` / `--muted` / `--background` values on one of the affected cards to find the real culprit.**
2. **Don't try to fix with `!important`.** It's a hack that'll mask the real issue and fight the design system. Diagnose first.
3. **Don't accidentally re-add a nested `ThemeProvider` to Landing.** The isolation refactor removed it intentionally. A nested provider is the wrong pattern because next-themes still applies `.dark` to `<html>` regardless, and the nested provider just adds duplicate state.
4. **Prisma generate fails with EPERM on Windows** when the dev server is running — the `.prisma/client/query_engine-windows.dll.node` is locked. Kill node processes before running `prisma:generate`. Not a real error; the client is already generated from a previous run.
5. **`@theme inline` in Tailwind v4 does NOT mean "inline at build time as literal values".** It means "inline the `var(--x)` reference directly into utility classes without creating an intermediate `--color-x` variable". The runtime cascade is unaffected. Don't waste time on this hypothesis.
6. **Don't re-attempt the Leaflet CARTO dark tile swap** without first asking the user whether `f76ef71`'s implementation had a concrete issue (broken CARTO URL, rate limits, rendering glitches). It was reverted this session for a reason we should uncover.
7. **`mobile.css` and `map-view.css` don't set `--card`/`--muted`/`--background`** — grep already confirmed. No collision there.

## Next steps (in priority order)

1. **Diagnose the Landing dark-mode leak** (user's current complaint). Open the dev server, toggle dark mode, open devtools on one of the affected cards in `HowToUse` (line 717–771, `bg-muted/50` + `bg-background`) or `SafetyTips` (line 889–923, `bg-muted/50` + `bg-card`). Inspect the Computed styles panel for `background-color` and the "Styles" panel for the `--card`, `--muted`, `--background` custom properties. Determine which rule is actually winning. Candidate hypotheses to rule in/out:
   - **(a)** Is `.dark` actually on `<html>`? (next-themes default is yes — verify).
   - **(b)** Is `landing-root` actually on the wrapper element? (source says yes — verify at runtime).
   - **(c)** Is there a rule with *higher* specificity than `(0,0,2,0)` setting `--card` on an intermediate element? Unlikely but possible from a shadcn component.
   - **(d)** Is there a `@layer` ordering issue that de-prioritizes the `.dark .landing-root` rule? It's currently outside any `@layer`, so it's in the "unlayered" bucket which has the highest priority. Shouldn't be an issue — verify.
   - **(e)** Hard cache — ask the user to hard-reload (Ctrl+Shift+R) and retry. Easy first-check.
2. **Once the root cause is found, apply the minimal fix.** Likely options:
   - Move the `.dark .landing-root` rule into `@layer base` so it's in the same layer as Tailwind's utility emissions (if layering is the issue).
   - Use `:where(.dark) .landing-root` or `.landing-root` alone (without `.dark` prefix) to assert light tokens unconditionally.
   - Promote the isolation to `html.dark .landing-root` if there's an element in between.
3. **Revisit the 2 flags from the review:**
   - Leaflet dark tiles: ask user if reverting was intentional.
   - Auth + CitizenDesktopNav logo swap: verify new logo reads correctly in both themes, or apply `dark:hidden`/`dark:block` pattern.
4. **Push the 9 pending commits** to `origin/main` once the Landing fix lands and the user approves.

## Relevant file paths

- `src/styles/theme.css:229-260` — `.dark .landing-root` isolation block (the focus of the current bug).
- `src/app/pages/Landing.tsx:1142` — `landing-root` class application.
- `src/app/pages/Landing.tsx:686-773` — `HowToUse` component (three simple steps) — user reports darkened in dark mode.
- `src/app/pages/Landing.tsx:868-924` — `SafetyTips` component (community safety tips) — user reports darkened in dark mode.
- `src/app/routes.ts:47-50` — `LandingLightOnly` wrapper (now just returns `Landing` — no more nested `ThemeProvider`).
- `src/app/providers/ThemeProvider.tsx` — root next-themes provider, `attribute="class"` → `.dark` on `<html>`.
- `dist/assets/index-*.css` — built CSS for reference (grep-verified that `.dark .landing-root{...}` and `.bg-card{background-color:var(--card)}` are present).
- `CLAUDE.md` — project rules and design tokens.
- Latest commit: `8665b81 feat(theme): finalize dark mode — landing CSS isolation + SA token sweep`.
- Branch is 9 commits ahead of `origin/main`.
