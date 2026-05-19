-- Enable RLS and add per-user policies for `disclosures`
-- Run this in the Supabase SQL editor after creating the table (003_create_disclosures.sql)

ALTER TABLE IF EXISTS public.disclosures ENABLE ROW LEVEL SECURITY;

-- Drop any existing policy and recreate to ensure idempotence
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'disclosures' AND policyname = 'disclosures_user_only') THEN
    EXECUTE 'DROP POLICY disclosures_user_only ON public.disclosures';
  END IF;
END$$;

CREATE POLICY disclosures_user_only
  ON public.disclosures
  FOR ALL
  USING (uid = auth.uid()::uuid)
  WITH CHECK (uid = auth.uid()::uuid);

-- Optionally allow the service role to bypass RLS (server-side operations should use service role key)
