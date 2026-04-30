-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'OFFICIAL', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'UNRESOLVABLE');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('FIRE', 'POLLUTION', 'NOISE', 'CRIME', 'ROAD_HAZARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "barangayId" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitizenProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "barangayId" TEXT NOT NULL,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barangay" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "boundaryGeojson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Barangay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenReport" (
    "id" TEXT NOT NULL,
    "citizenUserId" TEXT NOT NULL,
    "routedBarangayCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "type" "IncidentType" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'SUBMITTED',
    "location" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "ReportSeverity" NOT NULL,
    "affectedCount" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hasPhotos" BOOLEAN NOT NULL DEFAULT false,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "hasAudio" BOOLEAN NOT NULL DEFAULT false,
    "assignedOfficer" TEXT,
    "assignedUnit" TEXT,
    "resolutionNote" TEXT,

    CONSTRAINT "CitizenReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossBorderAlert" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sourceBarangayCode" TEXT NOT NULL,
    "targetBarangayCode" TEXT NOT NULL,
    "alertReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "CrossBorderAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketStatusHistory" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenProfile_userId_key" ON "CitizenProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialProfile_userId_key" ON "OfficialProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Barangay_code_key" ON "Barangay"("code");

-- CreateIndex
CREATE INDEX "CrossBorderAlert_targetBarangayCode_createdAt_idx" ON "CrossBorderAlert"("targetBarangayCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrossBorderAlert_reportId_targetBarangayCode_key" ON "CrossBorderAlert"("reportId", "targetBarangayCode");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_reportId_createdAt_idx" ON "TicketStatusHistory"("reportId", "createdAt");

-- AddForeignKey
ALTER TABLE "CitizenProfile" ADD CONSTRAINT "CitizenProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenProfile" ADD CONSTRAINT "CitizenProfile_barangayId_fkey" FOREIGN KEY ("barangayId") REFERENCES "Barangay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialProfile" ADD CONSTRAINT "OfficialProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialProfile" ADD CONSTRAINT "OfficialProfile_barangayId_fkey" FOREIGN KEY ("barangayId") REFERENCES "Barangay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossBorderAlert" ADD CONSTRAINT "CrossBorderAlert_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CitizenReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CitizenReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

