# TUGON — Project Configuration Report

## 1. Environment Capability Summary

### Available Tools
| Tool | Status | Capability |
|------|--------|------------|
| Filesystem (read/write) | ✅ Active | Read, create, and edit any project file |
| Terminal (run_command) | ✅ Active | Run npm scripts, build commands, Prisma CLI |
| Web browser subagent | ✅ Active | Open, interact with, and screenshot the running app |
| Web search | ✅ Active | Look up documentation and external resources |
| Image generation | ✅ Active | Generate UI mockups or asset images |

### MCP Servers
No external MCP servers are configured in this workspace. All capabilities are provided by the built-in tool set above.

### Dev Commands (from CLAUDE.md)
```bash
# Frontend (http://localhost:5173)
npm run dev

# Backend (http://localhost:4000)
npm --prefix server run dev

# Build
npm run build
npm run build:server
npm run check:prod

# Prisma
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate -- --name <name>
npm --prefix server run prisma:migrate:deploy
npm --prefix server run prisma:status
npm --prefix server run prisma:validate

# Tests
npm --prefix server run test:integration   # node:test runner in server/tests/
npm run test:frontend                      # Vitest
npm run test:frontend:a11y                 # Accessibility smoke tests
```

---

## 2. Project Architecture Overview

### What is TUGON?
**TUGON: A Web-Based Incident Management and Decision Support System using Geospatial Analytics**

A browser-based civic technology platform for **Barangays 251, 252, and 256** in Tondo, Manila. IT capstone project.
TUGON **augments** (never replaces) the traditional barangay/police blotter.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 6 + TypeScript + Tailwind CSS v4 + React Router v7 |
| UI Components | Radix UI primitives + Shadcn-style + MUI (Material UI v7) + Lucide icons |
| Forms | React Hook Form v7 |
| Maps | Leaflet + React Leaflet |
| Charts | Recharts |
| Animation | Motion (Framer Motion fork) |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL via Supabase |
| Auth | JWT (cookie-based) + Phone OTP verification |
| File Uploads | Base64 in JSON (evidence stored in Supabase Storage) |
| Deployment | Vercel (frontend) + Render (backend) |

### Folder Structure

```
Tugon/
├── src/                          # Frontend (Vite entry)
│   ├── main.tsx                  # React root
│   ├── app/
│   │   ├── App.tsx               # Router provider
│   │   ├── routes.ts             # All React Router routes
│   │   ├── components/           # Shared UI components
│   │   │   ├── Layout.tsx        # Official layout shell
│   │   │   ├── CitizenPageLayout.tsx
│   │   │   ├── RequireAuth.tsx   # Auth guard HOC
│   │   │   ├── IncidentMap.tsx   # Leaflet map component
│   │   │   ├── StatusBadge.tsx   # Ticket status indicator
│   │   │   └── ui/               # Base Radix/Shadcn components
│   │   ├── pages/
│   │   │   ├── Landing.tsx       # Public landing page
│   │   │   ├── Dashboard.tsx     # Official dashboard
│   │   │   ├── Incidents.tsx     # Official incident queue
│   │   │   ├── Reports.tsx       # Official reports table
│   │   │   ├── MapView.tsx       # Community/official map
│   │   │   ├── Analytics.tsx     # Official analytics
│   │   │   ├── CitizenDashboard.tsx
│   │   │   ├── CitizenMyReports.tsx
│   │   │   ├── IncidentReport.tsx  # 5-step report form
│   │   │   ├── CitizenVerification.tsx
│   │   │   ├── Verifications.tsx   # Official verification queue
│   │   │   ├── Settings.tsx
│   │   │   ├── auth/             # Login, Register, Verify, CreatePassword, ForgotPassword
│   │   │   └── superadmin/       # SAOverview, SAUsers, SAAnalytics, SAAuditLogs, SABarangayMap
│   │   ├── services/             # Frontend API clients
│   │   │   ├── authApi.ts
│   │   │   ├── citizenReportsApi.ts
│   │   │   ├── officialReportsApi.ts
│   │   │   ├── profileVerificationApi.ts
│   │   │   └── superAdminApi.ts
│   │   ├── hooks/
│   │   │   └── useCitizenReportNotifications.tsx
│   │   ├── utils/                # Auth session helpers, navigation guards
│   │   ├── data/                 # Static data/config
│   │   └── i18n/                 # Internationalization
│
├── server/
│   ├── src/
│   │   ├── app.ts                # Express app with CORS, rate limiting, CSRF
│   │   ├── server.ts             # HTTP server bootstrap
│   │   ├── routes/index.ts       # Route aggregator
│   │   ├── modules/
│   │   │   ├── auth/             # OTP, JWT, registration, login, password reset
│   │   │   ├── reports/          # CRUD, status transitions, evidence, geofencing
│   │   │   ├── map/              # Geofencing service (point-in-polygon)
│   │   │   ├── admin/            # Audit logs, user management, SA dashboard
│   │   │   └── verification/     # Citizen ID verification flow
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT authentication
│   │   │   ├── requireRole.ts    # RBAC enforcement
│   │   │   ├── rateLimit.ts      # IP-based rate limiting (DB-backed)
│   │   │   └── csrf.ts           # CSRF protection
│   │   └── config/
│   ├── prisma/
│   │   ├── schema.prisma         # Full DB schema
│   │   └── seed.ts               # Seed data
│   └── tests/
│       └── admin.integration.test.ts
│
├── guidelines/                   # Security & AI coding guidelines
├── barangay-source/              # GeoJSON boundary source files
├── redesign/                     # UI redesign assets
└── public/                       # Static assets
```

### Database Schema (Key Models)

| Model | Purpose |
|-------|---------|
| `User` | All users (citizen, official, super admin); includes verification + ban fields |
| `CitizenProfile` | Links citizen to barangay |
| `OfficialProfile` | Links official to barangay + position |
| `Barangay` | Barangay record with GeoJSON boundary |
| `CitizenReport` | Core incident report with geofenced routing |
| `IncidentEvidence` | Photos/audio linked to a report (Supabase Storage) |
| `TicketStatusHistory` | Audit trail of every status change |
| `CrossBorderAlert` | Cross-barangay boundary notifications |
| `AdminAuditLog` | Admin action log |
| `AdminNotification` | In-app notifications for officials |
| `AuthSession` | Revocable JWT session store |
| `OtpChallenge` | OTP with lockout/expiry logic |
| `IpRateLimitBucket` | DB-backed IP rate limiter |

### Three Roles
| Role | Key Capabilities |
|------|----------------|
| `CITIZEN` | Register, submit reports, track tickets, community map |
| `OFFICIAL` | Manage incidents queued to their barangay, status updates, heatmaps, cross-border alerts |
| `SUPER_ADMIN` | Multi-barangay oversight, user management, analytics, audit logs |

### Ticket Status Lifecycle
```
SUBMITTED → UNDER_REVIEW → IN_PROGRESS → RESOLVED → CLOSED
                        ↘ UNRESOLVABLE
```

### Core API Routes
| Prefix | Auth | Role |
|--------|------|------|
| `/api/auth/*` | Public (rate-limited) | — |
| `/api/citizen/*` | JWT | CITIZEN |
| `/api/official/*` | JWT | OFFICIAL, SUPER_ADMIN |
| `/api/admin/*` | JWT | SUPER_ADMIN |

### Key Service Contracts (Do Not Break)
```ts
resolveBarangayFromCoordinates(lat, lng)
isWithinBarangayBoundary(lat, lng, barangayId)
findNeighborBarangays(barangayId)
isNearBoundary(lat, lng, barangayId)
generateHeatmapData({ barangayId, incidentType, fromDate, toDate, threshold })
```

---

## 3. Available Skills (What I Can Do)

### Authentication & Users
- Add/modify registration flow (OTP → password creation)
- Extend login/logout session logic
- Add/modify password reset flow
- Manage user ban/unban flows (super admin)
- Extend verification status flows

### Incident Reports (Core)
- Add new incident categories or subcategories (via `taxonomy.ts`)
- Modify the 5-step incident report form (`IncidentReport.tsx`)
- Add/modify status transition logic in `reports.service.ts`
- Extend evidence upload handling (photo/audio via Supabase)
- Adjust geofencing routing logic in `geofencing.service.ts`

### Official Dashboard
- Add widgets to `Dashboard.tsx`
- Extend incident queue filtering/sorting in `Incidents.tsx`
- Modify status update modals
- Enhance analytics charts in `Analytics.tsx`

### Super Admin
- Extend `SAOverview.tsx` with new metrics
- Add user management actions in `SAUsers.tsx`
- Modify audit log display/export in `SAAuditLogs.tsx`
- Update barangay boundary data in `SABarangayMap.tsx`

### Maps
- Adjust Leaflet map configuration in `IncidentMap.tsx` / `MapView.tsx`
- Modify barangay boundary GeoJSON data
- Extend heatmap threshold logic

### Database / Prisma
- Add new model fields or models
- Generate and apply migrations
- Extend seed data

### Security
- CORS hardening (env config + `app.ts`)
- Rate limit tuning (env vars)
- CSRF token scope changes
- OTP lockout logic changes

### Testing
- Add `node:test` integration tests in `server/tests/`
- Add Vitest unit tests for frontend utilities
- Run a11y smoke tests

---

## 4. Setup Issues & Risks

### ✅ What's Working
- Full project structure is in place
- Auth, reports, geofencing, admin, and verification modules exist
- Prisma schema is comprehensive and deployment-ready
- Security controls: CORS, CSRF, rate-limiting, RBAC, helmet, audit logging

### ⚠️ Known Gaps (from CLAUDE.md)
These are planned but **not yet implemented**:
- CORS headers full hardening
- Security headers (beyond Helmet defaults)
- Rate limiting (partially done; OTP lockout is in schema)
- Session revocation store (schema exists, enforcement TBD)
- Upload content validation (MIME type check is likely present but verify)

### ⚠️ Environment Note
- Frontend `.env` uses `VITE_API_BASE_URL=/api` — assumes a proxy or same-origin deployment
- Backend `server/.env` must have `DATABASE_URL` and `DIRECT_URL` set (Supabase connection strings)
- OTP SMS provider credentials must be in `server/.env`

### ℹ️ Testing Baseline
- Integration tests currently cover only the `/api/admin` routes
- Expand to auth, citizen, official, and jurisdiction flows as per Phase 8
