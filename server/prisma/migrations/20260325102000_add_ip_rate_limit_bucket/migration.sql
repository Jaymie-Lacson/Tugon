CREATE TABLE IF NOT EXISTS "IpRateLimitBucket" (
  "bucketKey" TEXT NOT NULL,
  "windowStartMs" BIGINT NOT NULL,
  "count" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IpRateLimitBucket_pkey" PRIMARY KEY ("bucketKey")
);

CREATE INDEX IF NOT EXISTS "IpRateLimitBucket_updatedAt_idx"
  ON "IpRateLimitBucket"("updatedAt");
