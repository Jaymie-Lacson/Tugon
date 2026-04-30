-- Remove Fire from CitizenReport taxonomy constraints and normalize existing rows.

ALTER TABLE "CitizenReport"
DROP CONSTRAINT IF EXISTS "CitizenReport_category_check",
DROP CONSTRAINT IF EXISTS "CitizenReport_subcategory_check",
DROP CONSTRAINT IF EXISTS "CitizenReport_category_subcategory_pair_check",
DROP CONSTRAINT IF EXISTS "CitizenReport_mediation_check";

-- Normalize rows to the updated non-fire taxonomy.
UPDATE "CitizenReport"
SET "category" = CASE "category"
  WHEN 'Garbage and Sanitation' THEN 'Pollution'
  WHEN 'Public Disturbance' THEN 'Noise'
  WHEN 'Road and Street Issues' THEN 'Road Hazard'
  WHEN 'Hazards and Safety' THEN 'Other'
  WHEN 'Neighbor Disputes / Lupon' THEN 'Other'
  WHEN 'Others' THEN 'Other'
  WHEN 'Fire' THEN 'Other'
  ELSE "category"
END;

UPDATE "CitizenReport"
SET
  "subcategory" = CASE
    WHEN "category" = 'Pollution' THEN CASE
      WHEN "subcategory" = 'Air pollution (smoke or fumes)' THEN 'Air pollution (smoke or fumes)'
      WHEN "subcategory" = 'Water contamination' THEN 'Water contamination'
      WHEN "subcategory" IN ('Illegal dumping or waste', 'Illegal dumping', 'Uncollected trash') THEN 'Illegal dumping or waste'
      WHEN "subcategory" IN ('Blocked drainage or unsanitary area', 'Clogged canals', 'Dead animals') THEN 'Blocked drainage or unsanitary area'
      ELSE 'Illegal dumping or waste'
    END
    WHEN "category" = 'Noise' THEN CASE
      WHEN "subcategory" IN ('Loud music or karaoke', 'Loud noises or late-night karaoke') THEN 'Loud music or karaoke'
      WHEN "subcategory" = 'Construction noise' THEN 'Construction noise'
      WHEN "subcategory" IN ('Street disturbance noise', 'Drinking in public streets', 'Loitering') THEN 'Street disturbance noise'
      WHEN "subcategory" = 'Animal-related noise' THEN 'Animal-related noise'
      ELSE 'Street disturbance noise'
    END
    WHEN "category" = 'Crime' THEN CASE
      WHEN "subcategory" = 'Theft or robbery' THEN 'Theft or robbery'
      WHEN "subcategory" = 'Assault or physical altercation' THEN 'Assault or physical altercation'
      WHEN "subcategory" = 'Vandalism' THEN 'Vandalism'
      WHEN "subcategory" = 'Suspicious activity' THEN 'Suspicious activity'
      ELSE 'Suspicious activity'
    END
    WHEN "category" = 'Road Hazard' THEN CASE
      WHEN "subcategory" = 'Potholes' THEN 'Potholes'
      WHEN "subcategory" = 'Broken streetlights' THEN 'Broken streetlights'
      WHEN "subcategory" = 'Blocked sidewalks' THEN 'Blocked sidewalks'
      WHEN "subcategory" IN ('Road obstruction or illegal parking', 'Illegal parking') THEN 'Road obstruction or illegal parking'
      ELSE 'Road obstruction or illegal parking'
    END
    WHEN "category" = 'Other' THEN 'Unlisted general issues'
    ELSE 'Unlisted general issues'
  END,
  "requiresMediation" = false,
  "mediationWarning" = NULL;

ALTER TABLE "CitizenReport"
ADD CONSTRAINT "CitizenReport_category_check" CHECK (
  "category" IN (
    'Pollution',
    'Noise',
    'Crime',
    'Road Hazard',
    'Other'
  )
),
ADD CONSTRAINT "CitizenReport_subcategory_check" CHECK (
  "subcategory" IN (
    'Air pollution (smoke or fumes)',
    'Water contamination',
    'Illegal dumping or waste',
    'Blocked drainage or unsanitary area',
    'Loud music or karaoke',
    'Construction noise',
    'Street disturbance noise',
    'Animal-related noise',
    'Theft or robbery',
    'Assault or physical altercation',
    'Vandalism',
    'Suspicious activity',
    'Potholes',
    'Broken streetlights',
    'Blocked sidewalks',
    'Road obstruction or illegal parking',
    'Unlisted general issues'
  )
),
ADD CONSTRAINT "CitizenReport_category_subcategory_pair_check" CHECK (
  (
    "category" = 'Pollution'
    AND "subcategory" IN (
      'Air pollution (smoke or fumes)',
      'Water contamination',
      'Illegal dumping or waste',
      'Blocked drainage or unsanitary area'
    )
  )
  OR (
    "category" = 'Noise'
    AND "subcategory" IN (
      'Loud music or karaoke',
      'Construction noise',
      'Street disturbance noise',
      'Animal-related noise'
    )
  )
  OR (
    "category" = 'Crime'
    AND "subcategory" IN (
      'Theft or robbery',
      'Assault or physical altercation',
      'Vandalism',
      'Suspicious activity'
    )
  )
  OR (
    "category" = 'Road Hazard'
    AND "subcategory" IN (
      'Potholes',
      'Broken streetlights',
      'Blocked sidewalks',
      'Road obstruction or illegal parking'
    )
  )
  OR (
    "category" = 'Other'
    AND "subcategory" = 'Unlisted general issues'
  )
),
ADD CONSTRAINT "CitizenReport_mediation_check" CHECK (
  "requiresMediation" = false
  AND "mediationWarning" IS NULL
);
