# TUGON Implementation Tasks

This document acts as the **handoff memory for AI coding agents and developers** working on the TUGON system. It summarizes the current project goals, completed work, and the recommended next implementation steps.

AI agents should always read the following files before performing any coding tasks:

1. `.github/copilot-instructions.md`
2. `AGENTS.md`
3. `ARCHITECTURE.md`
4. `TASKS.md`

These files together define the system rules and architecture.

---

# 1. Project Summary

TUGON is a **web-based incident management and decision support system** designed for a tri-barangay cluster in **Tondo, Manila**:

* Barangay 251
* Barangay 252
* Barangay 256

The system allows residents to report incidents while barangay officials manage and respond to those reports using geospatial analytics.

The platform **augments but does not replace the traditional police/barangay blotter.**

---

# 2. Core Functional Rules

These rules must never be violated by new code.

### Web Application Only

The system is a browser-accessible web application.

No native mobile app should be generated.

### Roles

The system has exactly **three roles**:

* Citizen
* Barangay Official
* Super Admin

### Ticket Lifecycle

Statuses must remain exactly:

* Submitted
* Under Review
* In Progress
* Resolved
* Closed
* Unresolvable

### Geofencing

Incidents must be routed to the barangay that owns the coordinates.

Neighboring barangays may receive **alerts only**, not action permissions.

### Heatmap Rules

Heatmaps are **visible only to officials** and must appear only when a defined incident threshold is reached.

---

# 3. Current System Features (Completed)

The following features are already implemented or partially implemented.

### Authentication

* User registration
* Phone OTP verification
* Password creation after verification
* Login and session handling

### Citizen Features

* Citizen dashboard
* Incident submission flow
* Evidence upload
* Ticket tracking

### Incident Management

* Report creation
* Status lifecycle
* Incident storage

### Geospatial Logic

* Pin-drop location capture
* Barangay routing logic

### Database

Hosted using **Supabase PostgreSQL**.

Prisma is used as the ORM.

---

# 4. Remaining Implementation Work

The following phases represent the remaining development tasks.

---

## Progress Snapshot (March 8, 2026)

Completed:

* Phase 1 stabilization (env templates, Prisma scripts, env loading fallback)
* Phase 2 geofencing enforcement and server-side jurisdiction checks
* Phase 3 official report queue/details/status transitions
* Phase 4 cross-border alerts API and official dashboard panel
* Phase 5 heatmap analytics endpoint with threshold-based clustering and official dashboard integration

Next priority:

* Phase 6 Super Admin tools
* Phase 6 in progress: `/api/admin` backend endpoints and Super Admin user list API wiring
* Phase 6 in progress: Super Admin role update action and overview analytics summary wiring
* Phase 6 in progress: Super Admin barangay map live data sync and boundary GeoJSON update action
* Map reliability in progress: enforce high-zoom map clarity for incident pinning and dashboard maps

---

## Phase 1 – Stabilization

Goals:

* ensure Prisma types are synchronized
* verify Supabase connection
* confirm migrations are working

Tasks:

* run Prisma generate
* verify database schema
* confirm environment variables

---

## Phase 2 – Geofencing Enforcement

Goals:

Ensure incidents are routed strictly according to barangay jurisdiction.

Tasks:

* store barangay boundaries as GeoJSON
* implement point-in-polygon logic
* create routing service
* prevent cross-barangay incident updates

---

## Phase 3 – Official Dashboard

Goals:

Provide a management interface for barangay officials.

Features:

* incident queue
* report detail view
* status update actions
* evidence preview

---

## Phase 4 – Cross-Border Alerts

Goals:

Allow neighboring barangays to receive awareness notifications.

Features:

* alert creation when incidents occur near boundaries
* official notification panel

Restrictions:

Alerts must not allow incident editing.

---

## Phase 5 – Heatmap Analytics

Goals:

Generate incident density heatmaps.

Logic:

* group incidents by type
* cluster by geographic area
* apply threshold rules

Output:

* heatmap layer for official dashboard

---

## Phase 6 – Super Admin Tools

Features:

* user management
* barangay boundary editing
* system-wide analytics

---

## Phase 7 – Security Hardening

Tasks:

* enforce role-based permissions
* validate uploads
* protect admin endpoints

---

## Phase 8 – Testing

Tests should include:

* auth flow tests
* geofencing tests
* role permission tests
* ticket lifecycle tests

---

## Phase 9 – Map Usability Hardening

Goals:

Ensure maps remain operational at practical street/house-level zoom for reporting and response workflows.

Progress checklist:

- [ ] verify high-zoom tile detail in Incident Report, Community Map, Official Map, and Super Admin Map
- [ ] add fallback basemap option (e.g., alternate OSM style) when detail is insufficient
- [ ] tune zoom constraints (`minZoom`, `maxZoom`, `maxNativeZoom`) per map screen
- [ ] ensure barangay boundary overlays remain visible at all zoom levels
- [ ] add regression test checklist for zoom/detail behavior on desktop and mobile browsers

---

# 5. Current Development Priorities

The recommended immediate next step for development is:

**Build Phase 6 Super Admin tools (user management, barangay boundary editing, and system-wide analytics APIs/UI).**

This provides governance controls after core citizen and official workflows are in place.

---

# 6. Instructions for AI Coding Agents

When beginning work:

1. Read the instruction files first.
2. Summarize the current implementation state.
3. Identify the safest next task.
4. Propose a short implementation plan.
5. Only then generate code.

Agents should prefer **small, safe changes** rather than large refactors.

---

# 7. Recommended Prompt for New Agent Sessions

When starting a new AI coding conversation, use the following prompt:

"Read `.github/copilot-instructions.md`, `AGENTS.md`, `ARCHITECTURE.md`, and `TASKS.md` first.

Then summarize:

* the current system architecture
* the existing implementation
* the next development phase

Do not modify code yet."

