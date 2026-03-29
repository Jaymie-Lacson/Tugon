# Session Handoff — 2026-03-29 (UI/UX Redesign, Session 8)

**Branch:** `redesign`
**Build status:** PASSING ✓ — verified after all changes.
**All changes staged but NOT yet committed** — commit with the session handoff.

---

## What was accomplished this session

### 1. Wired BottomNav into CitizenPageLayout

- Added `BottomNav` (4 items: Home, Report, My Reports, Verify) as a permanent fixture in `CitizenPageLayout`.
- Added `CitizenOnboardingModal` to `CitizenPageLayout` (self-manages open/close via localStorage).
- Added `hideBottomNav?: boolean` prop (default `false`) for pages whose own footer would conflict.
- `IncidentReport.tsx` passes `hideBottomNav` to avoid its sticky back/submit footer being covered by the fixed BottomNav.
- BottomNav nav items: Home (`/citizen`, exact), Report (`/citizen/report`), My Reports (`/citizen/my-reports`), Verify (`/citizen/verification`).

### 2. Phase 6 — CSS token unification + dead selector cleanup

#### `Landing.tsx` — token unification
- All `'#1E3A8A'` JS string literals → `'var(--primary)'`
- All `'#B91C1C'` → `'var(--severity-critical)'`
- All `'#B4730A'` → `'var(--severity-medium)'`
- CSS-in-JSX `<style>` block: hex values for `.skip-link` border and `.auth-redirect-ring` border colors replaced with CSS variables.

#### `map-view.css` — token unification
- All `color: #1e3a8a` → `color: var(--primary)`
- All `background: #1e3a8a` → `background: var(--primary)`
- All `border: 1px solid #1e3a8a` → `border: 1px solid var(--primary)`
- All `color: #b91c1c` → `color: var(--severity-critical)`
- All `color: #b4730a` → `color: var(--severity-medium)`
- All `color: #059669` → `color: var(--severity-low)`

#### `mobile.css` — dead selector cleanup + token unification
Dead selectors removed (had no matching elements in any TSX file):
- `.page-content`, `.kpi-grid`, `.dashboard-row`, `.charts-row`
- `.dss-stats-row`, `.reports-tabs`
- `.incidents-filter-bar`, `.incidents-page-header` / `.log-btn`
- `.map-toggle-btn` (both in `max-width: 768px` and `min-width: 769px` blocks)
- `.sa-bottom-nav`, `.sa-main-content`, `.bottom-nav-bar`

Remaining hardcoded colors tokenized:
- `.citizen-report-header`: `background: #1e3a8a` → `var(--primary)`
- `.citizen-report-profile-btn`: `background: #b4730a` → `var(--severity-medium)`
- `.citizen-report-profile-menu-item-danger`: `color: #b91c1c` → `var(--severity-critical)`
- `.citizen-report-next-btn.is-default`: `background: #1e3a8a` → `var(--primary)`
- `.citizen-report-next-btn.is-submit`: `background: #b91c1c` → `var(--severity-critical)`
- `.citizen-report-submit-error`: `color: #b91c1c` → `var(--severity-critical)`

### 3. Final audit — citizen-page token unification

Swept all 4 citizen-facing pages that were migrated in earlier phases. Replaced:
- JS single-quoted string literals: `'#1E3A8A'` → `'var(--primary)'`, `'#B91C1C'` → `'var(--severity-critical)'`, `'#B4730A'` → `'var(--severity-medium)'`
- Tailwind arbitrary values: `bg-[#1E3A8A]` → `bg-primary`, `text-[#1E3A8A]` → `text-primary`, `bg-[#B4730A]` → `bg-severity-medium`, `text-[#B4730A]` → `text-severity-medium`, `text-[#B91C1C]` → `text-severity-critical`
- JSX icon `color` props: `color="#1E3A8A"` → `color="var(--primary)"`, `color="#B91C1C"` → `color="var(--severity-critical)"`, `color="#B4730A"` → `color="var(--severity-medium)"`
- `accent` props in CitizenDashboard component data objects similarly tokenized.
- `'2.5px solid #1E3A8A'` border string in IncidentReport → `'2.5px solid var(--primary)'`

---

## Current state

### Working (confirmed with `npm run build`)
- `CitizenPageLayout` — BottomNav + CitizenOnboardingModal wired ✓
- `IncidentReport.tsx` — hideBottomNav, 74 legitimate inline styles, gradient strings intact ✓
- `Landing.tsx` — all 3 design token colors use CSS variables ✓
- `map-view.css` — fully tokenized ✓
- `mobile.css` — dead selectors removed, remaining colors tokenized ✓
- `CitizenDashboard.tsx` — all token violations fixed except intentional gradients ✓
- `CitizenMyReports.tsx` — all token violations fixed ✓
- `CitizenVerification.tsx` — all token violations fixed ✓

### Intentionally left (not regressions)
- Multi-stop CSS gradients in CitizenDashboard and IncidentReport like `linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)` — these intentionally blend the token color with a darker shade for visual depth; cannot be replaced with a single variable.
- Official/admin pages (Dashboard.tsx, Incidents.tsx, Analytics.tsx, Reports.tsx, MapView.tsx, superadmin/*.tsx, auth/*.tsx, Layout.tsx, etc.) — outside the citizen-facing redesign scope. They still have hardcoded colors but were not part of Phases 1–6.

---

## Files modified

| File | Summary |
|------|---------|
| `src/app/components/CitizenPageLayout.tsx` | Added BottomNav (4 citizen nav items) + CitizenOnboardingModal; added `hideBottomNav` prop |
| `src/app/pages/IncidentReport.tsx` | `hideBottomNav` prop added; all JS string/Tailwind token colors tokenized; icon color props tokenized |
| `src/app/pages/CitizenDashboard.tsx` | All JS string, Tailwind arbitrary, and `accent` prop token colors tokenized |
| `src/app/pages/CitizenMyReports.tsx` | All JS string, Tailwind arbitrary, and icon color prop token colors tokenized |
| `src/app/pages/CitizenVerification.tsx` | All JS string and Tailwind arbitrary token colors tokenized |
| `src/app/pages/Landing.tsx` | All `'#1E3A8A'`, `'#B91C1C'`, `'#B4730A'` inline style strings + CSS-in-JSX block tokenized |
| `src/styles/map-view.css` | All primary/severity token colors replaced with CSS variables |
| `src/styles/mobile.css` | 11 dead selector blocks removed; remaining hardcoded token colors replaced with CSS variables |

---

## Open decisions

- **Official/admin page token sweep** — Not done this session. Pages like `Dashboard.tsx`, `Incidents.tsx`, `Analytics.tsx`, `Reports.tsx`, `MapView.tsx`, `superadmin/*.tsx`, `Layout.tsx`, `AdminNotifications.tsx`, `IncidentMap.tsx`, `OfficialPageInitialLoader.tsx` still have `#1E3A8A`, `#B91C1C`, `#B4730A` hardcoded. These were out of scope for the citizen redesign but are next candidates.
- **`SkeletonDemo.tsx`** — Uses `bg-[#1E3A8A]` as a demo element. Low priority (demo page), can be deferred or deleted.

---

## Traps to avoid

### Smart quotes from Edit tool — CRITICAL (persists from Session 7)
The Edit tool may substitute Unicode curly quotes (`"` U+201C, `"` U+201D) for ASCII double quotes in `className="..."` strings. Silently breaks TypeScript with "Invalid character" errors.

**Always run after any batch Edit session:**
```bash
node -e "
const fs=require('fs'),path=require('path');
function walk(dir){fs.readdirSync(dir).forEach(f=>{const p=path.join(dir,f);if(fs.statSync(p).isDirectory())walk(p);else if(p.endsWith('.tsx')||p.endsWith('.ts')){let c=fs.readFileSync(p,'utf8');const n=c.replace(/\u201C|\u201D/g,'\"').replace(/\u2018|\u2019/g,\"'\");if(n!==c){fs.writeFileSync(p,n,'utf8');console.log('Fixed: '+p);}}});}
walk('src');console.log('Done.');
"
```

### replace_all scope
When using `replace_all: true` for strings like `'#1E3A8A'`, verify the file was read first. Also be aware that `replace_all` on quoted JS strings (`'#1E3A8A'`) does NOT touch:
- JSX attribute double-quoted values: `color="#1E3A8A"` — needs a separate pass with `"#1E3A8A"`.
- Unquoted values inside CSS template literals — needs its own targeted replace.
- Multi-color gradient strings — do NOT replace these blindly.

### BottomNav conflict with IncidentReport footer
`IncidentReport` has a sticky bottom footer (`afterMain` slot). The layout-level `BottomNav` is `position: fixed, bottom: 0`. These would overlap on mobile without `hideBottomNav`. Any new page that adds its own sticky footer to `afterMain` must also pass `hideBottomNav` to `CitizenPageLayout`.

---

## Next steps (priority order)

1. **Token sweep: official/admin pages** — Apply the same pattern (`'#1E3A8A'` → `'var(--primary)'` etc.) across `Dashboard.tsx`, `Incidents.tsx`, `Analytics.tsx`, `Reports.tsx`, `MapView.tsx`, `superadmin/*.tsx`. Use replace_all + separate pass for `color="#..."` JSX attributes.
2. **Token sweep: shared components** — `Layout.tsx`, `AdminNotifications.tsx`, `IncidentMap.tsx`, `OfficialPageInitialLoader.tsx`, `CitizenNotifications.tsx`, `AuthLayout.tsx`.
3. **Auth pages** — `Login.tsx`, `Register.tsx`, `Verify.tsx`, `CreatePassword.tsx`, `ForgotPassword.tsx` still have hardcoded colors.
4. **`index.css` audit** — Check `src/styles/index.css` for any hardcoded token colors.
5. **After each editing session** — Run the smart-quote check script on all modified `.tsx` files.

---

## Relevant file paths

- `CLAUDE.md` — Project rules and constraints
- `AGENTS.md` / `ARCHITECTURE.md` — Detailed architecture reference
- `design-analysis-plan.md` — Full page-by-page breakdown and component inventory
- `src/styles/theme.css` — Design tokens (CSS variables + Tailwind mappings)
- `src/app/components/CitizenPageLayout.tsx` — Citizen layout with BottomNav + OnboardingModal wired
- `src/app/components/BottomNav.tsx` — Bottom nav component (already clean)
- `src/app/components/CitizenOnboardingModal.tsx` — Onboarding modal (already clean)
- `src/styles/map-view.css` — Fully tokenized ✓
- `src/styles/mobile.css` — Dead selectors removed, tokenized ✓
