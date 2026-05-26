-- Migration: Enable RLS on users table and add self-access policies
-- Run this in your Supabase SQL editor

-- Enable Row Level Security on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow each authenticated user to SELECT their own row
CREATE POLICY "users_select_self" ON public.users
  FOR SELECT
  USING (uid = auth.uid());

-- Allow each authenticated user to INSERT their own row
CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT
  WITH CHECK (uid = auth.uid());

-- Allow each authenticated user to UPDATE their own row
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

ALTER TABLE IF EXISTS public.users ADD COLUMN ai_report_tries numeric;
