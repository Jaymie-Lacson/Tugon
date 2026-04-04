# ANTIGRAVITY.md — TUGON

> This file is the primary instruction guide for **Antigravity**, the AI coding agent
> integrated into this repository. Read **AGENTS.md**, **CLAUDE.md**, and **ARCHITECTURE.md**
> before generating or editing any code. This file extends those documents with execution
> rules, workflow protocols, and Antigravity-specific behavior.

---

## Project Identity

**TUGON: A Web-Based Incident Management and Decision Support System using Geospatial Analytics**

Browser-based civic platform for **Barangays 251, 252, and 256** in Tondo, Manila.
IT capstone project. All solutions must be technically sound, minimal, and academically defensible.

TUGON **augments** — never replaces — the traditional barangay/police blotter.

---

## Tech Stack Reference

| Layer      | Technology                                                                 |
|------------|----------------------------------------------------------------------------|
| Frontend   | React 18 + Vite 6 + TypeScript + Tailwind CSS v4 + React Router v7        |
| UI         | Radix UI primitives + Shadcn-style components + MUI v7 + Lucide icons      |
| Forms      | React Hook Form v7                                                         |
| Maps       | Leaflet + React Leaflet                                                    |
| Charts     | Recharts                                                                   |
| Backend    | Node.js + Express + TypeScript                                             |
| ORM        | Prisma                                                                     |
| Database   | PostgreSQL via Supabase                                                    |
| Auth       | JWT (cookie-based) + Phone OTP verification                                |
| Uploads    | Base64 JSON → Supabase Storage buckets                                     |
| Deploy     | Vercel (frontend) + Render (backend)                                       |
| Tests      | Vitest (frontend) + node:test (backend integration)                        |

---

## Dev Commands

```bash
# Install
npm install
npm --prefix server install

# Run (frontend :5173, backend :4000)
npm run dev
npm --prefix server run dev

# Build
npm run build
npm run build:server
npm run check:prod          # full prod check: frontend + backend + Prisma

# Prisma
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate -- --name <name>
npm --prefix server run prisma:migrate:deploy
npm --prefix server run prisma:status
npm --prefix server run prisma:validate

# Tests
npm --prefix server run test:integration   # node:test — files in server/tests/
npm run test:frontend                      # Vitest
npm run test:frontend:a11y                 # Accessibility smoke tests
npm run test:frontend:all                  # Vitest + a11y combined
```

---

## Hard Rules — Never Violate These

1. **Web app only.** Do not convert to native mobile. All features must stay browser-responsive.
2. **Three roles exactly:** Citizen / Resident · Barangay Official · Super Admin.
3. **Ticket statuses** — preserve exactly (enum names in DB must match):
   `SUBMITTED → UNDER_REVIEW → IN_PROGRESS → RESOLVED → CLOSED · UNRESOLVABLE`
4. **Incident types** — preserve exactly:
   `Pollution · Noise · Crime · Road Hazard · Other`
   (these map to the `category` field in `CitizenReport`; subcategories live in `taxonomy.ts`)
5. **Incident form is step-by-step** (type → location map pin → description → evidence → review).
6. **Evidence types:** photo and voice recording only.
7. **Geofencing is server-side.** Route incidents only to the barangay that owns the pinned coordinates. Frontend restrictions alone are insufficient.
8. **Cross-border alerts are informational only.** Neighboring barangays cannot act on incidents outside their jurisdiction.
9. **Heatmaps are for officials only** and appear only after a threshold of clustered incidents is reached — not as simple pin visualization.
10. **Barangay is set at registration** and must not be freely changed without explicit admin functionality.
11. **Status changes must be validated server-side** and recorded in `TicketStatusHistory`.
12. **RBAC is server-side.** Never rely on frontend-only permission checks.
13. **Do not break key service contracts:**
    ```ts
    resolveBarangayFromCoordinates(lat, lng)
    isWithinBarangayBoundary(lat, lng, barangayId)
    findNeighborBarangays(barangayId)
    isNearBoundary(lat, lng, barangayId)
    generateHeatmapData({ barangayId, incidentType, fromDate, toDate, threshold })
    ```

---

## Design Tokens (Frontend)

| Token         | Value                                  |
|---------------|----------------------------------------|
| Font          | Roboto family                          |
| Primary       | Dark Blue `#1E3A8A`                    |
| Alert/Action  | Red `#B91C1C`                          |
| Analytics     | Ochre/Gold `#B4730A`                   |
| Style         | Modern government / civic dashboard    |
| Mobile nav    | Bottom navigation for citizen views    |
| UI tone       | Professional, clean, information-dense |

When writing frontend code:
- Preserve existing Tailwind class patterns — do not introduce ad-hoc inline styles.
- Use Radix/Shadcn component patterns already in `src/app/components/ui/`.
- Never change color tokens or font family without explicit instruction.

---

## Execution Protocol — Before Every Change

### Non-Trivial Edits

1. **Summarize** what was understood from the request.
2. **List the files** that will be affected and why.
3. **Propose the smallest safe plan** — prefer surgical changes over rewrites.
4. **Read those files** using `view_file` before editing anything.
5. **Generate or edit code.**
6. **State any assumptions** and flag any follow-up checks needed.

### Debugging

1. **Identify likely root causes** before proposing any code change.
2. **Prioritize** the fix with the highest probability of success.
3. **Point to exact files and lines** before writing a fix.
4. Only then propose and apply code changes.

### Schema / Migration Changes

1. Always run `prisma:validate` before and after schema edits.
2. Never edit a migration file that has already been applied to production.
3. Always generate a descriptive migration name (e.g., `add_audit_log_actor_field`).
4. After migration, run `prisma:generate` so the client stays in sync.

---

## Coding Behavior

- Read affected files **before** editing them.
- Prefer **small, reviewable changes** over broad rewrites.
- Do **not** rename variables, functions, routes, files, or DB fields unnecessarily.
- Do **not** add features, refactoring, or "improvements" beyond what was explicitly asked.
- Do **not** add error handling for scenarios that cannot realistically happen.
- Preserve **existing working behavior** unless explicitly told otherwise.
- Add comments **only** where logic is not self-evident.
- Avoid **introducing unnecessary dependencies** — check if something already exists in `package.json` first.
- Keep solutions **minimal and capstone-defensible**.
- Never use `any` in TypeScript without a documented justification.
- Preserve the **existing folder and module structure** — do not reorganize files unless asked.

---

## Architecture Map (Quick Reference)

```
src/app/
├── routes.ts               ← All React Router v7 route definitions
├── App.tsx                 ← Root providers
├── components/
│   ├── Layout.tsx          ← Official/Admin shell layout
│   ├── CitizenPageLayout.tsx
│   ├── RequireAuth.tsx     ← Auth guard (JWT session check)
│   ├── IncidentMap.tsx     ← Leaflet map panel
│   ├── StatusBadge.tsx     ← Ticket status display
│   └── ui/                 ← Base Radix/Shadcn primitives
├── pages/
│   ├── auth/               ← Login, Register, Verify, CreatePassword, ForgotPassword
│   ├── superadmin/         ← SAOverview, SAUsers, SAAnalytics, SAAuditLogs, SABarangayMap
│   ├── Dashboard.tsx       ← Official dashboard
│   ├── Incidents.tsx       ← Official incident queue
│   ├── Reports.tsx         ← Official reports table
│   ├── Analytics.tsx       ← Official analytics (Recharts)
│   ├── MapView.tsx         ← Community + official map (Leaflet)
│   ├── CitizenDashboard.tsx
│   ├── CitizenMyReports.tsx
│   ├── IncidentReport.tsx  ← 5-step citizen report form
│   ├── CitizenVerification.tsx
│   └── Verifications.tsx   ← Official ID verification queue
├── services/               ← Frontend API clients (fetch wrappers)
│   ├── authApi.ts
│   ├── citizenReportsApi.ts
│   ├── officialReportsApi.ts
│   ├── profileVerificationApi.ts
│   └── superAdminApi.ts
├── hooks/
│   └── useCitizenReportNotifications.tsx
└── utils/                  ← authSession, navigationGuards, etc.

server/src/
├── app.ts                  ← Express app (CORS, CSRF, rate limits, body parsers)
├── server.ts               ← HTTP server bootstrap
├── routes/index.ts         ← Route aggregator with role guards
├── middleware/
│   ├── auth.ts             ← JWT authentication
│   ├── requireRole.ts      ← RBAC enforcement
│   ├── rateLimit.ts        ← DB-backed IP rate limiter
│   └── csrf.ts             ← CSRF protection
└── modules/
    ├── auth/               ← OTP, JWT, registration, login, password reset
    ├── reports/            ← CRUD, status transitions, evidence storage
    │   ├── reports.routes.ts
    │   ├── reports.service.ts
    │   ├── evidenceStorage.service.ts
    │   ├── taxonomy.ts     ← Incident category/subcategory definitions
    │   └── types.ts
    ├── map/                ← Geofencing service (point-in-polygon)
    │   ├── geofencing.service.ts
    │   └── defaultBarangayBoundaries.ts
    ├── admin/              ← Audit logs, admin dashboard, user management
    └── verification/       ← Citizen ID verification flow
```

---

## API Route Prefixes

| Prefix              | Auth Required | Allowed Roles              |
|---------------------|---------------|----------------------------|
| `GET /api/health`   | No            | —                          |
| `/api/auth/*`       | No (rate-limited) | —                      |
| `/api/citizen/*`    | JWT           | CITIZEN                    |
| `/api/official/*`   | JWT           | OFFICIAL, SUPER_ADMIN      |
| `/api/admin/*`      | JWT           | SUPER_ADMIN                |

---

## Database Models (Quick Reference)

| Model                 | Purpose                                                 |
|-----------------------|---------------------------------------------------------|
| `User`                | All users; includes ban + verification fields           |
| `CitizenProfile`      | Links citizen → barangay                               |
| `OfficialProfile`     | Links official → barangay + position                   |
| `Barangay`            | Barangay record + GeoJSON boundary                     |
| `CitizenReport`       | Core incident report; geofenced routing                 |
| `IncidentEvidence`    | Photos/audio linked to a report (Supabase Storage)     |
| `TicketStatusHistory` | Full audit trail of status changes                      |
| `CrossBorderAlert`    | Read-only alerts for neighboring barangays              |
| `AdminAuditLog`       | Admin action log (who did what, when)                   |
| `AdminNotification`   | In-app notifications for officials                      |
| `AuthSession`         | Revocable JWT session store                             |
| `OtpChallenge`        | OTP with lockout + expiry logic                         |
| `IpRateLimitBucket`   | DB-backed IP rate limiter state                         |

---

## Security Controls — Do Not Regress

**Implemented (must preserve):**
- JWT auth via HTTP-only cookies
- RBAC enforced server-side via `requireRole` middleware
- Server-side geofencing via `geofencing.service.ts`
- File type allowlists on evidence uploads
- Audit logging via `AdminAuditLog`
- Privacy masking in API responses
- CSRF protection via `csrf.ts`
- IP-based rate limiting via `rateLimit.ts` (DB-backed)
- Helmet security headers

**Planned but not yet implemented (do not block on these, but do not introduce regressions):**
- Full CORS header hardening
- OTP lockout enforcement
- Session revocation store enforcement
- Upload content validation (beyond MIME type checks)

---

## Environment Variables

**Frontend (root `.env`):**
```env
VITE_API_BASE_URL=/api
VITE_ENABLE_BEARER_AUTH=0
VITE_CSRF_COOKIE_NAME=tugon.csrf
VITE_CSRF_HEADER_NAME=x-csrf-token
```

**Backend (`server/.env`):**
```env
DATABASE_URL=          # Supabase PostgreSQL connection string (pooled)
DIRECT_URL=            # Supabase direct connection string (for Prisma migrations)
JWT_SECRET=
CORS_ALLOWED_ORIGINS=  # Comma-separated list of allowed origins
# OTP SMS provider credentials
# Supabase Storage credentials
# Rate limit config overrides
```

---

## Testing Baseline

**Backend (`node:test`):**
- Location: `server/tests/`
- Existing coverage: `/api/admin` role guards, audit log endpoints
- New tests must follow the same `node:test` pattern

**Frontend (Vitest):**
- Location: co-located test files (`*.test.ts`)
- Existing: `RequireAuth.test.ts`, `accessibility-layouts.test.ts`

**When adding tests:**
- Mirror the existing file naming pattern (`*.integration.test.ts` for backend, `*.test.ts` for frontend)
- Do not use Jest or any other test runner — only `node:test` for backend, Vitest for frontend

---

## Antigravity Skills

Antigravity reads project-local skills from `.antigravity/skills/`. Each skill folder contains a `SKILL.md` with YAML frontmatter (`name`, `description`) that Antigravity uses to auto-route tasks.

| Skill | Trigger | Location |
|-------|---------|----------|
| `audit` | Security audit, auth/RBAC/geofencing risk | `.antigravity/skills/audit/SKILL.md` |
| `check` | Build verification, production checks | `.antigravity/skills/check/SKILL.md` |
| `migrate` | Prisma migration, schema changes | `.antigravity/skills/migrate/SKILL.md` |
| `responsive` | Mobile/responsive layout audit | `.antigravity/skills/responsive/SKILL.md` |
| `review` | Pre-commit review of changes | `.antigravity/skills/review/SKILL.md` |
| `test` | Backend integration test execution | `.antigravity/skills/test/SKILL.md` |
| `ui-ux-pro-max` | UI/UX design, styling, redesign | `.antigravity/skills/ui-ux-pro-max/SKILL.md` |

See `.antigravity/skills/README.md` for the full index.

---

## Prompt Routing (Automatic)

When the user request clearly matches one of these categories, apply the corresponding skill **automatically**, even if not explicitly named.

| User Intent | Antigravity Skill | GitHub Copilot Prompt |
|-------------|-------------------|-----------------------|
| Security audit, auth/RBAC/geofencing risk review | `.antigravity/skills/audit/` | `.github/prompts/audit.prompt.md` |
| Build verification, production checks | `.antigravity/skills/check/` | `.github/prompts/check.prompt.md` |
| Prisma migration, schema changes | `.antigravity/skills/migrate/` | `.github/prompts/migrate.prompt.md` |
| Mobile/responsive layout checks | `.antigravity/skills/responsive/` | `.github/prompts/responsive.prompt.md` |
| Code review, pre-commit review | `.antigravity/skills/review/` | `.github/prompts/review.prompt.md` |
| Backend integration test execution | `.antigravity/skills/test/` | `.github/prompts/test.prompt.md` |
| UI/UX planning, redesign, frontend polish | `.antigravity/skills/ui-ux-pro-max/` | `.github/prompts/ui-ux.prompt.md` |

If multiple skills apply, prioritize: `migrate` → `audit` → `review` → `check` → `test` → `responsive` → `ui-ux-pro-max`.

---

## Session Management

Run `/turnover` when context reaches ~60%. At the start of a new session, always check for `session-handoff.md` in the root if it exists, and read it before doing anything else.

---

## Full Detail References

| Document | Purpose |
|----------|---------|
| [AGENTS.md](.github/AGENTS.md) | Hard rules summary for AI agents |
| [CLAUDE.md](CLAUDE.md) | Core coding behavior and stack reference |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full schema, API endpoints, folder structure, flows, implementation phases |
| [copilot-instructions.md](.github/copilot-instructions.md) | GitHub Copilot-specific instructions and prompt routing |
| [guidelines/](guidelines/) | Security controls matrix, AI implementation prompts |
| [.antigravity/skills/README.md](.antigravity/skills/README.md) | Antigravity skills index and routing priority |
