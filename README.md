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
4. Configure frontend Supabase variables in root `.env`:
   - `VITE_SUPABASE_URL=<your-supabase-project-url>`
   - `VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>`
   - `VITE_SUPABASE_ID_BUCKET=resident-ids` (optional, defaults to `resident-ids`)
5. In Supabase Storage, create the bucket used for resident ID uploads (for example `resident-ids`).

## Supabase Storage Policies (Resident ID Uploads)

If you see: `new row violates row-level security policy` while uploading an ID, add these policies in Supabase SQL Editor (adjust bucket name if needed):

```sql
-- 1) Allow uploads for projects using backend JWT auth (no Supabase login session).
-- The app path format is: <user-id>/<timestamp>-<uuid>.<ext>
create policy "resident_ids_insert_own_folder"
on storage.objects
for insert
to anon, authenticated
with check (
   bucket_id = 'resident-ids'
   and coalesce((storage.foldername(name))[1], '') <> ''
);

-- 2) Allow read access to uploaded files in this bucket.
create policy "resident_ids_select_own_folder"
on storage.objects
for select
to anon, authenticated
using (
   bucket_id = 'resident-ids'
);
```

Notes:

- If you use a different bucket name, update both SQL snippets and `VITE_SUPABASE_ID_BUCKET`.
- TUGON user IDs are Prisma CUID values, so do not use UUID-only regex checks for the folder segment.
- Keep RLS enabled on `storage.objects`; narrow policies further if you later move to Supabase Auth sessions and can enforce `auth.uid()` matching.

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
