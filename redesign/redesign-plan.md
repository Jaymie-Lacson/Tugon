# TUGON Redesign Implementation Plan

Date: 2026-03-30
Branch: `redesign`
Scope: Full-system UI/UX redesign while retaining all existing features and role-based behavior.

## 1. Objectives
- Redesign Landing, Auth, Citizen, Official, and Super Admin portals.
- Keep all existing functionality, route guards, workflows, and backend contracts intact.
- Improve usability, visual consistency, mobile experience, and accessibility.
- Maintain EN/FIL parity during implementation.

## 2. Non-Negotiable Constraints
- Preserve route structure and role boundaries: `/citizen`, `/app`, `/superadmin`.
- Preserve incident reporting as a 5-step flow.
- Preserve ticket status transition rules and server-side enforcement.
- Preserve geofencing/jurisdiction behavior and cross-border informational-only behavior.
- Keep web-only architecture and responsive support.

## 3. Design Direction (Locked)
- Visual direction: Hybrid civic style.
  - Official/Super Admin: formal, operational, monitoring-first.
  - Citizen: friendlier, guidance-first.
- Brand: evolve slightly from current tokens, not a full rebrand.
- IA: keep current information architecture (no route model overhaul).
- Accessibility: WCAG 2.1 AA baseline.
- Motion: moderate, meaningful transitions with reduced-motion fallback.
- Citizen mobile pattern: top tabs + sticky report action.

## 4. Phased Execution

### Phase 1: Baseline and Guardrails
- Build a parity matrix mapping each current feature/flow to redesigned counterpart.
- Confirm test-backed invariants and guardrails before visual refactors.
- Track known UX debt and prioritize low-risk foundational refactors.

### Phase 2: Shared Design System
- Normalize tokens for color, spacing, typography, elevation, and states.
- Standardize core components: navigation, cards, tables, badges, forms, map panels.
- Define responsive and motion standards (including reduced-motion behavior).

### Phase 3: Navigation and Shell Consolidation
- Centralize role-based nav definitions and remove duplicated nav configs.
- Keep behavior unchanged while unifying shell patterns.
- Continue refactoring shared shell pieces across official and super-admin views.

### Phase 4: Screen Rollout
- Wave A: Shared shells and global scaffolding.
- Wave B: Citizen flows (Dashboard, Report, My Reports, Verification).
- Wave C: Official flows (Dashboard, Incidents, Map, Analytics, Reports, Verifications).
- Wave D: Super Admin flows (Overview, Map, Analytics, Users, Audit Logs).

### Phase 5: Validation and Hardening
- Run build and targeted tests per wave.
- Perform responsive audit on key pages per role.
- Verify EN/FIL parity and prevent UI truncation/regression.
- Run accessibility checks for focus visibility, keyboard flow, and contrast.

## 5. Work Completed So Far
- Added centralized nav config at `src/app/data/navigationConfig.ts`.
- Refactored nav consumers:
  - `src/app/components/CitizenDesktopNav.tsx`
  - `src/app/components/CitizenMobileMenu.tsx`
  - `src/app/components/Layout.tsx`
  - `src/app/pages/superadmin/SuperAdminLayout.tsx`
- Implemented citizen mobile redesign pattern in `CitizenMobileMenu` (top tabs + sticky report CTA).
- Build validation passed during this session.

## 6. Immediate Next Tasks (Priority)
1. Remove obsolete `mobileMenuOpen` state and dropdown handlers from citizen pages that still pass `open/onToggle` props.
2. Run responsive pass for:
   - `src/app/pages/CitizenDashboard.tsx`
   - `src/app/pages/IncidentReport.tsx`
   - `src/app/pages/CitizenMyReports.tsx`
   - `src/app/pages/CitizenVerification.tsx`
3. Normalize token usage in citizen header/nav surfaces.
4. Re-run validation:
   - `npx vitest run src/app/accessibility-layouts.test.ts`
   - `npm run build`

## 7. References
- `design-analysis-plan.md` (detailed analysis and inventory)
- `session-handoff.md` (latest session turnover)
- `src/app/routes.ts` (role route boundaries)
- `src/app/components/RequireAuth.tsx` (auth/role guard behavior)
