-- Supabase SQL migration: create minimal tables for the app
-- Run this in the Supabase SQL editor or via psql connected to your project's DB

-- users
CREATE TABLE IF NOT EXISTS public.users (
  uid uuid PRIMARY KEY,
  email text,
  name text,
  currency text,
  date_format text,
  locale text,
  created_at bigint,
  updated_at bigint
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY,
  uid uuid REFERENCES public.users(uid) ON DELETE CASCADE,
  name text,
  type text,
  created_at bigint,
  updated_at bigint
);

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY,
  uid uuid REFERENCES public.users(uid) ON DELETE CASCADE,
  date date,
  category_id uuid,
  amount numeric,
  type text,
  comment text,
  subscription_id uuid,
  created_at bigint,
  updated_at bigint
);

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY,
  uid uuid REFERENCES public.users(uid) ON DELETE CASCADE,
  name text,
  amount numeric,
  category_id uuid,
  frequency text,
  deduction_date integer,
  deduction_month integer,
  created_at bigint,
  updated_at bigint
);

-- budgets
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY,
  uid uuid REFERENCES public.users(uid) ON DELETE CASCADE,
  category_id uuid,
  limit_amount numeric,
  period text,
  created_at bigint,
  updated_at bigint
);

-- credit_cards
CREATE TABLE IF NOT EXISTS public.credit_cards (
  id uuid PRIMARY KEY,
  uid uuid REFERENCES public.users(uid) ON DELETE CASCADE,
  name text,
  due_date integer,
  created_at bigint,
  updated_at bigint
);

-- Enable RLS and add example policies for each table (adjust to your needs)
-- Note: Enabling RLS without adding appropriate policies will block access.

-- Example: allow users to manage their own rows
-- For each table except users, enable RLS and add a policy that allows
-- authenticated users to select/insert/update/delete rows where uid = auth.uid().

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'categories') THEN
    RAISE NOTICE 'Tables created (see above)';
  END IF;
END$$;

-- Example policies (run these in Supabase SQL editor manually):
-- ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "categories_self" ON public.categories
--   FOR ALL USING (uid::text = auth.uid()) WITH CHECK (uid::text = auth.uid());

-- Repeat RLS enabling and policy creation for transactions, subscriptions, budgets, creditCards.

ALTER TABLE public.transactions ADD CONSTRAINT category_reference FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD CONSTRAINT category_reference FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE public.budgets ADD CONSTRAINT category_reference FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE;
