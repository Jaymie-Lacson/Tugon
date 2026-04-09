# Legacy ID Image Path Migration Plan (Supabase -> ImageKit)

## Goal
Migrate legacy `User.idImageUrl` values that still point to Supabase object paths/URLs to ImageKit-backed paths while preserving verification workflow behavior.

## Scope
- Table: `User`
- Field: `id_image_url` (Prisma: `idImageUrl`)
- Affected values:
  - Supabase Storage URLs, e.g. `https://<project>.supabase.co/storage/v1/object/...`
  - Supabase object paths, e.g. `<userId>/<timestamp>-...-id.jpg`
- Not in scope:
  - `data:image/...` fallback values
  - Existing `http(s)` URLs that are already ImageKit-based

## Pre-checks
1. Ensure ImageKit is configured in backend env:
   - `IMAGEKIT_PUBLIC_KEY`
   - `IMAGEKIT_PRIVATE_KEY`
   - `IMAGEKIT_URL_ENDPOINT`
   - `IMAGEKIT_ID_FOLDER` (default `/resident-ids`)
2. Keep fail-closed flags as desired:
   - `REQUIRE_VERIFICATION_ID_STORAGE_UPLOAD=1` for strict mode.
3. Take a DB backup before any write migration.

## Candidate Discovery (SQL)
Use these read-only queries first:

```sql
-- Count potential Supabase URL/path legacy records
SELECT COUNT(*) AS legacy_count
FROM "User"
WHERE "id_image_url" IS NOT NULL
  AND (
    "id_image_url" ILIKE '%supabase.co/storage/v1/object/%'
    OR (
      "id_image_url" NOT ILIKE 'http%'
      AND "id_image_url" NOT ILIKE 'data:image/%'
    )
  );
```

```sql
-- Sample rows for manual verification
SELECT "id", "phoneNumber", "id_image_url", "verification_status", "updatedAt"
FROM "User"
WHERE "id_image_url" IS NOT NULL
  AND (
    "id_image_url" ILIKE '%supabase.co/storage/v1/object/%'
    OR (
      "id_image_url" NOT ILIKE 'http%'
      AND "id_image_url" NOT ILIKE 'data:image/%'
    )
  )
ORDER BY "updatedAt" DESC
LIMIT 100;
```

## Script Plan
Implement `server/scripts/migrate-legacy-id-image-paths.cjs` with these phases:

Run commands:

```bash
# Dry-run analysis
npm --prefix server run id-image:migrate -- --dry-run

# Execute migration in controlled batches
npm --prefix server run id-image:migrate -- --execute --limit=100

# Roll back from migration log (dry-run first)
npm --prefix server run id-image:rollback -- --file=server/backups/migrations/<log>.jsonl --dry-run
npm --prefix server run id-image:rollback -- --file=server/backups/migrations/<log>.jsonl --execute
```

1. `--dry-run` mode (default)
- Read candidate users from DB.
- Classify each source as:
  - `supabase-public-url`
  - `supabase-path`
  - `skip-inline-data-url`
  - `skip-already-imagekit-url`
- Print counts and first N samples.
- Do not modify DB.

2. `--execute` mode
For each candidate record:
- Resolve raw bytes from source:
  - `supabase-public-url`: download via HTTPS.
  - `supabase-path`: fetch from Supabase Storage using service credentials (temporary migration-only code path).
- Upload bytes to ImageKit with private visibility:
  - Folder: `${IMAGEKIT_ID_FOLDER}/${userId}`
  - File naming: preserve extension where possible.
- Update `User.id_image_url` with new ImageKit `filePath` (not a public URL).
- Write an append-only JSONL migration log containing:
  - user id
  - old value
  - new value
  - status
  - error (if any)
  - timestamp

3. Idempotency and safety
- Skip records where `id_image_url` already points to ImageKit file path/URL.
- Add `--limit=<n>` and `--user-id=<id>` for controlled batches.
- Continue on per-record errors; summarize failures at end.

4. Verification step after execution
- Re-run candidate query and ensure count reaches zero (or expected remainder).
- Spot-check preview endpoint behavior for migrated accounts:
  - `GET /api/citizen/verification-status`
  - verify `idImagePreviewUrl` is present.

## Rollback Plan
Use the migration JSONL log to restore previous values:
- For each `success` entry, write back `oldValue` to `id_image_url`.
- Keep rollback script separate: `server/scripts/rollback-legacy-id-image-paths.cjs`.

## Operational Notes
- Run during low traffic.
- Batch execution recommended (e.g., 100-500 users per run).
- Keep Supabase storage credentials available only during migration window.
- Remove temporary Supabase fetch logic after migration completes.
