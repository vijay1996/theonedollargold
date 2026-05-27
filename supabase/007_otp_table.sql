CREATE TABLE IF NOT EXISTS public.otp (
  id uuid PRIMARY KEY,
  email text,
  purpose text,
  otp text,
  createdAt numeric
);