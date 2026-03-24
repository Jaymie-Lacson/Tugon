DO $$
BEGIN
  CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION', 'PASSWORD_RESET');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OtpChallenge" (
  "id" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "purpose" "OtpPurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "failedVerifyAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockoutUntil" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3) NOT NULL,
  "registrationFullName" TEXT,
  "registrationBarangayCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OtpChallenge_phoneNumber_purpose_key"
  ON "OtpChallenge"("phoneNumber", "purpose");
CREATE INDEX IF NOT EXISTS "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");
