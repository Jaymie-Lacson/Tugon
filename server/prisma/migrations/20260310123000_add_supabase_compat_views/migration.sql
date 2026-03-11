-- Supabase compatibility views using lowercase names expected by frontend queries
-- These views map to Prisma-managed tables without changing existing schema design.

CREATE OR REPLACE VIEW public.profiles AS
SELECT
  u."id",
  u."is_verified",
  u."id_image_url",
  u."createdAt" AS created_at,
  u."updatedAt" AS updated_at
FROM public."User" u;

CREATE OR REPLACE VIEW public.reports AS
SELECT
  r."id",
  r."citizenUserId" AS sender_profile_id,
  r."submittedAt" AS created_at,
  r."updatedAt" AS updated_at,
  r."type"::text AS type,
  r."status"::text AS status,
  r."description"
FROM public."CitizenReport" r;

-- Helps Supabase PostgREST pick up new views quickly in managed environments.
NOTIFY pgrst, 'reload schema';