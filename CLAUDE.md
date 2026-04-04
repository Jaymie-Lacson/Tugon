# CLAUDE.md — TUGON

> Always read **AGENTS.md**, **ARCHITECTURE.md**, and **ANTIGRAVITY.md** before generating or editing code.

## What is TUGON

**TUGON: A Web-Based Incident Management and Decision Support System using Geospatial Analytics**

Browser-based civic platform for Barangays 251, 252, and 256 in Tondo, Manila. IT capstone project. Solutions must be technically sound and academically defensible.

TUGON **augments** — never replaces — the traditional barangay/police blotter.

---

## Stack

| Layer    | Technology                                                  |
|----------|-------------------------------------------------------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS + React Router     |
| Backend  | Node.js + Express + TypeScript                              |
| Database | PostgreSQL via Supabase · Prisma ORM                        |
| Maps     | Leaflet / Mapbox GL JS                                      |
| Auth     | JWT · Phone OTP verification                                |
| Uploads  | Multer (photo + voice recordings)                           |

---

## Dev commands

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

# Tests (node:test runner — not Jest/Vitest)
npm --prefix server run test:integration   # files in server/tests/
```

---

## Hard rules — never violate these

1. **Web app only.** Do not convert to native mobile. All features must remain browser-responsive.
2. **Three roles:** Citizen / Resident · Barangay Official · Super Admin.
3. **Ticket statuses** — preserve exactly:
   `Submitted → Under Review → In Progress → Resolved → Closed · Unresolvable`
4. **Incident types** — preserve exactly:
   `Pollution · Noise · Crime · Road Hazard · Other`
5. **Incident form is step-by-step** (type → location → description → evidence → review).
6. **Evidence types:** photo and voice recording only.
7. **Geofencing is server-side.** Route incidents only to the barangay that owns the pinned coordinates. Frontend restrictions are not sufficient.
8. **Cross-border alerts are informational only.** Neighboring barangays cannot act on incidents outside their jurisdiction.
9. **Heatmaps are for officials only** and appear only after a threshold of clustered incidents is reached — not as simple pin visualization.
10. **Barangay is set at registration** and must not be freely switched without explicit admin functionality.
11. **Status changes must be validated server-side** and recorded in `status_history`.
12. **RBAC is server-side.** Never rely on frontend-only permission checks.

---

## Design tokens

| Token       | Value                               |
|-------------|-------------------------------------|
| Font        | Roboto family                       |
| Primary     | Dark Blue `#1E3A8A`                 |
| Alert       | Red `#B91C1C`                       |
| Analytics   | Ochre/Gold `#B4730A`                |
| Style       | Modern government / civic dashboard |
| Mobile nav  | Bottom navigation for citizen views |

---

## Coding behavior

- Read affected files before editing.
- Prefer small, reviewable changes over broad rewrites.
- Do not rename variables, functions, routes, or files unnecessarily.
- Do not add features, refactoring, or "improvements" beyond what was asked.
- Do not add error handling for scenarios that cannot happen.
- Preserve existing working behavior unless explicitly told otherwise.
- Add comments only where logic is not self-evident.
- Avoid introducing unnecessary dependencies.
- Keep solutions minimal and capstone-defensible.

### Before a non-trivial edit

1. Summarize what you understood.
2. List files likely to be affected.
3. Propose the smallest safe plan.
4. Then generate or edit code.
5. State any assumptions or follow-up checks.

### When debugging

1. Identify likely root causes first.
2. Prioritize the fix with the highest probability.
3. Point to exact files/lines before proposing changes.

---

## Key service contracts (do not break)

```ts
resolveBarangayFromCoordinates(lat, lng)
isWithinBarangayBoundary(lat, lng, barangayId)
findNeighborBarangays(barangayId)
isNearBoundary(lat, lng, barangayId)
generateHeatmapData({ barangayId, incidentType, fromDate, toDate, threshold })
```

---

## Database hosting

- PostgreSQL hosted on **Supabase**.
- Use environment variables for all connection strings — no local-only assumptions.
- Evidence files (photos, voice) may use **Supabase Storage buckets**.

Environment files:
- `.env.example` → `.env` (root, used by Vite)
- `server/.env.example` → `server/.env` (set real `DATABASE_URL`)

---

## Test baseline (backend)

Current integration test coverage in `server/tests/admin.integration.test.ts`:
- `/api/admin` role guard (401 · 403 · 200)
- `GET /api/admin/audit-logs`
- `GET /api/admin/audit-logs/export`
- Query filter forwarding and error mapping

New tests should follow the same `node:test` pattern and live in `server/tests/`.

---

## Security gaps (known — do not regress on implemented controls)

Implemented: JWT auth · RBAC · server-side geofencing · file type allowlists · audit logging · privacy masking.

Planned (not yet implemented): CORS hardening · security headers · rate limiting · OTP lockout · session revocation store · upload content checks.

---

## Session management

Run `/turnover` when context reaches 60%. Always read `session-handoff.md` at the start of a new session if it exists.

---

## Full detail

See [AGENTS.md](AGENTS.md) for rule summary, [ARCHITECTURE.md](ARCHITECTURE.md) for schema, API endpoints, folder structure, flows, and implementation phases, and [ANTIGRAVITY.md](ANTIGRAVITY.md) for the Antigravity AI agent execution protocol, architecture map, and feature implementation guide.
