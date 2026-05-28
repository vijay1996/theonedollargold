-- Migration: Add subscription tier columns to the users table for monetization
-- Run this in Supabase SQL editor

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text,
  ADD COLUMN IF NOT EXISTS razorpay_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_end_date bigint;

-- The ai_report_tries column should already exist. If not, add it:
-- ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS ai_report_tries integer NOT NULL DEFAULT 1;

-- Ensure the column defaults make sense for new users
ALTER TABLE IF EXISTS public.users
  ALTER COLUMN subscription_tier SET DEFAULT 'free',
  ALTER COLUMN ai_report_tries SET DEFAULT 1;

-- Create a function to reset ai_report_tries monthly (can be called by a cron job)
-- This is optional — you can also update it via the application when a report is generated
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_tries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET ai_report_tries = CASE
    WHEN subscription_tier = 'free' THEN 1
    WHEN subscription_tier IN ('premium_monthly', 'premium_yearly') THEN -1  -- unlimited
    ELSE 1
  END;
END;
$$;
