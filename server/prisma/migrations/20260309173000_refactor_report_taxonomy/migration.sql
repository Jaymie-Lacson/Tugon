-- Refactor incident classification to category/subcategory taxonomy with mediation metadata.
ALTER TABLE "CitizenReport"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "subcategory" TEXT,
  ADD COLUMN "requiresMediation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mediationWarning" TEXT;

UPDATE "CitizenReport"
SET
  "category" = CASE "type"
    WHEN 'FIRE' THEN 'Hazards and Safety'
    WHEN 'POLLUTION' THEN 'Garbage and Sanitation'
    WHEN 'NOISE' THEN 'Public Disturbance'
    WHEN 'CRIME' THEN 'Others'
    WHEN 'ROAD_HAZARD' THEN 'Road and Street Issues'
    WHEN 'OTHER' THEN 'Others'
    ELSE 'Others'
  END,
  "subcategory" = CASE "type"
    WHEN 'FIRE' THEN 'Fire hazards'
    WHEN 'POLLUTION' THEN 'Illegal dumping'
    WHEN 'NOISE' THEN 'Loud noises or late-night karaoke'
    WHEN 'CRIME' THEN 'Unlisted general issues'
    WHEN 'ROAD_HAZARD' THEN 'Potholes'
    WHEN 'OTHER' THEN 'Unlisted general issues'
    ELSE 'Unlisted general issues'
  END;

ALTER TABLE "CitizenReport"
  ALTER COLUMN "category" SET NOT NULL,
  ALTER COLUMN "subcategory" SET NOT NULL;

ALTER TABLE "CitizenReport"
  DROP COLUMN "type";

DROP TYPE IF EXISTS "IncidentType";

ALTER TABLE "CitizenReport"
  ADD CONSTRAINT "CitizenReport_category_check"
  CHECK (
    "category" IN (
      'Garbage and Sanitation',
      'Public Disturbance',
      'Road and Street Issues',
      'Hazards and Safety',
      'Neighbor Disputes / Lupon',
      'Others'
    )
  ),
  ADD CONSTRAINT "CitizenReport_subcategory_check"
  CHECK (
    "subcategory" IN (
      'Uncollected trash',
      'Illegal dumping',
      'Clogged canals',
      'Dead animals',
      'Loud noises or late-night karaoke',
      'Drinking in public streets',
      'Loitering',
      'Broken streetlights',
      'Illegal parking',
      'Blocked sidewalks',
      'Potholes',
      'Dangling or sparking electric wires',
      'Stray or aggressive animals',
      'Fire hazards',
      'Petty quarrels and fighting',
      'Unpaid personal debts',
      'Gossip and slander',
      'Property boundary disputes',
      'Unlisted general issues'
    )
  ),
  ADD CONSTRAINT "CitizenReport_category_subcategory_pair_check"
  CHECK (
    ("category" = 'Garbage and Sanitation' AND "subcategory" IN ('Uncollected trash', 'Illegal dumping', 'Clogged canals', 'Dead animals')) OR
    ("category" = 'Public Disturbance' AND "subcategory" IN ('Loud noises or late-night karaoke', 'Drinking in public streets', 'Loitering')) OR
    ("category" = 'Road and Street Issues' AND "subcategory" IN ('Broken streetlights', 'Illegal parking', 'Blocked sidewalks', 'Potholes')) OR
    ("category" = 'Hazards and Safety' AND "subcategory" IN ('Dangling or sparking electric wires', 'Stray or aggressive animals', 'Fire hazards')) OR
    ("category" = 'Neighbor Disputes / Lupon' AND "subcategory" IN ('Petty quarrels and fighting', 'Unpaid personal debts', 'Gossip and slander', 'Property boundary disputes')) OR
    ("category" = 'Others' AND "subcategory" = 'Unlisted general issues')
  ),
  ADD CONSTRAINT "CitizenReport_mediation_check"
  CHECK (
    ("category" = 'Neighbor Disputes / Lupon' AND "requiresMediation" = true AND "mediationWarning" = 'Filing this report requires both parties to attend a face-to-face mediation hearing at the barangay hall.') OR
    ("category" <> 'Neighbor Disputes / Lupon' AND "requiresMediation" = false AND "mediationWarning" IS NULL)
  );
