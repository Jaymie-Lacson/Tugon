-- Remove denormalized derived attributes from CitizenReport.
-- hasPhotos, photoCount, and hasAudio are now computed dynamically
-- from the IncidentEvidence table via COUNT/filter in the application layer.
ALTER TABLE "CitizenReport" DROP COLUMN "hasPhotos";
ALTER TABLE "CitizenReport" DROP COLUMN "photoCount";
ALTER TABLE "CitizenReport" DROP COLUMN "hasAudio";
