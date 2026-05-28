-- Migration: Create support_tickets table for the bug reporting ticketing system
-- Priority is determined by the user's subscription tier:
--   premium_yearly → critical (highest)
--   premium_monthly → high
--   free → normal (lowest)

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid uuid NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'bug',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  created_at bigint NOT NULL,
  updated_at bigint
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own tickets
CREATE POLICY "support_tickets_user_only"
  ON public.support_tickets
  FOR ALL
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_uid ON public.support_tickets(uid);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
