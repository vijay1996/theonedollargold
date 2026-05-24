-- Migration: rename potential camelCase tables to snake_case and enable RLS + policies
-- Run this in Supabase SQL editor

-- Rename common camelCase tables if they exist
DO $$
BEGIN
  IF to_regclass('public."creditCards"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."creditCards" RENAME TO credit_cards';
  END IF;
  IF to_regclass('public."creditCards"') IS NULL AND to_regclass('public.creditCards') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.creditCards RENAME TO credit_cards';
  END IF;
  IF to_regclass('public."subscriptions"') IS NOT NULL AND to_regclass('public.subscriptions')::text <> 'subscriptions' THEN
    -- no-op placeholder
    NULL;
  END IF;
END$$;

-- Enable RLS and policies for app tables
-- Adjust policy names as needed
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_self ON public.categories;
CREATE POLICY categories_self ON public.categories
  FOR ALL USING (uid = auth.uid()::uuid) WITH CHECK (uid = auth.uid()::uuid);

-- Allow reads on categories
CREATE POLICY "allow read categories"
ON categories
FOR SELECT
USING (true);

ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactions_self ON public.transactions;
CREATE POLICY transactions_self ON public.transactions
  FOR ALL USING (uid = auth.uid()::uuid) WITH CHECK (uid = auth.uid()::uuid);

ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_self ON public.subscriptions;
CREATE POLICY subscriptions_self ON public.subscriptions
  FOR ALL USING (uid = auth.uid()::uuid) WITH CHECK (uid = auth.uid()::uuid);

ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS budgets_self ON public.budgets;
CREATE POLICY budgets_self ON public.budgets
  FOR ALL USING (uid = auth.uid()::uuid) WITH CHECK (uid = auth.uid()::uuid);

ALTER TABLE IF EXISTS public.credit_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_cards_self ON public.credit_cards;
CREATE POLICY credit_cards_self ON public.credit_cards
  FOR ALL USING (uid = auth.uid()::uuid) WITH CHECK (uid = auth.uid()::uuid);

-- Users table: allow authenticated users to upsert their own profile
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_self ON public.users;
CREATE POLICY users_self ON public.users
  FOR ALL USING (uid = auth.uid()::uuid) WITH CHECK (uid = auth.uid()::uuid);

-- Note: After enabling RLS and policies, confirm in Supabase UI that
-- the policies behave as expected. For server-side operations use
-- the service role key if you need broader access.
