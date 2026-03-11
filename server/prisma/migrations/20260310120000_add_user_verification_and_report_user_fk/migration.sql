-- Add two-tier verification columns to User
ALTER TABLE "User"
ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "id_image_url" TEXT;

-- Add report sender relation to User (if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CitizenReport_citizenUserId_fkey'
  ) THEN
    ALTER TABLE "CitizenReport"
    ADD CONSTRAINT "CitizenReport_citizenUserId_fkey"
    FOREIGN KEY ("citizenUserId") REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END
$$;

-- Ensure join/filter performance for report sender lookups
CREATE INDEX IF NOT EXISTS "CitizenReport_citizenUserId_idx" ON "CitizenReport" ("citizenUserId");