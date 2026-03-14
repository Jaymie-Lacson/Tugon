CREATE TABLE "IncidentEvidence" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "storageProvider" TEXT NOT NULL,
  "storagePath" TEXT,
  "publicUrl" TEXT,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IncidentEvidence_reportId_createdAt_idx" ON "IncidentEvidence"("reportId", "createdAt");

ALTER TABLE "IncidentEvidence"
ADD CONSTRAINT "IncidentEvidence_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "CitizenReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
