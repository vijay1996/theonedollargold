-- Migration: Add subscription tier columns to users table
-- Run this in your Supabase SQL editor

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_ends_at BIGINT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_report_tries INTEGER DEFAULT 2;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS max_budgets INTEGER DEFAULT 5;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS max_subscriptions INTEGER DEFAULT 5;

-- Add a credit_cards count limit column (not in the free tier)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS max_credit_cards INTEGER DEFAULT 3;

-- Update existing users to have default values
UPDATE public.users
SET
  subscription_tier = 'free',
  subscription_status = 'active',
  ai_report_tries = 2,
  max_budgets = 5,
  max_subscriptions = 5,
  max_credit_cards = 3
WHERE subscription_tier IS NULL;
