# Full UI Redesign — Stitch "Institutional Elegance" System

## Goal
Perform a **full visual redesign** of the TUGON portal to match the Stitch-generated screen designs. This goes beyond token swaps — we are restructuring layouts, component patterns, typography scales, and visual hierarchy to match the "Institutional Elegance" design system.

## Design Reference Sources

### Stitch Screenshot Captured
![Dashboard reference](file:///C:/Users/Mikell%20Razon/.gemini/antigravity/brain/2ed3a3c6-cb27-4d96-865a-24024c542db2/stitch_dashboard_design_1775106194173.png)

### Design System Specification (from Stitch `designMd`)
**Creative North Star: "The Digital Architect"** — High-end editorial layouts replacing the generic SaaS dashboard feel. Atmospheric Authority through expansive white space, intentional asymmetry, and deep tonal layering.

**Key Design Principles:**
1. **"No-Line" Rule** — No 1px borders for sectioning. Boundaries defined via background color shifts
2. **Surface Hierarchy** — Tonal stacking: `surface` → `surface-container-low` → `surface-container-lowest` (white cards on tinted bg)
3. **Glassmorphism** — Semi-transparent floating panels with `backdrop-blur: 12px`
4. **Ghost Borders** — `outline-variant` at 15% opacity only when absolutely needed
5. **Ambient Shadows** — Ultra-diffused: `0 20px 40px rgba(13, 28, 46, 0.06)`
6. **Typography** — Public Sans for headlines (editorial authority), Inter for body (utility)
7. **Gradient CTAs** — `primary` (#00236f) → `primary-container` (#1e3a8a) at 135°

### Stitch Named Colors (Production Palette)
| Token | Hex | Usage |
|---|---|---|
| `surface` | `#f8f9ff` | Page canvas |
| `surface-container-low` | `#eff4ff` | Secondary sections, sidebar |
| `surface-container-lowest` | `#ffffff` | Focus cards, interactive panels |
| `surface-container-high` | `#dce9ff` | Nested depth panels |
| `surface-container-highest` | `#d5e3fc` | Deep recessed areas |
| `primary` | `#00236f` | Brand anchor, nav |
| `primary-container` | `#1e3a8a` | Interactive elements, sidebar |
| `on-surface` | `#0d1c2e` | Primary text (NOT black) |
| `on-surface-variant` | `#444651` | Secondary text |
| `outline` | `#757682` | Tertiary text |
| `outline-variant` | `#c5c5d3` | Ghost borders at 15% opacity |
| `secondary` | `#865300` | Gold highlights, analytics |
| `secondary-container` | `#feb14c` | Gold badges |
| `tertiary` | `#5d0004` | Critical/urgent |
| `error` | `#ba1a1a` | Error states |
| `error-container` | `#ffdad6` | Error backgrounds |

---

## User Review Required

> [!IMPORTANT]
> **This is a comprehensive layout + component redesign, not just a color swap.** The following changes are structural and will significantly alter the visual appearance of every page.

> [!WARNING]
> **Breaking Visual Change:** The sidebar is being redesigned from a dark `bg-primary` sidebar to a **light-theme sidebar** using `surface-container-low` (#eff4ff) with a dark navy TUGON branding. This matches the Stitch screenshot exactly.

> [!CAUTION]
> **Scope:** ~15 files across auth, official, citizen, and superadmin modules. Each page gets structural layout changes, not just color token swaps.

---

## Proposed Changes

### Phase 1: Foundation Layer (Design Tokens + Global CSS)

#### [MODIFY] [theme.css](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/theme.css)
- Replace all CSS custom properties with the exact Stitch production palette above
- Add new utility classes for the "No-Line" rule (tonal backgrounds, ambient shadows)
- Add glassmorphism utility: `.glass { backdrop-filter: blur(12px); background: rgba(248,249,255,0.8); }`
- Add gradient CTA: `.btn-gradient { background: linear-gradient(135deg, #00236f, #1e3a8a); }`
- Add ambient shadow: `.shadow-ambient { box-shadow: 0 20px 40px rgba(13,28,46,0.06); }`

---

### Phase 2: Layout Shells

#### [MODIFY] [Layout.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/components/Layout.tsx)
**Light Sidebar Redesign (from Stitch screenshot):**
- Sidebar bg: `surface-container-low` (#eff4ff) instead of dark blue
- TUGON logo: Dark navy bold text with district subtitle
- Nav items: Line icons + text, active state = light blue pill bg + `primary` text
- "New Report" button: Full-width gradient CTA at bottom
- User profile: Avatar + name at sidebar bottom
- Header: Integrated search bar (rounded, `surface-container-high` bg), system status indicator, notification bell, profile dropdown

#### [MODIFY] [AuthLayout.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/components/AuthLayout.tsx)
**Split-screen auth (from Stitch Login/Register screen):**
- Left panel: Dark navy gradient (`primary` → `primary-container`) with tagline "Fast. Reliable. Community Focused." + shield icon
- Right panel: White card with form, gradient submit button
- Footer: Copyright + Privacy/Terms/Contact/Emergency links

---

### Phase 3: Official Portal Pages

#### [MODIFY] [Dashboard.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/pages/Dashboard.tsx)
**Full layout overhaul based on Stitch screenshot:**
- **District Focus Hero Card:** Dark navy card (`primary-container`) with district name, patrol unit count, and gradient CTA buttons ("Dispatch Responder", "Request Support")
- **KPI Row:** "Active Reports" (42, red trend) + "Unresolved" (18) as large stat cards
- **Geofencing Warning Banner:** Amber/gold banner with dismiss button
- **Incident Queue Table:** Clean table with filter/export icons, priority badges (CRITICAL/MEDIUM/LOW pills), status indicators (colored dots: blue=Acting, red=New, green=Resolved)
- **Right Sidebar Panel:** "District Monitor" map card, "Hourly Velocity" sparkline, "Inter-Barangay Links"

#### [MODIFY] [Incidents.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/pages/Incidents.tsx)
- Replace bordered list with tonal card stacking
- Priority badges: Full-rounded pills with semantic colors
- Status: Colored dot indicators instead of text badges
- Remove all 1px border dividers → use spacing and tonal shifts

#### [MODIFY] [Analytics.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/pages/Analytics.tsx)
- Charts in `surface-container-lowest` cards on `surface` bg
- Section headers as editorial-style `headline-md` typography
- Gold accent (`secondary`) for analytics highlights

#### [MODIFY] [Reports.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/pages/Reports.tsx)
- Report cards: White cards on light blue bg, no borders
- Status timeline: Tonal step progression instead of line dividers

#### [MODIFY] [Verifications.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/pages/Verifications.tsx)
- Verification cards: Tonal layering for pending vs approved states
- Table: Zebra-striping with `surface-container-low` + white alternation

---

### Phase 4: Auth Pages

#### [MODIFY] [Login.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/pages/auth/Login.tsx)
- Gradient submit button
- Input fields: `surface-container-low` fill, no traditional borders, 2px `primary` bottom-accent on focus
- "Welcome Back" editorial headline

#### [MODIFY] [Register.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/pages/auth/Register.tsx)
- Same input field pattern as Login
- Step indicator: Tonal progress bar

---

### Phase 5: Citizen Pages

#### [MODIFY] [CitizenDashboard.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/pages/CitizenDashboard.tsx)
- Stat cards: White on `surface-container-low` bg, no borders
- Quick actions: Gradient primary button, ghost secondary buttons
- Profile tab: Tonal surface shift instead of bordered sections

#### [MODIFY] [CitizenMyReports.tsx](file:///c:/Users/Mikell%20Razon/BSIT/2ND%20YEAR/2ND%20SEM/PROF%20ELEC/Tugon/src/app/pages/CitizenMyReports.tsx)
- Report timeline: Staggered tonal blocks instead of vertical line
- Empty state: Editorial typography with large display text

---

### Phase 6: SuperAdmin Pages
Apply same tonal layering pattern to:
- `SAOverview.tsx`, `SAAnalytics.tsx`, `SAAuditLogs.tsx`, `SAUsers.tsx`
- `SuperAdminLayout.tsx` (light sidebar variant)
- `SABarangayMap.tsx` (glassmorphism map overlays)

---

## Open Questions

> [!IMPORTANT]
> 1. **Sidebar style:** The Stitch design shows a **light-themed sidebar** (pale blue). Your current app has a **dark navy sidebar**. Should I switch to the light sidebar as designed in Stitch, or keep the dark sidebar and apply the other design changes?

> [!IMPORTANT]
> 2. **Priority scope:** Should I focus on the **most visible/impactful pages first** (Dashboard, Layout, AuthLayout, Login) and iterate, or do you want all pages changed in one batch?

> [!IMPORTANT]  
> 3. **Landing page:** The Stitch project has a "Home - Emergency Hotlines" and "How It Works" screen for the Landing page. Should I redesign the Landing page as well, or keep the current one?

---

## Verification Plan

### Automated Tests
- `npm run build` — zero errors after each phase
- Browser visual audit at `localhost:5173` for each major page

### Manual Verification
- Side-by-side comparison with Stitch screenshots
- Mobile responsive checks at 375px, 390px, 428px breakpoints
