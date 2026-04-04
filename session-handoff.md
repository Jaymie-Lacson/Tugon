# Session Handoff

## What was accomplished this session

### 1. Collapsible sidebar (both official + super admin)
- Added `w-72` ↔ `w-[68px]` collapsible sidebar to `Layout.tsx` (official) and `SuperAdminLayout.tsx`
- Icon-only mode when collapsed, with native `title` tooltips
- Logo compacts to "T" when collapsed
- Collapse toggle button with `ChevronsLeft`/`ChevronsRight` icons at bottom of nav
- User footer compacts to avatar-only with name tooltip when collapsed
- Monitoring strip (super admin) hidden when collapsed
- State persisted to localStorage (`tugon-sidebar-collapsed` for official, `tugon-sa-sidebar-collapsed` for super admin)
- Removed blue "New Report" button (official) and "District Overview" button (super admin) from sidebar
- Removed blue "New Report" button from mobile drawer (official)

### 2. Mobile nav refactor — Layout.tsx (official) ONLY (partially done, NOT verified)
Modified `src/app/components/Layout.tsx`:
- Removed `BottomNav` import and `officialBottomNavDefs` import
- Removed `BOTTOM_NAV_ITEMS` computation
- Removed `<BottomNav>` JSX and `pb-16` from main
- Added `useRef`, `mobileSearchOpen`, `searchQuery`, `mobileSearchRef` states
- Updated `location.pathname` effect to reset `mobileSearchOpen`
- Added useEffect to focus mobile search input when opened
- Updated Escape key handler to also close `mobileSearchOpen`
- Added `handleSearch` that navigates to `/app/incidents?search=<query>`
- Removed the old left-sliding mobile drawer entirely
- Restructured header:
  - Mobile: just page name on left, hamburger moved to **upper right**
  - Added mobile **search icon button** next to hamburger
  - Desktop search bar is now **functional** (wrapped in form, bound to `searchQuery` state, submits via `handleSearch`)
- Added landing-page-style dropdown panel inside `<header>`:
  - Dark bg `rgba(15,23,42,0.98)`, `top-full` absolute position
  - `maxHeight` + `opacity` + `transform` animated (cubic-bezier(0.2,0.65,0.3,1), 320ms)
  - Staggered nth-child transition-delays (40ms increments)
  - Includes all NAV_ITEMS + Settings + Sign Out button
- Added mobile search bar dropdown (also inside header, absolute top-full)
- Added `<style>` block for staggered animations + reduced-motion support

## Current state

### Working
- Collapsible sidebar feature works on both official and super admin layouts (verified with build earlier).
- Earlier build of Layout.tsx and SuperAdminLayout.tsx with collapsible sidebar passed.

### Incomplete / Unverified
- **Layout.tsx mobile nav refactor is NOT build-verified.** The build command was interrupted by the user before verification. The file compiles in theory but needs a real build run.
- **SuperAdminLayout.tsx mobile nav refactor is NOT STARTED.** Still has old left-sliding mobile drawer, old bottom nav, hamburger on left.
- **CitizenPageLayout.tsx is NOT MODIFIED.** Still renders `<BottomNav>`.
- **CitizenMobileMenu.tsx is NOT MODIFIED.** Still a horizontal scrollable tab bar with a floating Report FAB. Needs conversion to hamburger dropdown.
- **Citizen pages (CitizenDashboard.tsx, CitizenMyReports.tsx, CitizenVerification.tsx, IncidentReport.tsx)** still use the old CitizenMobileMenu — they will pick up changes automatically when CitizenMobileMenu is refactored.

## Files modified

- `src/app/components/Layout.tsx` — Collapsible sidebar + mobile nav refactor (hamburger on right, functional search, dark dropdown panel, removed BottomNav)
- `src/app/pages/superadmin/SuperAdminLayout.tsx` — Collapsible sidebar only. Mobile nav refactor NOT yet applied.
- `session-handoff.md` — This file

## Open decisions

- **Search routing:** Currently official search navigates to `/app/incidents?search=<query>`. Unclear whether the Incidents page actually reads the `search` URL param — need to verify or implement that consumer.
- **Super admin search target:** Should navigate to `/superadmin?search=` or `/superadmin/audit-logs?search=`? Not decided. User's current search bar placeholder says "Search users, barangays, or audits..."
- **Citizen search:** User didn't explicitly request search for citizens (citizen has no existing search bar). Decision was to skip search for citizens. Confirm with user if needed.
- **Mobile nav backdrop:** Landing page has no backdrop behind its dropdown. Current Layout.tsx implementation also has no backdrop — user taps hamburger to close. Confirm if a click-outside-to-dismiss is desired.
- **Citizen breakpoint:** CitizenPageLayout uses 900px as desktop breakpoint, but Tailwind `lg:` is 1024px. When refactoring CitizenMobileMenu, will need custom CSS media queries (`@media (min-width: 901px)`) rather than Tailwind `lg:hidden`.

## Traps to avoid

- **Do NOT rename `mobileDrawerOpen`** in Layout.tsx — it's reused for the new dropdown panel to minimize edits.
- **Header has `relative` positioning**, so the absolute-positioned dropdown panels attach to it correctly. Don't break that.
- **Dropdown panel z-index:** Inside the header (which has `z-[90]` on official, `z-[2600]` on super admin). Search bar uses `z-[2]`, nav dropdown uses `z-[1]` (both inside header's stacking context).
- **Header parent has `overflow-hidden`** (`<div className="flex min-w-0 flex-1 flex-col overflow-hidden">`) — the absolute dropdowns were tested to NOT clip because they extend into the main content area which is still within parent bounds. Don't move dropdowns outside the header.
- **`autoFocus` doesn't work with animated container** — use ref + `setTimeout(() => ref.current?.focus(), 100)` after mobileSearchOpen becomes true. Already implemented this way in Layout.tsx.
- **citizen-only-mobile class** in CitizenPageLayout.tsx applies `display: block !important` — this breaks `display: flex` on buttons. When refactoring CitizenMobileMenu, use a custom class like `citizen-mobile-hamburger` with custom media query instead.
- **CitizenMobileMenu's floating Report FAB** is positioned `bottom-[calc(env(safe-area-inset-bottom,0px)+72px)]` — the +72px offset accounted for BottomNav height. Without BottomNav, this offset should be removed OR the FAB should be dropped entirely in favor of putting Report in the hamburger menu.
- **CitizenMobileMenu's style block** adds `padding-top: 60px` to `.citizen-page-layout-main` on mobile — this was to offset the tab bar at `top-[60px]`. Without the tab bar, this padding should be removed.

## Next steps (in priority order)

1. **Verify Layout.tsx builds.** Run `npx vite build` and check for errors/warnings.
2. **Apply the same mobile nav refactor to `SuperAdminLayout.tsx`:**
   - Remove `BottomNav`, `superAdminBottomNavDefs`, `BOTTOM_NAV_ITEMS`
   - Add `mobileSearchOpen`, `searchQuery`, `mobileSearchRef` states
   - Update effects (location.pathname, Escape, focus on search open)
   - Add `handleSearch` (navigate to `/superadmin?search=` or decide target)
   - Remove old left-sliding mobile drawer block
   - Restructure header: move hamburger to right, add mobile search button, make desktop search functional
   - Add dark dropdown panel with NAV_ITEMS + monitoring strip (or just NAV_ITEMS) + Sign Out
   - Add mobile search bar dropdown
   - Add `<style>` block for staggered animations
   - Remove `<BottomNav>` JSX, remove `pb-16` from main
3. **Remove BottomNav from `CitizenPageLayout.tsx`:**
   - Remove `BottomNav` import and `DEFAULT_BOTTOM_NAV_ITEMS`
   - Remove `<BottomNav items={DEFAULT_BOTTOM_NAV_ITEMS} />` from JSX
   - Remove `hideBottomNav` prop (or keep for backward compat?)
   - Change `mobileMainPaddingBottom` default from `84` to `20` (no more bottom nav height to account for)
4. **Refactor `CitizenMobileMenu.tsx` from tab bar to hamburger dropdown:**
   - Keep the same `CitizenMobileMenu` component name + props (activeKey, onNavigate) so citizen pages don't need changes
   - Replace horizontal tab bar with a hamburger button + dark dropdown panel (landing page style)
   - Hamburger button styled with white/transparent background to match the `bg-primary` citizen header
   - Drop the floating Report FAB (Report is now in the hamburger menu)
   - Remove the `padding-top: 60px` style that offset for the tab bar
   - Use custom `citizen-mobile-hamburger` / `citizen-mobile-nav-panel` classes with `@media (min-width: 901px) { display: none !important }`
   - Animate with landing-page pattern (maxHeight + opacity + transform, cubic-bezier curve, staggered delays)
   - Include all `citizenNavDefs` items + a Sign Out button at the bottom (check if sign out should be here or in notifications menu)
5. **Final verification:** Run `npx vite build` after all changes, test each role's mobile view.

## Relevant file paths

### Currently-modified files
- `src/app/components/Layout.tsx` — Official layout, mobile nav refactor done, NOT build-verified
- `src/app/pages/superadmin/SuperAdminLayout.tsx` — Collapsible sidebar done, mobile nav refactor NOT started

### Files to modify next
- `src/app/components/CitizenPageLayout.tsx` — Remove BottomNav
- `src/app/components/CitizenMobileMenu.tsx` — Convert to hamburger dropdown
- `src/app/components/BottomNav.tsx` — May be unused after refactor; check if safe to delete

### Reference files (do NOT modify)
- `src/app/pages/Landing.tsx` (lines 268-319 + styles at 340-343) — Source of truth for mobile nav design/animation pattern
- `src/app/data/navigationConfig.ts` — Nav item definitions for all three roles
- `src/app/pages/CitizenDashboard.tsx` (line 619) — How CitizenMobileMenu is consumed
- `src/app/pages/CitizenMyReports.tsx` (line 1305) — How CitizenMobileMenu is consumed
- `src/app/pages/CitizenVerification.tsx` (line 412) — How CitizenMobileMenu is consumed
- `src/app/pages/IncidentReport.tsx` (line 2009) — How CitizenMobileMenu is consumed

### Landing page hamburger design tokens (copy this pattern)
```
- Button size: size-10 on landing, use size-9 in app
- Border: border-white/[0.15], bg-white/[0.08]
- Active state: scale-[0.97] !bg-white/20
- Icon: Menu/X at size 18-20, color white
- Panel bg: rgba(15,23,42,0.98)
- Panel animation: max-height 320ms cubic-bezier(0.2,0.65,0.3,1),
                   opacity 220ms ease,
                   transform 220ms ease,
                   padding 220ms ease
- Item stagger: 40ms delay increments (nth-child 1 through 5+)
- Nav item: border-bottom white/[0.06], 15px semibold, white/[0.82]
```
