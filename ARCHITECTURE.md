# TUGON Architecture Guide

## 1. Project Overview

**TUGON: A Web-Based Incident Management and Decision Support System using Geospatial Analytics** is a browser-based civic technology platform for Barangays **251, 252, and 256** in Tondo, Manila.

The system is designed to:

* let residents report incidents using phones or computers
* help barangay officials track reports from submission to closure
* route incidents to the correct barangay using geofencing
* provide heatmap-based decision support for officials
* improve inter-barangay awareness through cross-border alerts

### Core rule

TUGON **does not replace** the traditional manual police or barangay blotter. It is a digital support system that augments reporting, tracking, and local decision-making.

---

## 2. Recommended Stack

This stack is practical for a capstone, modern, and easy to defend academically.

### Frontend

* **React** with **Vite**
* **TypeScript**
* **Tailwind CSS** for UI styling
* **React Router** for navigation
* **React Hook Form** + **Zod** for form handling and validation
* **Leaflet** or **Mapbox GL JS** for maps

### Backend

* **Node.js**
* **Express.js**
* **TypeScript**
* **JWT** or secure session-based auth
* **Multer** for photo and voice upload handling

### Database

* **PostgreSQL**
* **Prisma ORM**

### Optional services

* OTP provider for phone verification
* Cloud file storage later if needed

This setup is strong because it supports role-based access control, geospatial logic, and a clean full-stack web architecture.

---

## 3. High-Level System Modules

### Public / Citizen side

* Landing page
* Login
* Register
* Phone OTP verification
* Create password
* Forgot password
* Citizen dashboard
* Step-by-step report incident form
* My reports / ticket tracking
* Community map
* Profile settings

### Barangay Official side

* Official dashboard
* Incident queue / reports table
* Incident detail view
* Status update actions
* Official map with pins and heatmaps
* Cross-border alert panel
* Analytics cards

### Super Admin side

* Multi-barangay overview dashboard
* User and role management
* Barangay boundary management
* Incident trend analytics
* System monitoring

---

## 4. Recommended Folder Structure

```text
TUGON/
├── AGENTS.md
├── README.md
├── ARCHITECTURE.md
├── .github/
│   └── copilot-instructions.md
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── router/
│   │   │   ├── providers/
│   │   │   └── store/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   ├── map/
│   │   │   ├── forms/
│   │   │   ├── status/
│   │   │   └── dashboard/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── citizen/
│   │   │   ├── reports/
│   │   │   ├── officials/
│   │   │   ├── super-admin/
│   │   │   ├── map/
│   │   │   └── analytics/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── styles/
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── barangays/
│   │   │   ├── reports/
│   │   │   ├── evidence/
│   │   │   ├── incidents/
│   │   │   ├── status-history/
│   │   │   ├── cross-border-alerts/
│   │   │   ├── map/
│   │   │   └── analytics/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── uploads/
│   ├── package.json
│   └── tsconfig.json
│
└── docs/
    ├── api/
    ├── diagrams/
    └── research/
```

---

## 5. Roles and Permissions

### 1. Citizen / Resident

Can:

* register and verify phone number
* create password after verification
* log in
* submit incident reports
* upload photo and voice evidence
* pin incident on map
* view own reports
* track ticket status
* view community map
* manage own profile

Cannot:

* manage other users
* change official incident outcomes
* see official-only heatmaps
* process incidents outside personal reporting functions

### 2. Barangay Official

Can:

* view incidents routed to own barangay
* update report status
* review evidence
* monitor incident pins
* view heatmaps
* receive cross-border alerts
* access barangay dashboard analytics

Cannot:

* process reports outside jurisdiction
* act on incidents belonging to neighboring barangays
* override system-wide admin configuration unless allowed

### 3. Super Admin

Can:

* view all barangays
* manage users and roles
* manage barangay boundaries
* review all reports and trends
* view system-wide analytics

---

## 6. Authentication Flow

### Citizen flow

1. User opens landing page
2. User chooses register
3. User enters:

   * full name
   * phone number
   * barangay selection
4. System sends OTP
5. User verifies OTP
6. User creates password
7. Account becomes active
8. User logs in and accesses dashboard

### Important rules

* Password creation happens **after** phone verification
* Barangay is selected during registration
* Registration barangay should be stored in citizen profile
* Auth must support role-based login for citizen, official, and super admin

### Suggested auth tables

* users
* otp_verifications
* citizen_profiles
* official_profiles
* sessions or refresh tokens

---

## 7. Incident Reporting Flow

Use a **step-by-step form**, not a single long page.

### Step 1: Incident type

Allowed values:

* Fire
* Pollution
* Noise
* Crime
* Road Hazard
* Other

### Step 2: Location

* user drops a map pin
* coordinates are captured
* system checks geofence against barangay boundaries

### Step 3: Description

* text input for incident details

### Step 4: Evidence upload

* photo
* voice recording

### Step 5: Review and submit

* summary shown
* submit button confirms report

### Important validation rules

* incident must have valid type
* location coordinates required
* description required
* evidence optional or required based on project rules
* only valid media types should be accepted
* server must validate barangay routing based on coordinates

---

## 8. Ticket Lifecycle Rules

Statuses must remain exactly:

* Submitted
* Under Review
* In Progress
* Resolved
* Closed
* Unresolvable

### Suggested status transition logic

* Submitted -> Under Review
* Under Review -> In Progress
* Under Review -> Unresolvable
* In Progress -> Resolved
* Resolved -> Closed

### Rules

* Citizens can view status but should not change it
* Only authorized officials can update report status
* Every status change should create a history record
* Status changes should include timestamp and official ID where possible

### Suggested history record fields

* report_id
* previous_status
* new_status
* changed_by_user_id
* changed_at
* notes

---

## 9. Geofencing and Routing Logic

This is one of the core project features.

### Purpose

Use coordinates to determine which barangay has jurisdiction over an incident.

### Routing logic

1. User drops a pin on the map
2. System captures latitude and longitude
3. Backend checks which barangay polygon contains the point
4. Report is routed only to that barangay
5. Neighboring barangays may receive cross-border alerts if incident is near shared boundaries

### Hard rules

* Only the barangay that owns the incident location can process the report
* Neighboring barangays must not update the incident
* Frontend restrictions are not enough; backend must enforce jurisdiction rules

### Suggested implementation approach

* Store barangay boundaries as polygons or GeoJSON
* Use point-in-polygon logic server-side
* Keep a clear service layer for `resolveBarangayFromCoordinates()`

### Useful service methods

* `resolveBarangayFromCoordinates(lat, lng)`
* `isWithinBarangayBoundary(lat, lng, barangayId)`
* `findNeighborBarangays(barangayId)`
* `isNearBoundary(lat, lng, barangayId)`

---

## 10. Cross-Border Alert Logic

### Purpose

Incidents close to shared boundaries may matter to nearby barangays.

### Behavior

* When an incident is near a boundary, create alert records for neighboring barangays
* Alerts are informational only
* Alert recipients cannot edit the incident

### Suggested fields

* alert_id
* source_report_id
* source_barangay_id
* target_barangay_id
* alert_reason
* created_at
* read_at

---

## 11. Heatmap Logic

Heatmaps are not just visual styling. They must follow threshold-based logic.

### Rule

Heatmaps appear only when a defined threshold of similar incidents occurs within a given area.

### Example logic

* Group incidents by:

  * incident type
  * location cluster
  * time window
* If count >= threshold, generate heatmap data

### Example threshold inputs

* same incident type
* within a radius or cluster cell
* within recent time period
* count reaches minimum threshold

### Important restrictions

* Heatmaps are visible to officials only
* Citizens should not see official heatmap analytics

### Suggested backend service

* `generateHeatmapData({ barangayId, incidentType, fromDate, toDate, threshold })`

### Suggested output structure

* cluster center coordinates
* intensity score
* incident count
* incident type
* time window

---

## 12. Database Schema Outline

Below is a practical schema outline for Prisma / PostgreSQL.

### users

* id
* full_name
* phone_number
* password_hash
* role
* is_phone_verified
* created_at
* updated_at

### otp_verifications

* id
* phone_number
* otp_code
* expires_at
* verified_at
* created_at

### barangays

* id
* name
* code
* boundary_geojson
* created_at
* updated_at

### citizen_profiles

* id
* user_id
* barangay_id
* address_optional
* created_at
* updated_at

### official_profiles

* id
* user_id
* barangay_id
* position
* created_at
* updated_at

### reports

* id
* ticket_number
* citizen_user_id
* incident_type
* description
* latitude
* longitude
* routed_barangay_id
* current_status
* submitted_at
* updated_at

### incident_evidence

* id
* report_id
* file_type
* file_url_or_path
* uploaded_at

### status_history

* id
* report_id
* previous_status
* new_status
* changed_by_user_id
* notes
* changed_at

### cross_border_alerts

* id
* report_id
* source_barangay_id
* target_barangay_id
* alert_reason
* created_at
* read_at

### heatmap_snapshots_optional

* id
* barangay_id
* incident_type
* threshold_used
* cluster_center_lat
* cluster_center_lng
* intensity
* generated_at

---

## 13. Suggested API Endpoints

### Auth

* `POST /api/auth/register`
* `POST /api/auth/send-otp`
* `POST /api/auth/verify-otp`
* `POST /api/auth/create-password`
* `POST /api/auth/login`
* `POST /api/auth/forgot-password`
* `POST /api/auth/reset-password`
* `POST /api/auth/logout`

### Citizen

* `GET /api/citizen/profile`
* `PATCH /api/citizen/profile`
* `GET /api/citizen/reports`
* `GET /api/citizen/reports/:id`
* `POST /api/citizen/reports`

### Officials

* `GET /api/official/dashboard`
* `GET /api/official/reports`
* `GET /api/official/reports/:id`
* `PATCH /api/official/reports/:id/status`
* `GET /api/official/alerts`
* `GET /api/official/heatmap`

### Super Admin

* `GET /api/admin/dashboard`
* `GET /api/admin/users`
* `PATCH /api/admin/users/:id/role`
* `GET /api/admin/barangays`
* `PATCH /api/admin/barangays/:id/boundary`
* `GET /api/admin/reports`
* `GET /api/admin/analytics`

---

## 14. Frontend Screen List

### Public / Auth

* Landing page
* Login page
* Register page
* OTP verification page
* Create password page
* Forgot password page

### Citizen

* Citizen dashboard
* Step 1 incident type
* Step 2 map location
* Step 3 description
* Step 4 evidence upload
* Step 5 review and submit
* My reports list
* My report details
* Community map
* Profile settings

### Official

* Official dashboard
* Reports list
* Incident details
* Status update modal
* Heatmap panel
* Cross-border alerts panel

### Super Admin

* Admin dashboard
* User management
* Barangay boundary management
* Analytics page

---

## 15. UI and Design Rules

### Typography

* Roboto family

### Colors

* Dark Blue `#1E3A8A`
* Red `#B91C1C`
* Ochre/Gold `#B4730A`

### Style

* modern government dashboard
* clean and structured
* responsive desktop and mobile
* cards, tables, badges, map panels
* bottom navigation for citizen mobile view

### Citizen mobile navigation

* Home
* Report
* Map
* My Reports
* Profile

---

## 16. Security and Validation Rules

* Validate OTP expiration
* Hash passwords securely
* Protect official and admin routes with role checks
* Validate all uploaded files by type and size
* Validate status transitions server-side
* Validate geofencing server-side
* Prevent cross-barangay action permissions
* Log report creation and status changes where possible

## 16.1 Backend Integration Test Baseline

Current backend automated integration coverage includes:

* `/api/admin` role guard behavior (401 for missing token, 403 for non-super-admin, success for super-admin)
* admin audit endpoints:
  * `GET /api/admin/audit-logs`
  * `GET /api/admin/audit-logs/export`
* route-to-service contract checks for query filter forwarding and error mapping behavior

Current backend test location:

* `server/tests/admin.integration.test.ts`

Current backend test command:

* `npm --prefix server run test:integration`

---

## 17. Implementation Phases

### Phase 1: Project setup

* initialize client and server
* configure TypeScript, routing, styling, database
* add repo instructions and architecture docs

### Phase 2: Authentication

* registration
* OTP verification
* password creation
* login/logout
* role-aware auth guards

### Phase 3: Citizen reporting

* step-by-step form
* file uploads
* my reports
* report details

### Phase 4: Geofencing and routing

* barangay boundary storage
* point-in-polygon routing
* cross-border alert creation

### Phase 5: Official dashboard

* official queue
* report details
* status updates
* alerts

### Phase 6: Heatmap analytics

* threshold logic
* incident clustering
* official-only map analytics

### Phase 7: Super admin tools

* user management
* barangay management
* global analytics

### Phase 8: Testing and hardening

* auth tests
* permission tests
* routing tests
* status transition tests
* upload validation tests
* expand integration tests from admin baseline to citizen/official/auth/jurisdiction flows

---

## 18. Best Prompts to Give Your Coding Agent

### Understanding prompt

"Read the repository instructions and architecture documents first. Then summarize the current stack, folder structure, auth flow, report flow, map logic, and missing implementation gaps. Do not change code yet."

### Planning prompt

"Using the repository instructions and architecture guide as the source of truth, create a phased implementation plan for authentication, citizen reporting, geofencing, heatmap logic, dashboards, and testing. Do not write code yet."

### Safe coding prompt

"Implement only the next phase we agreed on. Before editing, tell me the exact files you will modify and why. Preserve the existing project structure and do not touch unrelated modules."

---

## 19. Final Guidance for AI Agents

When working in this repository:

* do not overengineer the solution
* keep the project defendable for an academic capstone
* prefer minimal, reviewable changes
* preserve role boundaries and legal constraints
* treat geofencing and ticket lifecycle as core logic
* never frame the system as a replacement for the official blotter

## Database Hosting

The TUGON system uses **Supabase** as the hosted database and backend services provider.

Supabase provides:
- PostgreSQL database hosting
- Row Level Security (RLS)
- Authentication services (optional)
- File storage for uploaded evidence
- REST and realtime APIs

### Database Technology
- PostgreSQL (via Supabase)
- Prisma ORM for schema management and migrations

### Storage
Evidence files such as:
- photos
- voice recordings

may be stored using **Supabase Storage buckets**.

### Notes for AI Agents
When generating database code:
- Assume the PostgreSQL database is hosted on Supabase.
- Use environment variables for connection strings.
- Do not generate local-only database assumptions.
