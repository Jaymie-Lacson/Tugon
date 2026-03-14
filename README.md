
# TUGON

Web-based incident management and geospatial decision-support system for Barangays 251, 252, and 256 in Tondo, Manila.

## Local Setup

1. Install dependencies:
   - `npm install`
   - `npm --prefix server install`
2. Create env files:
   - copy `.env.example` to `.env`
   - copy `server/.env.example` to `server/.env` (or keep only root `.env`)
3. Set a real Supabase PostgreSQL `DATABASE_URL` in the env file used by the server.

## Run

- Frontend (Vite): `npm run dev`
- Backend (Express): `npm --prefix server run dev`

## Prisma

- Generate client: `npm --prefix server run prisma:generate`
- Create migration (dev): `npm --prefix server run prisma:migrate -- --name <migration_name>`
- Apply migrations (deploy/prod): `npm --prefix server run prisma:migrate:deploy`
- Migration status: `npm --prefix server run prisma:status`

## Production Checks

- End-to-end production check command:
  - `npm run check:prod`

This runs:
- frontend build
- backend build
- Prisma schema validate
- Prisma client generation
- Prisma migration status check

## Deployment Manifests

- Frontend: `vercel.json`
- Backend: `railway.json`

## Deploy Backend on Railway

1. Create a new Railway project from this GitHub repository.
2. Add these service variables in Railway:
   - `NODE_ENV=production`
   - `PORT=4000` (Railway also injects `PORT`; keep app reading `process.env.PORT`)
   - `JWT_SECRET=<long-random-secret>`
   - `JWT_EXPIRES_IN=8h`
   - `OTP_EXPIRY_MINUTES=5`
   - `OTP_DELIVERY_MODE=mock` (for capstone/demo OTP flow without SMS provider)
   - `DATABASE_URL=<your-supabase-session-pooler-url>`
   - `DIRECT_URL=<your-supabase-direct-postgres-url>`
   - `RUN_DB_MIGRATIONS=0` (default; avoids failing deploys when direct DB access is unavailable)
   - Set `RUN_DB_MIGRATIONS=1` only when you intentionally want Railway to run `prisma migrate deploy` using `DIRECT_URL`.
   - `SUPABASE_URL=<your-supabase-project-url>`
   - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key-for-storage-upload>`
   - `SUPABASE_STORAGE_BUCKET=incident-evidence`
   - `REQUIRE_EVIDENCE_STORAGE_UPLOAD=1` (recommended for production; rejects report submit when storage upload is unavailable)
3. Railway uses [`railway.json`](./railway.json) to:
   - install/build server (`npm --prefix server ...`)
   - optionally run Prisma migrations before deploy (enabled only when `RUN_DB_MIGRATIONS=1`)
   - start API server
   - health check on `/api/health`
4. Recommended migration workflow:
   - keep Railway at `RUN_DB_MIGRATIONS=0` for stable deploys
   - run migrations manually from a machine that can reach Supabase direct host:
     - `DATABASE_URL=<DIRECT_URL> npm --prefix server run prisma:migrate:deploy`
5. After first successful deploy, copy your Railway public URL and set frontend env:
   - `VITE_API_BASE_URL=https://<your-service>.up.railway.app/api`

## Railway Deployment Health Checklist

Run this in `server/` before deploying backend changes:

- `npm run deploy:railway:check`

What it checks:

- required env vars are present (`JWT_SECRET`, `DATABASE_URL`, and `DIRECT_URL` when migrations are enabled)
- Prisma schema validation passes
- Prisma client generation passes
- migration status is reachable when `RUN_DB_MIGRATIONS=1`
  
