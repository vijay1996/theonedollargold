-- Create investments table
-- Run this in Supabase SQL editor after running 001_create_tables.sql

CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY,
  uid uuid REFERENCES public.users(uid) ON DELETE CASCADE,
  name text,
  category text,
  invested_amount numeric,
  current_value numeric,
  comment text,
  created_at bigint,
  updated_at bigint
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own investments" 
ON public.investments FOR SELECT 
USING (auth.uid() = uid);

CREATE POLICY "Users can create their own investments" 
ON public.investments FOR INSERT 
WITH CHECK (auth.uid() = uid);

CREATE POLICY "Users can update their own investments" 
ON public.investments FOR UPDATE 
USING (auth.uid() = uid);

CREATE POLICY "Users can delete their own investments" 
ON public.investments FOR DELETE 
USING (auth.uid() = uid);
