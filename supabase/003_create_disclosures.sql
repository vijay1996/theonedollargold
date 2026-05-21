-- Create disclosures table for Assets & Liabilities
-- Run this in Supabase SQL editor after running 001_create_tables.sql

CREATE TABLE IF NOT EXISTS public.disclosures (
  id uuid PRIMARY KEY,
  uid uuid REFERENCES public.users(uid) ON DELETE CASCADE,
  name text,
  type text,
  category text,
  amount numeric,
  comment text,
  created_at bigint,
  updated_at bigint
);

ALTER TABLE public.disclosures ADD COLUMN current_value numeric;

-- Note: Enable RLS and add policies consistent with your other tables (see 002_rls_and_rename.sql)
