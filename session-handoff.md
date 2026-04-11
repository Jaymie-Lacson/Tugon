# Session Handoff — Dark Mode Phase 3 (Citizen Portal, partial)
_Date: 2026-04-11_

---

## What was accomplished this session

### Foundation additions (theme.css)
- Added `--citizen-header-bg: #00236f` to `:root` — a brand-pinned token that never changes in dark mode, used for all citizen portal headers
- Added 16 missing dark mode overrides to the `.dark` block:
  - `--outline`, `--outline-variant` (border tokens now flip correctly)
  - `--error`, `--error-container` (error/destructive surfaces)
  - `--secondary`, `--secondary-fixed`, `--secondary-fixed-dim` (amber/warning surfaces)
  - `--primary-fixed`, `--primary-fixed-dim` (info/blue tint surfaces)
  - `--severity-critical`, `--severity-critical-bg`, `--severity-medium`, `--severity-medium-bg`, `--severity-low`, `--severity-low-bg` (status chip surfaces)

### ThemeToggle
- Added optional `className` prop so callers can override default styles (needed for placement on the dark navy citizen header, where semantic token colors have poor contrast)

### Small components — FULLY MIGRATED
- **BottomNav.tsx** — `bg-white` → `bg-card`
- **CitizenMobileMenu.tsx** — mobile nav panel `bg-primary` → `bg-[var(--citizen-header-bg)]` (stays dark navy in dark mode)
- **CitizenNotifications.tsx** — entire notifications panel migrated: `bg-white/border-slate-*/text-slate-*` → `bg-card/border-border/text-foreground/text-muted-foreground`; unread row `bg-blue-50` → `bg-accent`
- **CitizenOnboardingModal.tsx** — `bg-slate-200` step bar → `bg-muted`; `bg-blue-50` icon container → `bg-accent`
- **VerificationProgressCard.tsx** — all three status state color configs (pending/rejected/not_started) migrated from hardcoded `bg-amber-*/bg-red-*/bg-blue-*` to semantic `var(--severity-medium-bg)`, `var(--error-container)`, `var(--primary-fixed)` tokens; also fixed progress bar bg and CTA button bg
- **mobile.css** — `.citizen-report-header` background changed from `var(--primary)` → `var(--citizen-header-bg)` (prevents header turning lavender in dark mode)

### CitizenDashboard.tsx — PARTIALLY MIGRATED
- Import of `ThemeToggle` added
- Header `bg-primary` → `bg-[var(--citizen-header-bg)]`
- `<ThemeToggle>` inserted in header with white-on-dark-nav className
- All stat card tone configs: `bg-white` → `bg-card` (replace_all, 5 instances)
- Primary stat card: hardcoded `border-[#93C5FD] bg-[#DBEAFE]` → `border-[var(--primary-fixed-dim)] bg-[var(--primary-fixed)]`
- All quick action card tone configs: `bg-white` → `bg-card` (replace_all, 5 instances)
- Sign-out dropdown: `hover:bg-red-50 focus-visible:bg-red-50 active:bg-red-100/70` → `hover:bg-[var(--error-container)] focus-visible:bg-[var(--error-container)] active:bg-[var(--error-container)]/70`

---

## Current state

### Working
- All token infrastructure is in place — `.dark` block now covers borders, error surfaces, secondary/amber, primary-fixed, severity chips
- `--citizen-header-bg` is set; citizen headers in `CitizenDashboard`, `CitizenMobileMenu`, and the report form header (via CSS) are all pinned to dark navy in both themes
- ThemeToggle renders correctly on the dark navy citizen header
- All 6 small citizen components flip correctly in dark mode
- CitizenDashboard header + tone class configs are migrated

### Incomplete (interrupted mid-session)
- **CitizenDashboard.tsx content sections** — the page body still has many hardcoded colors:
  - `border-slate-200`, `border-slate-100`, `border-slate-300` on section dividers
  - `text-[#0F172A]`, `text-slate-400/500/600/900` on headings and captions
  - `bg-white border border-slate-200` on map preview, quick actions, recent activity, emergency contacts section wrappers
  - `divide-slate-100` on emergency contact list
  - `text-slate-500`, `text-slate-400` body text throughout
  - `hover:bg-slate-50` on "view all" buttons
  - Map tab: `bg-white` on filter bar and map empty card
  - Map modal: `bg-white` on the selected-incident popup
  - Profile tab: `bg-[#0F172A]` avatar, `text-[#0F172A]` headings, `border-slate-200 bg-white` on badges and account info rows, `bg-slate-50 border-slate-200` on status guide
- **IncidentReport.tsx** — not started (many hardcoded `#E2E8F0`, `#1E293B`, `#64748B`, `bg-white` values in all 5 steps)
- **CitizenMyReports.tsx** — not started (header `bg-primary`, report card `bg-white`, drawer, timeline colors)
- **CitizenVerification.tsx** — not started (header `bg-primary`, status badge hardcoded colors, section panels)
- **ThemeToggle not yet placed** in IncidentReport, CitizenMyReports, CitizenVerification headers
- **Build not verified** after this session's changes

---

## Files modified

| File | Change |
|---|---|
| `src/styles/theme.css` | Added `--citizen-header-bg` to `:root`; added 16 missing dark mode tokens to `.dark` |
| `src/app/components/ThemeToggle.tsx` | Added optional `className` prop (falls back to default if omitted) |
| `src/app/components/BottomNav.tsx` | `bg-white` → `bg-card` |
| `src/app/components/CitizenMobileMenu.tsx` | Mobile nav panel `bg-primary` → `bg-[var(--citizen-header-bg)]` |
| `src/app/components/CitizenNotifications.tsx` | Full panel migration to semantic tokens |
| `src/app/components/CitizenOnboardingModal.tsx` | 2 hardcoded color classes → semantic tokens |
| `src/app/components/VerificationProgressCard.tsx` | All 3 status state color configs + progress bar + CTA button → semantic tokens |
| `src/styles/mobile.css` | `.citizen-report-header` background → `var(--citizen-header-bg)` |
| `src/app/pages/CitizenDashboard.tsx` | Header token + ThemeToggle + tone class configs migrated; sign-out hover fixed |

---

## Open decisions

- **Auth page gradient**: `AuthLayout.tsx` has a hardcoded blue gradient (`#00194f` to `#1e3a8a`) on the brand panel. Plan: keep gradient as brand element, only migrate the form panel to semantic tokens. Implement in Phase 6.
- **Leaflet dark tiles**: Phase 4 will need a CARTO dark tile URL. Standard free option: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`. Not yet committed.
- **Settings Appearance section**: Phase 4 adds System / Light / Dark radio to `Settings.tsx`. Layout within existing settings page is undesigned.
- **Citizen header approach confirmed**: Brand header (`#00236f`) stays dark navy in both light AND dark mode — handled via `--citizen-header-bg`. `--primary` still flips to `#b6c4ff` in dark mode for content-area uses (links, buttons, etc.).

---

## Traps to avoid

- **`bg-white` vs `bg-white/[...]`**: `replace_all` on `"bg-white"` is safe only if the string is exactly `bg-white` with no `/` following. Tailwind partial-opacity variants like `bg-white/[0.08]` are intentional overlays on dark primary backgrounds (success screen, submission overlay, waveform) — do NOT migrate those.
- **`bg-primary` in IncidentReport step cards and buttons that are already on primary-colored backgrounds**: `bg-white/20`, `bg-white/25`, `bg-white/[0.06]` etc. in SuccessScreen and SubmissionLoadingOverlay are overlays on the full-screen primary gradient — leave them.
- **`border border-[#E2E8F0]` can be replaced globally in IncidentReport.tsx** — this hex only appears in that file. Use `replace_all` safely.
- **`text-[#1E293B]` appears only in IncidentReport.tsx** (CitizenDashboard uses `text-[#0F172A]` — different hex). Replace_all in each file separately.
- **`--outline-variant` in dark mode** is now `rgba(182, 196, 255, 0.18)` — test that sidebar borders and the official portal don't look too faint. The prior session's `.dark` block had no `--outline-variant` override so everything was using the light value.
- **`replace_all` for tone classes already done**: `'bg-white border border-[var(--outline-variant)]'` and `'border border-[var(--outline-variant)] bg-white'` are already migrated in CitizenDashboard. Don't re-apply.
- **Routes.ts is `.ts` not `.tsx`**: No JSX. Use `React.createElement` only if adding routes.
- **Prisma generate EPERM on Windows**: Kill dev server before running `prisma:generate`.
- **`bg-black/50` overlays**: Do NOT migrate `bg-black/50` in `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx`.

---

## Next steps (in order)

### 1. Complete CitizenDashboard.tsx content migrations
Read the file sections NOT yet migrated and apply:
- Section dividers: `border-b border-slate-200` → `border-b border-border`; `border-slate-100` → `border-border/60`; `border-slate-300` → `border-border`
- Section wrapper panels: `bg-white border border-slate-200` → `bg-card border-border` (map preview, quick actions, recent activity, emergency contacts)
- Text: `text-[#0F172A]` → `text-foreground`; `text-slate-400/500/600/900` → `text-muted-foreground`
- "View all" buttons: `border-slate-300 text-slate-600 hover:bg-slate-50` → `border-border text-muted-foreground hover:bg-muted/50`
- Map tab: `bg-white border-b border-[var(--outline-variant)]` filter bar → `bg-card border-b border-border`; `bg-white border border-[var(--outline-variant)]` empty card → `bg-card border border-[var(--outline-variant)]`; `bg-white` on map modal → `bg-card`
- Profile tab: `bg-[#0F172A]` avatar → `bg-[var(--inverse-surface)]`; `text-[#0F172A]` headings → `text-foreground`; `border-slate-200 bg-white text-slate-600` badge → `border-border bg-card text-muted-foreground`; account info rows `bg-white` → `bg-card`; `bg-white py-2.5` action buttons → `bg-card py-2.5`; `bg-slate-50 border-slate-200` status guide → `bg-muted/50 border-border`; `text-slate-500` status guide text → `text-muted-foreground`
- `divide-slate-100` → `divide-border/60`

### 2. IncidentReport.tsx migration
Use `replace_all: true` for these safe global replacements in the file:
- `border border-[#E2E8F0]` → `border border-border`
- `border-[#E2E8F0]` → `border-border`
- `text-[#1E293B]` → `text-foreground`
- `text-[#64748B]` → `text-muted-foreground`
- `text-[#94A3B8]` → `text-muted-foreground`
- `bg-[#F8FAFC]` → `bg-muted/50`
- `bg-[#F1F5F9]` → `bg-muted` (inactive step number circle)
Individual edits needed:
- StepIndicator: `bg-white border-b border-slate-200` → `bg-card border-b border-border`
- `bg-slate-200` step connector bar → `bg-muted`
- Severity button unselected: `bg-white` → `bg-card`
- Category card unselected: `bg-white border-[#E8EEF4]` → `bg-card border-border`
- Subcategory section: `bg-white border border-[#E2E8F0]` → `bg-card border border-border`
- Textarea: `bg-white focus:border-[#3B82F6]` → `bg-card focus:border-primary`
- Affected count unselected: `bg-white` → `bg-card`
- Photo upload card: `bg-white rounded-[18px] border border-[#E2E8F0]` → `bg-card rounded-[18px] border border-border`
- Voice recording card: same pattern
- Review summary card: `bg-white rounded-[20px] border-[1.5px] border-[#E2E8F0]` → `bg-card rounded-[20px] border-[1.5px] border-border`
- Disclaimer box: `bg-[#FFFBEB] border border-[#FDE68A] text-[#78350F]` → `bg-[var(--severity-medium-bg)] border border-[var(--secondary-fixed-dim)] text-[var(--severity-medium)]`
- Add ThemeToggle import and placement in header (same pattern as CitizenDashboard)

### 3. CitizenMyReports.tsx migration
- Header: `className="citizen-web-header bg-primary flex..."` → `bg-[var(--citizen-header-bg)]`
- Report detail modal header (line ~914): `bg-primary text-white` → `bg-[var(--citizen-header-bg)] text-white`
- Page header section: `border-b border-slate-200` → `border-b border-border`
- Text: `text-slate-400` → `text-muted-foreground`; `text-[#0F172A]` → `text-foreground`; `text-slate-500` → `text-muted-foreground`
- Filter/sort section: `bg-white p-3` → `bg-card p-3`
- Sort panel: `bg-white shadow-sm` → `bg-card shadow-sm`; active item `font-normal text-slate-600` → `font-normal text-muted-foreground`
- Filter tab active: `bg-primary text-white` is fine (already semantic); inactive `bg-slate-100 text-slate-400` → `bg-muted text-muted-foreground`
- Report cards: `bg-white` → `bg-card`; timeline connector `bg-slate-200` → `bg-muted`; `text-slate-*/border-slate-*` throughout
- Drawer close handle: `bg-slate-200` → `bg-muted`
- Photo preview close: `bg-[#0F172A] border-[#334155] text-slate-200` → `bg-[var(--inverse-surface)] border-[var(--on-surface-variant)]/30 text-[var(--inverse-on-surface)]`
- Add ThemeToggle to header

### 4. CitizenVerification.tsx migration
- Header: `bg-primary` → `bg-[var(--citizen-header-bg)]`
- Status badge classes: `border-slate-300 bg-slate-50 text-slate-600` → `border-border bg-muted text-muted-foreground`; `border-red-300 bg-red-100 text-red-800` → `border-[var(--error)] bg-[var(--error-container)] text-[var(--error)]`; `border-amber-300 bg-amber-100 text-amber-800` → `border-[var(--secondary-fixed-dim)] bg-[var(--severity-medium-bg)] text-[var(--severity-medium)]`
- Page header: `border-b border-slate-200` → `border-b border-border`; `text-slate-400` → `text-muted-foreground`; `text-[#0F172A]` → `text-foreground`
- Back button: `border-slate-300 text-slate-600 hover:bg-slate-50` → `border-border text-muted-foreground hover:bg-muted/50`
- Section panels: `bg-white rounded-lg border border-[var(--outline-variant)]` → `bg-card rounded-lg border border-[var(--outline-variant)]`
- `text-slate-500` caption text → `text-muted-foreground`
- ID upload area / file input display: `bg-white border border-[var(--outline-variant)]` → `bg-card`
- Audio player wrapper: `bg-slate-200 text-slate-700` → `bg-muted text-muted-foreground`
- Sign-out dropdown: same `hover:bg-red-50` fix as other pages
- Add ThemeToggle to header

### 5. Run `npm run build` — must pass before committing

---

## Relevant file paths

| Purpose | Path |
|---|---|
| Implementation plan (7 phases) | `.claude/plans/hazy-puzzling-nest.md` |
| Theme tokens (light + `.dark` overrides — NOW COMPLETE) | `src/styles/theme.css` |
| ThemeProvider (root wrapper) | `src/app/providers/ThemeProvider.tsx` |
| ThemeToggle (className prop added) | `src/app/components/ThemeToggle.tsx` |
| App root mount | `src/main.tsx` |
| Router (Landing guard lives here) | `src/app/routes.ts` |
| Mobile CSS (Phase 7 still — only header bg changed this session) | `src/styles/mobile.css` |
| CitizenDashboard (partially migrated) | `src/app/pages/CitizenDashboard.tsx` |
| IncidentReport (not yet started) | `src/app/pages/IncidentReport.tsx` |
| CitizenMyReports (not yet started) | `src/app/pages/CitizenMyReports.tsx` |
| CitizenVerification (not yet started) | `src/app/pages/CitizenVerification.tsx` |
