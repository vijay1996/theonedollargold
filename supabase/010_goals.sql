-- Migration: Create goals table for tracking financial goals
-- Each goal links to a category (type='goal') and aggregates expense transactions for that category

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid uuid NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  target_amount numeric NOT NULL DEFAULT 0,
  deadline bigint,
  created_at bigint NOT NULL,
  updated_at bigint
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own goals
CREATE POLICY "goals_user_only"
  ON public.goals
  FOR ALL
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_uid ON public.goals(uid);
CREATE INDEX IF NOT EXISTS idx_goals_category_id ON public.goals(category_id);
