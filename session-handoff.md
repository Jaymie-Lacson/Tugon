# Session Handoff — Dark Mode Rollout (Phases 1 & 2 complete)
_Date: 2026-04-11_

---

## What was accomplished this session

### Planning
- Explored full codebase theming system: Tailwind v4 + CSS custom properties, no `tailwind.config.js`
- Confirmed `next-themes` v0.4.6 and `lucide-react` are already installed
- Confirmed `.dark` class overrides are complete in `src/styles/theme.css` (lines 162–210) — infrastructure was 90% ready
- Confirmed ~284 hardcoded color utility instances bypassing the token system
- Produced a 7-phase plan at `.claude/plans/hazy-puzzling-nest.md`
- User confirmed: scope = all surfaces except `/`, toggle in header + Settings, system-preference default

### Phase 1 — Foundation (COMPLETE, build passes)
- **Created** `src/app/providers/ThemeProvider.tsx` — wraps next-themes `ThemeProvider` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `storageKey="tugon-theme"`, `disableTransitionOnChange`
- **Created** `src/app/components/ThemeToggle.tsx` — sun/moon icon button using `useTheme()`, mounted guard to prevent hydration flicker, fully semantic token classes
- **Modified** `src/main.tsx` — wrapped `<App />` in `<TugonThemeProvider>`
- **Modified** `src/app/routes.ts` — added `LandingLightOnly` component wrapping Landing in a nested `ThemeProvider` with `forcedTheme="light"` so `/` is always light regardless of OS or user preference

### Phase 2 — Shared UI primitive token migration (COMPLETE, build passes)
Migrated all hardcoded Tailwind color utilities → semantic tokens in skeleton components:
- `CardSkeleton.tsx` — 3x `border-gray-* bg-white` → `border-border bg-card`
- `TextSkeleton.tsx` — 1x `border-gray-200 bg-white` → `border-border bg-card`
- `TableSkeleton.tsx` — wrapper, thead, and row borders migrated
- `PageSkeletons.tsx` — ~18 hardcoded `bg-white`, `border-slate-*`, `border-gray-*` → semantic tokens

Intentionally left unchanged: `bg-black/50` overlays in `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx` — modal backdrops should be dark in both themes.

---

## Current state

### Working
- `TugonThemeProvider` mounted at app root — `.dark` class applied to `<html>` on toggle
- `ThemeToggle` component exists and ready to be placed (NOT yet placed in any shell header — Phase 3)
- `LandingLightOnly` ensures `/` is always light
- All skeleton components (`CardSkeleton`, `TextSkeleton`, `TableSkeleton`, `PageSkeletons`) use semantic tokens and flip correctly with `.dark`
- Frontend and backend builds pass cleanly

### Not yet done (hardcoded colors still remain in)
- All shell/layout components: `Layout.tsx`, `CitizenPageLayout.tsx`, `SuperAdminLayout.tsx`, `AuthLayout.tsx`
- All page files: Citizen, Official, SuperAdmin, Auth
- Navigation: `CitizenDesktopNav`, `CitizenMobileMenu`, `BottomNav`, `OfficialPageHeader`, `AdminNotifications`, `CitizenNotifications`
- `src/styles/mobile.css` has hardcoded `#fff` (lines 106, 118, 141, 234) and `#1e293b` (line 203)
- `ThemeToggle` not yet placed in any header

### To test Phase 1+2 right now
Open DevTools console and run: `document.documentElement.classList.toggle('dark')`
Skeleton components and token-based UI primitives flip. Page backgrounds and nav will not (expected).

---

## Files modified this session

| File | Change |
|---|---|
| `src/app/providers/ThemeProvider.tsx` | CREATED — next-themes wrapper with TUGON config |
| `src/app/components/ThemeToggle.tsx` | CREATED — sun/moon toggle button |
| `src/main.tsx` | Added `TugonThemeProvider` import + wrap around `<App />` |
| `src/app/routes.ts` | Added `ThemeProvider` import + `LandingLightOnly` wrapper; `/` route uses `LandingLightOnly` |
| `src/app/components/ui/CardSkeleton.tsx` | `border-gray-* bg-white` to `border-border bg-card` (3 instances) |
| `src/app/components/ui/TextSkeleton.tsx` | `border-gray-200 bg-white` to `border-border bg-card` |
| `src/app/components/ui/TableSkeleton.tsx` | `bg-white`, `border-gray-*`, `bg-gray-50` to semantic tokens |
| `src/app/components/ui/PageSkeletons.tsx` | ~18 hardcoded bg/border to semantic tokens |

---

## Open decisions

- **Auth page gradient**: `AuthLayout.tsx` has a hardcoded blue gradient (`#00194f` to `#1e3a8a`) on the brand panel. Plan: keep the gradient as a brand element, only migrate the form panel to semantic tokens. Implement in Phase 6.
- **Leaflet dark tiles**: Phase 4 will need a CARTO dark tile URL. Standard free option: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`. Not yet committed.
- **Settings Appearance section**: Phase 4 adds System / Light / Dark radio to `Settings.tsx`. Layout within the existing settings page is undesigned.

---

## Traps to avoid

- **Prisma generate EPERM on Windows**: Fails when dev server is running (DLL locked). Not a code error — kill dev server before running `prisma:generate`.
- **`routes.ts` is `.ts` not `.tsx`**: No JSX. Everything must use `React.createElement`. Any future additions must also use `createElement`.
- **`bg-black/50` overlays are intentional**: Do NOT migrate `bg-black/50` in `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx`.
- **Prefer CSS variable gaps over `dark:` Tailwind variants**: The `.dark` block in `theme.css` already handles all token flips globally. Fill gaps there first.
- **ThemeToggle mounted guard**: Component renders a placeholder `<div>` until mounted to prevent hydration mismatch. Do not remove the `mounted` check.
- **`border-gray-50` was mapped to `border-border/30`**: Near-invisible dividers in PageSkeletons intentionally use `/30` opacity — do not change to full `border-border`.
- **Previous session redesign is still in place**: Prior session redesigned Dashboard, Analytics, Reports, Settings, StatusBadge, Layout with flat civic aesthetic (no gradients, no icon blobs). Those changes must be preserved. Dark mode migrates tokens only — it does not undo the redesign.

---

## Next steps (in order)

### Phase 3 — Citizen portal
1. Read then edit `src/app/components/CitizenPageLayout.tsx`:
   - Migrate `bg-white`, `border-gray-*`, `text-gray-*` to semantic tokens
   - Add `<ThemeToggle />` to the top bar
2. `src/app/components/CitizenDesktopNav.tsx` — token migration
3. `src/app/components/CitizenMobileMenu.tsx` — token migration
4. `src/app/components/BottomNav.tsx` — token migration (check active indicator contrast)
5. `src/app/components/CitizenNotifications.tsx` — token migration
6. `src/app/components/CitizenOnboardingModal.tsx` — token migration
7. `src/app/pages/CitizenDashboard.tsx` — token migration
8. `src/app/pages/IncidentReport.tsx` — token migration (each step of the multi-step form)
9. `src/app/pages/CitizenMyReports.tsx` — token migration
10. `src/app/pages/CitizenVerification.tsx` — token migration
11. `src/app/components/VerificationProgressCard.tsx` — token migration
12. `src/app/components/StatusBadge.tsx` — verify severity colors survive (red/ochre must not change)
13. Run `npm run build` — must pass

### Phase 4 — Official portal
- `Layout.tsx`, `OfficialPageHeader.tsx`, `AdminNotifications.tsx` — add `<ThemeToggle />` to header + token migration
- `Dashboard.tsx`, `Incidents.tsx`, `Analytics.tsx`, `Reports.tsx`, `Verifications.tsx` — token migration
- `Settings.tsx` — add Appearance section (radio: System / Light / Dark via `useTheme()`)
- `MapView.tsx` + `IncidentMap.tsx` — swap Leaflet tile layer on `resolvedTheme`

### Phase 5 — Super Admin
- `SuperAdminLayout.tsx` (add ThemeToggle), `SAOverview.tsx`, `SABarangayMap.tsx`, `SAAnalytics.tsx`, `SAUsers.tsx`, `SAAuditLogs.tsx`

### Phase 6 — Auth pages
- `AuthLayout.tsx` form panel only (keep brand gradient), then all `/auth/*` page files

### Phase 7 — Edge cases
- `src/styles/mobile.css` — replace `#fff` and `#1e293b` with CSS variables
- `AppRouteErrorPage.tsx` — token migration
- `useImmersiveThemeColor` hook — write `resolvedTheme`-aware `theme-color` meta tag
- Run `/audit` skill for a11y contrast check

---

## Relevant file paths

| Purpose | Path |
|---|---|
| Implementation plan (7 phases) | `.claude/plans/hazy-puzzling-nest.md` |
| Theme tokens (light + .dark overrides) | `src/styles/theme.css` |
| ThemeProvider (root wrapper) | `src/app/providers/ThemeProvider.tsx` |
| ThemeToggle (ready to place in headers) | `src/app/components/ThemeToggle.tsx` |
| App root mount | `src/main.tsx` |
| Router (Landing guard lives here) | `src/app/routes.ts` |
| Mobile CSS hardcodes (Phase 7) | `src/styles/mobile.css` |
| Toast already theme-aware (reference impl) | `src/app/components/ui/sonner.tsx` |
