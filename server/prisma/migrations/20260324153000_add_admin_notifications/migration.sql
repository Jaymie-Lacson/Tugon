CREATE TABLE IF NOT EXISTS "AdminNotification" (
  "id" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "reportId" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminNotification_recipientUserId_readAt_createdAt_idx"
  ON "AdminNotification"("recipientUserId", "readAt", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminNotification_reportId_createdAt_idx"
  ON "AdminNotification"("reportId", "createdAt");
