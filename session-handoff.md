# Session Handoff — 2026-03-28 (UI/UX Redesign, Session 2)

**Branch:** `redesign`
**Build status:** PASSING (`npm run build` succeeds)
**All changes are unstaged** — nothing committed this session yet.

---

## What was accomplished this session

### Phase 3: Layout Shell Unification (COMPLETE)
Migrated all 3 layout shells + 2 citizen nav components from inline `style={{}}` to Tailwind classes. Replaced mobile hamburger dropdown menus with the `BottomNav` component for Official and SuperAdmin portals.

- **Layout.tsx** — 758→~260 lines (-66%). Removed hamburger menu, `drawerOpen` state, 3 related useEffects, embedded `<style>` block. Wired `BottomNav` with 5 items (Home, Incidents, Map, Reports, Settings). All `onMouseEnter`/`onMouseLeave` hover handlers replaced with Tailwind `hover:` classes.
- **SuperAdminLayout.tsx** — 783→~270 lines (-65%). Same treatment. Aligned mobile breakpoint from 768px to `lg` (1024px). Wired `BottomNav` with 5 items (Overview, Map, Analytics, Users, Settings).
- **CitizenPageLayout.tsx** — 251→~115 lines (-54%). Replaced inline verification banner with `VerificationProgressCard` component. Removed `getCitizenVerificationPrompt()` function. Kept `<style>` block for CSS-variable-driven responsive layout (depends on runtime props).
- **CitizenDesktopNav.tsx** — 91→61 lines. Inline styles → Tailwind. Kept `citizen-only-desktop` / `citizen-web-strip` class names for parent layout compat.
- **CitizenMobileMenu.tsx** — 107→67 lines. Inline styles → Tailwind. Kept `citizen-only-mobile` class name for parent layout compat.
- **BottomNav.tsx** — Added `exact?: boolean` to `BottomNavItem` interface so root paths (`/app`, `/superadmin`) don't false-match child routes.

### Phase 4: High-Traffic Official Pages (PARTIAL — 3 of 6 done)
Migrated inline styles to Tailwind on the first 3 official pages:

- **Settings.tsx** — 140→~95 lines. All 26 inline styles → Tailwind. Removed embedded `<style>` block, replaced with Tailwind responsive `max-md:` classes.
- **Verifications.tsx** — 506→~220 lines. All 52 inline styles → Tailwind. Image preview modal, action buttons, form elements all migrated.
- **Analytics.tsx** — 752→~490 lines. 67 inline styles → Tailwind. Kept `isMobile` state (needed by Recharts props). Kept reduced `<style>` block for complex mobile-only overrides (period tab grid, chart toggle width). All MetricCard, chart wrapper, legend, resource utilization bar styles migrated.

---

## Current state

### Working
- Build passes (`npm run build` succeeds, no TypeScript errors)
- All 3 layout shells render with Tailwind (sidebar, header, bottom nav, profile menus)
- BottomNav renders on mobile for Official and SuperAdmin portals
- VerificationProgressCard shows in CitizenPageLayout for unverified citizens
- Settings, Verifications, Analytics pages fully migrated to Tailwind
- All Recharts inline styles preserved (required by library)

### Incomplete
- **Dashboard.tsx** (1,059 lines, 144 inline styles) — NOT started. Was about to write this when session ended.
- **Incidents.tsx** (1,301 lines, 115 inline styles) — NOT started
- **Reports.tsx** (1,184 lines, 139 inline styles) — NOT started
- Phase 5, 6 not started

### Not broken, but worth noting
- The `citizen-only-mobile` and `citizen-only-desktop` CSS classes are still defined in CitizenPageLayout's `<style>` block. They use 900px breakpoint (not a standard Tailwind breakpoint). CitizenDesktopNav and CitizenMobileMenu depend on them. This will be cleaned up in Phase 5 when CitizenDashboard is rewritten.

---

## Files modified (unstaged)

| File | Summary |
|------|---------|
| `src/app/components/BottomNav.tsx` | Added `exact?: boolean` to BottomNavItem interface |
| `src/app/components/Layout.tsx` | Full rewrite: inline styles → Tailwind, hamburger → BottomNav |
| `src/app/pages/superadmin/SuperAdminLayout.tsx` | Full rewrite: inline styles → Tailwind, hamburger → BottomNav |
| `src/app/components/CitizenPageLayout.tsx` | Inline styles → Tailwind, verification banner → VerificationProgressCard |
| `src/app/components/CitizenDesktopNav.tsx` | Inline styles → Tailwind |
| `src/app/components/CitizenMobileMenu.tsx` | Inline styles → Tailwind |
| `src/app/pages/Settings.tsx` | All inline styles → Tailwind, removed `<style>` block |
| `src/app/pages/Verifications.tsx` | All inline styles → Tailwind |
| `src/app/pages/Analytics.tsx` | Most inline styles → Tailwind, kept Recharts props + reduced `<style>` |

---

## Open decisions

- **BottomNav item selection for Official portal**: Currently Home, Incidents, Map, Reports, Settings. Analytics and Verifications are not in the bottom nav — they're accessible from desktop sidebar and dashboard links. May want to reconsider if users complain.
- **SuperAdmin mobile breakpoint**: Changed from 768px to `lg` (1024px) for consistency with Official portal. If SA users prefer sidebar visible on tablets, could revert to `md` (768px).
- **Dashboard.tsx approach**: This is the most complex page (1059 lines, 144 inline styles). Has KPICard, AlertBanner, cross-border alerts, heatmap panel, map with tuning controls, live feed, trend charts, type distribution, and incidents table. Recommended approach: full rewrite like the layouts, keeping all Recharts/Leaflet inline styles.

---

## Traps to avoid

- **Recharts/Leaflet inline styles must stay** — those libraries require them. Only migrate wrapper divs.
- **`isMobile` state in Analytics.tsx** — still needed for Recharts responsive props (tick sizes, margins, chart heights). Don't remove it even though wrapper styles now use Tailwind responsive classes.
- **`citizen-only-mobile` / `citizen-only-desktop`** — these CSS classes at 900px breakpoint are consumed by CitizenDashboard, CitizenDesktopNav, CitizenMobileMenu. Don't remove from CitizenPageLayout's `<style>` until Phase 5.
- **Port 5173/5174 may be blocked** on this Windows setup — vite.config.ts has port change to 4173.
- **Tests use `node:test` runner**, NOT Jest or Vitest.
- **`AUTH_SPIN_STYLE`** is exported as empty string from AuthLayout.tsx — some files may still import it.

---

## Next steps (priority order)

1. **Commit all unstaged changes** — `git add` the 9 modified source files + session-handoff.md, commit with descriptive message.
2. **Dashboard.tsx** — Migrate 144 inline styles to Tailwind. This is the biggest remaining file. Key sub-components: KPICard, AlertBanner, cross-border alerts section, heatmap section, map toolbar, live feed, trend chart, type distribution, incidents table.
3. **Incidents.tsx** — 115 inline styles → Tailwind.
4. **Reports.tsx** — 139 inline styles → Tailwind.
5. **Phase 5: Citizen + SuperAdmin Pages** — CitizenDashboard (2,322 lines), IncidentReport (2,658 lines), CitizenMyReports, CitizenVerification, 5 SA pages. Wire `BottomNav` into citizen portal, wire `CitizenOnboardingModal`.
6. **Phase 6: Landing + Map CSS + Cleanup** — Landing.tsx, map-view.css token unification, mobile.css dead selector cleanup, final audit.

---

## Relevant file paths

- `CLAUDE.md` — Project rules and constraints
- `AGENTS.md` / `ARCHITECTURE.md` — Detailed architecture reference
- `design-analysis-plan.md` — Full page-by-page breakdown and component inventory
- `src/styles/theme.css` — Design tokens (updated in Phase 0)
- `src/app/components/BottomNav.tsx` — Shared bottom nav (Phase 1, updated Phase 3)
- `src/app/components/VerificationProgressCard.tsx` — Shared verification card (Phase 1, wired Phase 3)
- `src/app/components/CitizenOnboardingModal.tsx` — Built in Phase 1, not yet wired
- `src/app/components/Layout.tsx` — Official layout (rewritten Phase 3)
- `src/app/pages/superadmin/SuperAdminLayout.tsx` — SA layout (rewritten Phase 3)
- `src/app/components/CitizenPageLayout.tsx` — Citizen layout (rewritten Phase 3)
- `src/app/pages/Dashboard.tsx` — **NEXT TARGET** (1,059 lines, 144 inline styles)
- `src/app/pages/Incidents.tsx` — Next after Dashboard (1,301 lines)
- `src/app/pages/Reports.tsx` — Next after Incidents (1,184 lines)
