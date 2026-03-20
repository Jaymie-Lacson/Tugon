DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationStatus') THEN
    CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "id_image_url" TEXT,
ADD COLUMN IF NOT EXISTS "verification_status" "VerificationStatus",
ADD COLUMN IF NOT EXISTS "verification_rejection_reason" TEXT,
ADD COLUMN IF NOT EXISTS "verified_by_user_id" TEXT,
ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "is_banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "banned_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "banned_reason" TEXT,
ADD COLUMN IF NOT EXISTS "banned_by_user_id" TEXT;

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

CREATE INDEX IF NOT EXISTS "CitizenReport_citizenUserId_idx" ON "CitizenReport"("citizenUserId");
