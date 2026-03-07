
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
- Backend: `render.yaml`
  
