# Session Handoff — Dark Mode Phase 3 (Citizen Portal, completed)
_Date: 2026-04-12_

---

## What was accomplished this session

### CitizenDashboard.tsx — FULLY MIGRATED
- **HomeTab body**: section dividers `border-slate-*` → `border-border`/`border-border/60`; all four section wrapper panels `bg-white border border-slate-200` → `bg-card border border-border`; heading text `text-[#0F172A]` → `text-foreground`; caption text `text-slate-400/500` → `text-muted-foreground`; "view all" buttons `border-slate-300 text-slate-600 hover:bg-slate-50` → `border-border text-muted-foreground hover:bg-muted/50`; emergency contact list `divide-slate-100` → `divide-border/60`
- **MapTab**: filter bar `bg-white border-b border-[var(--outline-variant)]` → `bg-card border-b border-border`; active filter pill `bg-white` → `bg-card`; map container `bg-white` → `bg-card`; empty card `bg-white` → `bg-card`; map modal `bg-white` → `bg-card`; modal close buttons `bg-white` → `bg-card`
- **ProfileTab**: avatar `bg-[#0F172A]` → `bg-[var(--inverse-surface)]`; page header `border-b border-slate-200` → `border-b border-border`; verification badge `border-slate-200 bg-white` → `border-border bg-card`; account info wrapper + rows `bg-white` → `bg-card`; action buttons `bg-white` → `bg-card`; all `text-slate-*` and `text-[#0F172A]` → semantic tokens
- **StatCard**: non-highlighted value `text-[#0F172A]` → `text-foreground`; label `text-slate-500` → `text-muted-foreground`
- **Dead code cleanup**: `_ReportTab` and `_MyReportsTab` stubs — `bg-white` → `bg-card`, `border-slate-200` → `border-border`, severity/type unselected states migrated

### IncidentReport.tsx — FULLY MIGRATED
- **replace_all migrations**: `border-[#E2E8F0]` → `border-border`; `text-[#1E293B]` → `text-foreground`; `text-[#64748B]` → `text-muted-foreground`; `text-[#94A3B8]` → `text-muted-foreground`; `text-[#475569]` → `text-muted-foreground`; `bg-[#F8FAFC]` → `bg-muted/50`; `bg-[#F1F5F9]` → `bg-muted`; `border-[#CBD5E1]` → `border-border`; `text-[#CBD5E1]` → `text-muted-foreground/50`
- **Individual**: StepIndicator bar `bg-white border-b border-slate-200` → `bg-card border-b border-border`; step connector `bg-slate-200` → `bg-muted`; all 4 severity button unselected `bg-white` → `bg-card`; category card unselected `bg-white border-[#E8EEF4]` → `bg-card border-border`; subcategory section `bg-white` → `bg-card`; textarea `bg-white focus:border-[#3B82F6]` → `bg-card focus:border-primary`; affected count unselected `bg-white` → `bg-card`; photo card `bg-white` → `bg-card`; voice card `bg-white` → `bg-card`; review summary card `bg-white` → `bg-card`
- **Warning/disclaimer boxes**: `bg-[#FFFBEB]` → `bg-[var(--severity-medium-bg)]`; `border-[#FDE68A]` → `border-[var(--secondary-fixed-dim)]`; `text-[#92400E]`/`text-[#78350F]` → `text-[var(--severity-medium)]`; step 5 badge `bg-[#FEF3C7]` → `bg-[var(--secondary-fixed)]`
- **Sign-out hover**: `hover:bg-red-50` → `hover:bg-[var(--error-container)]`
- **ThemeToggle**: import added; placed in header between actions div and CitizenMobileMenu
- **Intentionally left**: `bg-white` on SuccessScreen "Done" button (white on dark primary gradient overlay)

### CitizenMyReports.tsx — FULLY MIGRATED
- **replace_all migrations**: `text-slate-500/400/600/300/900` → semantic; `text-[#0F172A]` → `text-foreground`; `border-b border-slate-200` → `border-b border-border`; `border-slate-100` → `border-border/60`; `bg-slate-100` → `bg-muted`; `bg-slate-200` → `bg-muted`; all `bg-white` → `bg-card`
- **Header**: `bg-primary` → `bg-[var(--citizen-header-bg)]`
- **Report detail modal header**: `bg-primary text-white` → `bg-[var(--citizen-header-bg)] text-white`
- **Sign-out hover**: `hover:bg-red-50` → semantic
- **Photo preview overlay**: header `text-slate-200` → `text-[var(--inverse-on-surface)]`; close button `bg-[#0F172A] border-[#334155] text-slate-200` → `bg-[var(--inverse-surface)] border-[var(--on-surface-variant)]/30 text-[var(--inverse-on-surface)]`
- **Timeline separator**: `text-slate-200` → `text-border/60`
- **ThemeToggle**: import added; placed in header

### CitizenVerification.tsx — FULLY MIGRATED
- **replace_all migrations**: `text-slate-500/400/600` → `text-muted-foreground`; `text-[#0F172A]` → `text-foreground`; `border-b border-slate-200` → `border-b border-border`; `bg-slate-200 text-slate-700` → `bg-muted text-muted-foreground`; all `bg-white` → `bg-card`
- **Status badge classes** (5 states migrated):
  - `border-slate-300 bg-slate-50 text-slate-600` → `border-border bg-muted text-muted-foreground`
  - `border-red-300 bg-red-100 text-red-800` → `border-[var(--error)] bg-[var(--error-container)] text-[var(--error)]`
  - `border-emerald-300 bg-emerald-100 text-emerald-800` → `border-[var(--severity-low)] bg-[var(--severity-low-bg)] text-[var(--severity-low)]`
  - `border-amber-300 bg-amber-100 text-amber-800` → `border-[var(--secondary-fixed-dim)] bg-[var(--severity-medium-bg)] text-[var(--severity-medium)]`
  - `border-orange-300 bg-orange-100 text-orange-800` → `border-[var(--secondary-fixed-dim)] bg-[var(--severity-medium-bg)] text-[var(--severity-medium)]`
- **Header**: `bg-primary` → `bg-[var(--citizen-header-bg)]`
- **Back button**: `border-slate-300 text-muted-foreground hover:bg-slate-50` → `border-border text-muted-foreground hover:bg-muted/50`
- **Sign-out hover**: `hover:bg-red-50` → semantic
- **ThemeToggle**: import added; placed in header

---

## Current state

### Working
- All token infrastructure complete (`theme.css`, `--citizen-header-bg`, 16 dark tokens)
- ThemeToggle placed in all 4 citizen page headers (CitizenDashboard, IncidentReport, CitizenMyReports, CitizenVerification)
- All small citizen components (BottomNav, CitizenMobileMenu, CitizenNotifications, CitizenOnboardingModal, VerificationProgressCard) migrated from prior session
- All 4 main citizen pages fully migrated to semantic tokens

### Incomplete / not verified
- **Build NOT verified** — the `/check` skill was interrupted before running. Must run before committing any of this session's work.
- **Phase 4 (Official portal dark mode)** — not started
- **Phase 5 (Auth + Settings)** — not started
- **Phase 6 (AuthLayout gradient panel)** — not started
- **Phase 7 (mobile.css deeper polish)** — not started

---

## Files modified

| File | Change |
|---|---|
| `src/app/pages/CitizenDashboard.tsx` | Full body migration — HomeTab, MapTab, ProfileTab, all `text-slate-*`, `bg-white`, `border-slate-*` → semantic tokens; dead code stubs cleaned up |
| `src/app/pages/IncidentReport.tsx` | Full migration — all `#E2E8F0/#1E293B/#64748B/#94A3B8/#F8FAFC/#F1F5F9` hex → tokens; warning boxes → severity tokens; ThemeToggle added to header |
| `src/app/pages/CitizenMyReports.tsx` | Full migration — headers, all `slate-*`, photo preview close → inverse-surface tokens, ThemeToggle added |
| `src/app/pages/CitizenVerification.tsx` | Full migration — all 5 status badge states → semantic tokens, ThemeToggle added, audio player migrated |

---

## Open decisions

- **Auth page gradient**: `AuthLayout.tsx` has a hardcoded blue gradient (`#00194f` to `#1e3a8a`) on the brand panel. Plan: keep gradient as brand element, only migrate the form panel to semantic tokens. Implement in Phase 6.
- **Leaflet dark tiles**: Phase 4 will need a CARTO dark tile URL. Standard free option: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`. Not yet committed.
- **Settings Appearance section**: Phase 4 adds System / Light / Dark radio to `Settings.tsx`. Layout within existing settings page is undesigned.
- **Citizen header approach confirmed**: Brand header (`#00236f`) stays dark navy in both light AND dark mode — handled via `--citizen-header-bg`. `--primary` still flips to `#b6c4ff` in dark mode for content-area uses.
- **`incidentTypeChipClass` in MapTab** (CitizenDashboard): `infrastructure: 'bg-slate-200 text-slate-700'` and all other entries use non-semantic Tailwind colors (`bg-blue-100 text-blue-700` etc.). These are intentional categorical label chips — not migrated yet; acceptable scope deferral.

---

## Traps to avoid

- **`bg-white` on SuccessScreen "Done" button** (IncidentReport.tsx line ~1685): intentionally left as `bg-white` — it's a white button on a full-screen dark primary gradient overlay. `bg-card` would make it invisible in dark mode.
- **`bg-white/[n]` opacity variants**: NOT the same string as `bg-white` — replace_all for `bg-white` is safe and will NOT touch `bg-white/[0.08]` etc.
- **`border-[#E8EEF4]` ≠ `border-[#E2E8F0]`**: These are different hexes in IncidentReport. Handled separately; `border-[#E8EEF4]` was replaced via individual edit.
- **`_ReportTab` step bar** (CitizenDashboard line ~1165): `bg-white` inside `s <= step ? 'bg-white' : 'bg-white/30'` — intentionally left because it's an active-step indicator on a dark red gradient. Dead code, no dark mode rendering risk.
- **`replace_all` for tone classes already done in CitizenDashboard** from previous session — don't re-apply.
- **Routes.ts is `.ts` not `.tsx`**: No JSX.
- **Prisma generate EPERM on Windows**: Kill dev server before running `prisma:generate`.

---

## Next steps (in order)

### 1. FIRST: Verify the build passes
```bash
npm --prefix server run prisma:validate
npm --prefix server run prisma:generate
npm run build:server
npm run build
```
Fix any TypeScript errors before proceeding.

### 2. Commit Phase 3 citizen portal changes
Once build is green, commit everything from this session.

### 3. Phase 4 — Official portal dark mode
Key files to migrate:
- `src/app/pages/OfficialDashboard.tsx`
- `src/app/pages/IncidentDetail.tsx`
- `src/app/pages/IncidentList.tsx`
- `src/app/pages/Analytics.tsx`
- `src/app/pages/Settings.tsx` (also needs Appearance section for Phase 5)
- Official portal header/sidebar components

### 4. Phase 5 — Auth + Settings
- `src/app/pages/AuthLayout.tsx` (form panel only; keep gradient brand panel)
- `Settings.tsx` Appearance section (System / Light / Dark radio buttons)

### 5. Phase 6 — Final polish
- `src/styles/mobile.css` remaining dark mode gaps
- Leaflet dark tile swap when `.dark` class is present

---

## Relevant file paths

| Purpose | Path |
|---|---|
| Implementation plan (7 phases) | `.claude/plans/hazy-puzzling-nest.md` |
| Theme tokens (complete) | `src/styles/theme.css` |
| ThemeProvider | `src/app/providers/ThemeProvider.tsx` |
| ThemeToggle (className prop) | `src/app/components/ThemeToggle.tsx` |
| Mobile CSS | `src/styles/mobile.css` |
| CitizenDashboard (**DONE**) | `src/app/pages/CitizenDashboard.tsx` |
| IncidentReport (**DONE**) | `src/app/pages/IncidentReport.tsx` |
| CitizenMyReports (**DONE**) | `src/app/pages/CitizenMyReports.tsx` |
| CitizenVerification (**DONE**) | `src/app/pages/CitizenVerification.tsx` |
| OfficialDashboard (Phase 4, not started) | `src/app/pages/OfficialDashboard.tsx` |
| AuthLayout (Phase 5, not started) | `src/app/pages/AuthLayout.tsx` |
