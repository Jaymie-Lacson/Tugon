# AGENTS.md — TUGON

> Also read **CLAUDE.md** (root) before generating code.

This is the **TUGON** repository — a web-based incident management and geospatial decision-support system for Barangays 251, 252, and 256 in Tondo, Manila. IT capstone project.

---

## Hard Rules (Never Violate)

- **Web app only.** Do not convert to native mobile.
- **Three roles exactly:** `CITIZEN` · `OFFICIAL` · `SUPER_ADMIN`.
- **Ticket statuses** (preserve exactly in DB enum): `SUBMITTED` → `UNDER_REVIEW` → `IN_PROGRESS` → `RESOLVED` → `CLOSED` · `UNRESOLVABLE`
- **Incident types** (preserve exactly): `Pollution` · `Noise` · `Crime` · `Road Hazard` · `Other`
- **Incident form is step-by-step**: type → location map pin → description → evidence → review.
- **Evidence types**: photo and voice recording only (audio allowed only for Noise category).
- **Geofencing is server-side.** Route incidents only to the barangay owning the pinned coordinates. Frontend restrictions alone are insufficient. The geofencing service contract is:
  ```ts
  resolveBarangayFromCoordinates(lat, lng)
  ```
- **Cross-border alerts are informational only.** Neighboring barangays receive alerts but cannot act on incidents outside jurisdiction.
- **Heatmaps are for officials only**, and appear only after threshold-based clustering is reached.
- **Barangay is set at registration**, and must not be freely changed without explicit admin functionality.
- **Status changes must be validated server-side** and recorded in `TicketStatusHistory`.
- **RBAC is server-side.** Never rely on frontend-only permission checks.

---

## Dev Commands

```bash
# Install
npm install
npm --prefix server install

# Run (frontend :4173, backend :4000)
npm run dev
npm --prefix server run dev

# Frontend build + typecheck
npm run build

# Full prod check
npm run check:prod

# Prisma
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate -- --name <name>
npm --prefix server run prisma:migrate:deploy

# Tests
npm --prefix server run test:integration   # node:test — server/tests/*.integration.test.ts
npm run test:frontend                # Vitest  — src/**/*.test.ts
npm run test:e2e                   # Playwright — e2e/*.spec.ts
npm run test:frontend:a11y          # Accessibility smoke — scripts/a11y-smoke.cjs
```

---

## Architecture Quick Ref

### Frontend (`src/`)

- Entry: `src/main.tsx` (session restoration, route-based deferral)
- Routes: `src/app/routes.ts` (`/`, `/auth/*`, `/citizen/*`, `/app/*`, `/superadmin/*`)
- Auth: `src/app/utils/authSession.ts` (`localStorage` keyed as `tugon.auth.session`)
- Services: `src/app/services/*.ts` (API wrappers, CSRF bootstrap, session handling)
- Styles: `src/styles/index.css` → imports `fonts.css`, `tailwind.css`, `theme.css`
- Key components: `src/app/components/`, `src/app/pages/`
- Map: Leaflet via `react-leaflet` (`src/app/pages/MapView.tsx`)
- Taxonomy: `server/src/modules/reports/taxonomy.ts` (incident types)

### Backend (`server/src/`)

- Entry: `server/src/server.ts` → `createApp()` from `app.ts`
- Routes: `server/src/routes/index.ts` → `/api/auth/*`, `/api/citizen/*`, `/api/official/*`, `/api/admin/*`
- Auth middleware: `server/src/middleware/auth.ts` (JWT + cookie) + `csrf.ts`
- RBAC: `server/src/middleware/requireRole.ts`
- Reports: `server/src/modules/reports/` (CRUD, status transitions, evidence storage)
- Geofencing: `server/src/modules/map/geofencing.service.ts`
- Prisma: `server/prisma/schema.prisma`

### Database (Prisma)

- **User**: includes `role`, `isPhoneVerified`, `isVerified`, `isBanned`, verification fields
- **CitizenProfile**: links user → barangay
- **OfficialProfile**: links user → barangay + position
- **Barangay**: code, name, boundaryGeojson
- **CitizenReport**: geofenced via `routedBarangayCode`, status, category, severity, timeline
- **IncidentEvidence**: linked to report, Supabase Storage (ImageKit)
- **TicketStatusHistory**: audit trail of status changes
- **CrossBorderAlert**: read-only alerts for neighboring barangays
- **AuthSession**: revocable session store
- **OtpChallenge**: phone verification with lockout logic

---

## Testing

- **Backend integration tests**: `server/tests/*.integration.test.ts` — use node:test, mock Prisma via monkey-patching, enforce `NODE_ENV=test`, set `AUTH_ALLOW_BEARER_TOKENS=1`.
- **Frontend unit tests**: `src/**/*.test.ts` — Vitest.
- **E2E**: `e2e/*.spec.ts` — Playwright, requires backend running, stubs API in `beforeEach`.
- **A11y smoke**: `scripts/a11y-smoke.cjs` — static HTML checks.

Test env requires `AUTH_ALLOW_BEARER_TOKENS=1` and `AUTH_RETURN_TOKEN_IN_BODY=1` for token-based auth tests.

---

## Security Controls (Implemented — Do Not Regress)

- JWT via HTTP-only cookies (`tugon.sid`)
- Server-side RBAC (`requireRole` middleware)
- Server-side geofencing (jurisdiction enforcement)
- CSRF protection (cookie + header)
- IP-based rate limiting (DB-backed)
- Helmet security headers
- File type allowlists on uploads
- Audit logging (`AdminAuditLog`)
- Error sanitization (no internals leaked)

---

## Environment

- Frontend `.env`: `VITE_API_BASE_URL=/api`, `VITE_CSRF_COOKIE_NAME=tugon.csrf`
- Backend `server/.env`: `DATABASE_URL`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `OTP_DELIVERY_MODE=mock|sms`
- Production: Set `AUTH_RETURN_TOKEN_IN_BODY=0`, `AUTH_ALLOW_BEARER_TOKENS=0`

---

## Key Conventions

- **API path prefix**: `/api` (Vite proxies to backend :4000)
- **Auth token format**: JWT, signed with `JWT_SECRET` (32+ chars, base64)
- **Frontend uses `localStorage`** for session, not `sessionStorage` (per existing code)
- **Pretext** (`@chenglou/pretext`) is lazy-loaded after first paint in `App.tsx`
- **Fonts**: Self-hosted (Public Sans, IBM Plex Sans, IBM Plex Mono) in `/fonts/`
- **Tailwind v4** with custom design tokens in `theme.css`
- **Dark mode**: Minimal — light mode is primary

---

## Full Detail References

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Core coding behavior, stack, testing |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full schema, API, flows, phases |
| [.impeccable.md](.impeccable.md) | Design tokens, user personas, voice |
| [README.md](README.md) | Setup, deployment, offline demo |
| [session-handoff.md](session-handoff.md) | Previous session state (if exists) |

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
