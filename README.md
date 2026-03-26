
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
4. Recommended auth security defaults:
   - Backend: `AUTH_RETURN_TOKEN_IN_BODY=0`, `AUTH_ALLOW_BEARER_TOKENS=0`, `CSRF_COOKIE_NAME=tugon.csrf`, `CSRF_HEADER_NAME=x-csrf-token`
   - Frontend: `VITE_ENABLE_BEARER_AUTH=0`, `VITE_CSRF_COOKIE_NAME=tugon.csrf`, `VITE_CSRF_HEADER_NAME=x-csrf-token`

## Run

- Frontend (Vite): `npm run dev`
- Backend (Express): `npm --prefix server run dev`

## Prisma

- Generate client: `npm --prefix server run prisma:generate`
- Create migration (dev): `npm --prefix server run prisma:migrate -- --name <migration_name>`
- Apply migrations (deploy/prod): `npm --prefix server run prisma:migrate:deploy`
- Migration status: `npm --prefix server run prisma:status`

## Offline Demo Database (Clone Online -> Local)

Use this workflow before your defense day while internet is available, then run locally without internet.

Prerequisite:
- Install PostgreSQL client tools so `pg_dump`, `pg_restore`, and `psql` are available in your terminal `PATH`.

1. Set these variables in `server/.env`:
   - `ONLINE_DATABASE_URL=<your current online/supabase database URL>`
   - `LOCAL_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tugon_demo`
2. Create a dump from online DB:
   - `npm --prefix server run db:dump:online`
3. Restore dump to local DB:
   - `npm --prefix server run db:restore:local`
4. Point backend runtime to local DB for the demo:
   - set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tugon_demo`
   - set `DIRECT_URL=postgresql://postgres:postgres@localhost:5432/tugon_demo`
5. Start app locally:
   - backend: `npm --prefix server run dev`
   - frontend: `npm run dev`

Notes:
- Dumps are saved under `server/backups/` as `.dump` files.
- Restore script refuses non-local targets by default for safety.
- To restore a specific dump file: `npm --prefix server run db:restore:local -- --file=server/backups/<file>.dump`

## Production Checks

- End-to-end production check command:
  - `npm run check:prod`

This runs:
- frontend build
- backend build
- Prisma schema validate
- Prisma client generation
- Prisma migration status check

- Security dependency audit gate:
   - `npm run audit:security`

This fails on high-severity production dependency vulnerabilities in both root and `server/`.

## Security CI

- Workflow: `.github/workflows/security-checks.yml`
- Runs on push/PR to `main` and manual dispatch.
- Includes:
   - dependency security audit gate (`npm run audit:security`)
   - security-focused backend integration regression tests

## Deployment Manifests

- Frontend: `vercel.json`
- Backend: `railway.json`

## Deploy Backend on Railway

1. Create a new Railway project from this GitHub repository.
2. Add these service variables in Railway:
   - `NODE_ENV=production`
   - `PORT=4000` (Railway also injects `PORT`; keep app reading `process.env.PORT`)
   - `CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>,http://localhost:5173` (comma-separated exact origins; do not use `*` when credentials/cookies are enabled)
   - `JWT_SECRET=<long-random-secret>`
   - `JWT_EXPIRES_IN=8h`
   - `AUTH_RETURN_TOKEN_IN_BODY=0` (recommended)
   - `AUTH_ALLOW_BEARER_TOKENS=0` (recommended for browser deployments)
   - `CSRF_COOKIE_NAME=tugon.csrf`
   - `CSRF_HEADER_NAME=x-csrf-token`
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
   - `DSS_AI_ENABLED=1` (set to `1` to enable real AI-backed decision support generation)
   - `DSS_AI_PROVIDER_URL=https://openrouter.ai/api/v1/chat/completions` (OpenRouter OpenAI-compatible endpoint)
   - `DSS_AI_API_KEY=<your-openrouter-api-key>`
   - `DSS_AI_MODEL=meta-llama/llama-3.1-8b-instruct:free` (recommended free model)
   - `DSS_AI_HTTP_REFERER=https://<your-frontend-domain>` (recommended for OpenRouter)
   - `DSS_AI_APP_NAME=TUGON DSS` (optional app label for OpenRouter logs)
3. Railway uses [`railway.json`](./railway.json) to:
   - install/build server (`npm --prefix server ...`)
   - optionally run Prisma migrations before deploy (enabled only when `RUN_DB_MIGRATIONS=1`)
   - start API server
   - health check on `/api/health`
4. Recommended migration workflow:
   - keep Railway at `RUN_DB_MIGRATIONS=0` for stable deploys
   - run migrations manually from a machine that can reach Supabase direct host:
     - `DATABASE_URL=<DIRECT_URL> npm --prefix server run prisma:migrate:deploy`
5. Configure frontend API routing to keep browser auth cookies first-party:
   - `vercel.json` rewrites `/api/*` to `https://tugon-server-production.up.railway.app/api/*`
   - set `VITE_API_BASE_URL=/api`
   - `VITE_ENABLE_BEARER_AUTH=0`
   - `VITE_CSRF_COOKIE_NAME=tugon.csrf`
   - `VITE_CSRF_HEADER_NAME=x-csrf-token`
   - for local development, Vite proxies `/api` to `http://localhost:4000`

## Railway Deployment Health Checklist

Run this in `server/` before deploying backend changes:

- `npm run deploy:railway:check`

What it checks:

- required env vars are present (`JWT_SECRET`, `DATABASE_URL`, and `DIRECT_URL` when migrations are enabled)
- Prisma schema validation passes
- Prisma client generation passes
- migration status is reachable when `RUN_DB_MIGRATIONS=1`

