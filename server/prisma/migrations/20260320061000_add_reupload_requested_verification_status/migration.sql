DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationStatus') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'VerificationStatus'
        AND e.enumlabel = 'REUPLOAD_REQUESTED'
    ) THEN
      ALTER TYPE "VerificationStatus" ADD VALUE 'REUPLOAD_REQUESTED';
    END IF;
  END IF;
END
$$;
