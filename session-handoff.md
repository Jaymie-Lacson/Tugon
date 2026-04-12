# Session Handoff — Dark Mode Phase 4 Complete, Phase 5 In Progress
_Date: 2026-04-12_

---

## What was accomplished this session

### Build verification (pre-work)
- Ran `/check` skill: Prisma schema valid, backend build ✅, frontend build ✅
- Prisma generate EPERM (DLL locked by another process) — skipped safely, existing client current

### Phase 3 commit (from prior session)
- Committed all citizen portal dark mode changes: ThemeProvider, ThemeToggle, 4 citizen pages, 6 small components
- Commit: `f956bb3 feat(theme): implement dark mode for citizen portal — Phase 3`

### Phase 4 — Official portal dark mode (COMPLETE, committed)
All 6 files migrated + committed: `04b2f66 feat(theme): implement dark mode for official portal — Phase 4`

- **Dashboard.tsx**: KPICard, AlertBanner, cross-border alerts, heatmap section, map preview (mode toggle, tuning panel, selected incident footer), live feed, charts row, incident queue — full migration. Error banners → error-container. Unread alerts conditional → error-container. Critical chip borders → `var(--error)/30`.
- **Incidents.tsx**: All slate tokens. `border-t-[#0F172A]` → `border-t-foreground`. Error banner → severity-critical/error-container.
- **Reports.tsx**: All slate tokens. Template card footer `bg-slate-50` → `bg-muted/50`. `text-red-700` → `var(--error)`.
- **Analytics.tsx**: All `bg-white` and slate text tokens. `bg-slate-600` chart legend dot intentionally preserved (categorical color).
- **Verifications.tsx**: All bg-white/border-slate-*. Card headers `bg-slate-50` → `bg-muted/50`. Error banner → severity-critical. Preview modal ID card headers migrated.
- **AdminNotifications.tsx**: `border-[#E2E8F0]`, `text-[#1E293B]`, `text-[#64748B]`, `text-[#94A3B8]`, `text-[#334155]` all replaced. `border-[#F1F5F9]` → `border-border/60`. Unread `bg-[#EFF6FF]` → `bg-primary/5`.

**Settings.tsx and MapView.tsx were already clean (0 hardcoded color hits) — no changes needed.**

### Phase 5 — Auth + Settings (STARTED, NOT committed)

#### AuthLayout.tsx — COMPLETE (not committed)
- `bg-red-50 shadow-[inset_0_-2px_0_#dc2626]` → `bg-[var(--error-container)] shadow-[inset_0_-2px_0_var(--severity-critical)]` (InputField error state)
- `text-red-700` → `text-[var(--error)]` (InputField error message)
- Left branding panel gradient intentionally preserved (`#00194f` → `#1e3a8a`), as decided in prior session

#### Settings.tsx — PARTIALLY COMPLETE (not committed)
Done:
- Added `import { Monitor } from 'lucide-react'`
- Added `import { useTheme } from 'next-themes'`
- Added `const { theme, setTheme } = useTheme()` in component body
- Fixed `text-[#2563EB]` → `text-primary` (role badge)
- Added "Appearance" nav item in left sidebar (with Monitor icon)

**NOT YET DONE — the Appearance section content block in the main panel has not been added.**

---

## Current state

### Working
- All token infrastructure complete (`theme.css`, `--citizen-header-bg`, 16 dark tokens)
- ThemeToggle placed in all 4 citizen page headers
- Phase 3: All citizen pages/components fully migrated
- Phase 4: All official portal pages/components fully migrated — committed, build verified
- AuthLayout.tsx error states migrated

### Incomplete / not verified
- **Settings.tsx Appearance section content not written** — `useTheme` is imported and the sidebar nav item is added, but the System/Light/Dark radio buttons in the main content panel are missing
- **Phase 5 build NOT verified** — AuthLayout.tsx and Settings.tsx changes are uncommitted and unbuilt
- **Phase 6 (mobile.css deeper polish)** — not started
- **Phase 7 (Leaflet dark tiles)** — not started

---

## Files modified (this session, uncommitted)

| File | Change |
|---|---|
| `src/app/components/AuthLayout.tsx` | InputField error state: `bg-red-50` → error-container; `text-red-700` → `var(--error)` |
| `src/app/pages/Settings.tsx` | Added `useTheme` import + `Monitor` icon; `const { theme, setTheme }` hook; "Appearance" sidebar nav item; `text-[#2563EB]` → `text-primary`; **Appearance content section still missing** |

---

## Open decisions

- **Auth page gradient**: `AuthLayout.tsx` hardcoded blue gradient (`#00194f` to `#1e3a8a`) on brand panel — confirmed to keep as brand element. Only form panel gets token migration.
- **Leaflet dark tiles**: Phase 6 will need CARTO dark tile URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`. Not yet committed.
- **Settings Appearance layout**: Use the same button-group pattern as the Language section. Three buttons: System / Light / Dark. Active = `bg-primary text-white shadow-sm`. Inactive = `bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]`.
- **`incidentTypeChipClass` in MapTab** (CitizenDashboard): categorical label chips use non-semantic Tailwind colors (`bg-blue-100 text-blue-700` etc.) — intentionally deferred.

---

## Traps to avoid

- **`bg-white/[n]` opacity variants**: NOT the same string as `bg-white` — replace_all for `bg-white` is safe and won't touch `bg-white/[0.08]` etc.
- **`legendDotClass` / `trendLegendDotClass`**: `bg-slate-600` / `bg-slate-400` in chart legend dot functions are intentional categorical colors — do not migrate.
- **`bg-red-500` / `bg-emerald-500`** in Incidents.tsx table status dots — intentional status indicators, do not migrate.
- **Analytics.tsx `bg-slate-600`** (line 37, `trendLegendDotClass`) — intentional chart categorical dot, left as-is.
- **Prisma generate EPERM on Windows**: Kill dev server before running `prisma:generate`.
- **Routes.ts is `.ts` not `.tsx`**: No JSX.
- **`theme` from `useTheme` can be `undefined` initially** — the Appearance section should handle this gracefully. Use `theme === 'system'` etc., which works fine even if `theme` is undefined (will just show none active).

---

## Next steps (in order)

### 1. Complete Settings.tsx Appearance section content
Add the following block **after the Language section's closing `</div>` (line 132)** and **before the outer `</div>` (line 133)**:

```tsx
          <div className="mt-[18px] mb-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--on-surface-variant)]">
            Appearance
          </div>
          <div className="border-b border-[var(--outline-variant)]/35 py-3.5">
            <div className="mb-1 text-[13px] font-semibold text-[var(--on-surface)]">Theme</div>
            <div className="mb-3 text-[11px] text-[var(--on-surface-variant)]">Choose how TUGON looks on your device.</div>
            <div className="flex gap-2 flex-wrap">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors capitalize ${
                    theme === t
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                  }`}
                >
                  {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </div>
```

### 2. Run build and verify
```bash
npm run build:server
npm run build
```

### 3. Commit Phase 5
```bash
git add src/app/components/AuthLayout.tsx src/app/pages/Settings.tsx
git commit -m "feat(theme): implement dark mode for auth + settings — Phase 5"
```

### 4. Phase 6 — mobile.css deeper polish
- Review `src/styles/mobile.css` for any remaining hardcoded light-mode colors
- Add Leaflet dark tile swap when `.dark` class is present (in `IncidentMap.tsx` or via CSS)

---

## Relevant file paths

| Purpose | Path |
|---|---|
| Implementation plan (7 phases) | `.claude/plans/hazy-puzzling-nest.md` |
| Theme tokens (complete) | `src/styles/theme.css` |
| ThemeProvider | `src/app/providers/ThemeProvider.tsx` |
| ThemeToggle (className prop) | `src/app/components/ThemeToggle.tsx` |
| Mobile CSS | `src/styles/mobile.css` |
| AuthLayout (**Phase 5, DONE, uncommitted**) | `src/app/components/AuthLayout.tsx` |
| Settings (**Phase 5, PARTIAL, uncommitted**) | `src/app/pages/Settings.tsx` |
| Dashboard (**DONE**) | `src/app/pages/Dashboard.tsx` |
| Incidents (**DONE**) | `src/app/pages/Incidents.tsx` |
| Reports (**DONE**) | `src/app/pages/Reports.tsx` |
| Analytics (**DONE**) | `src/app/pages/Analytics.tsx` |
| Verifications (**DONE**) | `src/app/pages/Verifications.tsx` |
| AdminNotifications (**DONE**) | `src/app/components/AdminNotifications.tsx` |
| CitizenDashboard (**DONE**) | `src/app/pages/CitizenDashboard.tsx` |
| IncidentReport (**DONE**) | `src/app/pages/IncidentReport.tsx` |
| CitizenMyReports (**DONE**) | `src/app/pages/CitizenMyReports.tsx` |
| CitizenVerification (**DONE**) | `src/app/pages/CitizenVerification.tsx` |
