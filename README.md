
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
    - `DATABASE_URL=<your-supabase-direct-postgres-url>`
   - If direct URI is unreachable, use Supabase Session Pooler URI for `DATABASE_URL`
3. Railway uses [`railway.json`](./railway.json) to:
   - install/build server (`npm --prefix server ...`)
   - run Prisma migrations before deploy
   - start API server
   - health check on `/api/health`
4. After first successful deploy, copy your Railway public URL and set frontend env:
   - `VITE_API_BASE_URL=https://<your-service>.up.railway.app/api`
  
