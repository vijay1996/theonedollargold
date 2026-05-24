CREATE TABLE IF NOT EXISTS public.ai_insight (
  id uuid PRIMARY KEY,
  uid uuid REFERENCES public.users(uid) ON DELETE CASCADE,
  overall_health_score numeric,
  summary text,
  red_flags text,
  suggestions text,
  positives text,
  generatedAt text
);

ALTER TABLE IF EXISTS public.ai_insight ENABLE ROW LEVEL SECURITY;

-- Drop any existing policy and recreate to ensure idempotence
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_insight' AND policyname = 'disclosures_user_only') THEN
    EXECUTE 'DROP POLICY disclosures_user_only ON public.ai_insight';
  END IF;
END$$;

CREATE POLICY disclosures_user_only
  ON public.ai_insight
  FOR ALL
  USING (uid = auth.uid()::uuid)
  WITH CHECK (uid = auth.uid()::uuid);