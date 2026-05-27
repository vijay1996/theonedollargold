Supabase setup for TheOneDollarGold
================================

What this file contains
- SQL to create the minimal tables the app expects: `users`, `categories`, `transactions`, `subscriptions`, `budgets`, `creditCards`.
- Guidance to enable Row Level Security (RLS) and example policies.

How to apply
1. Open your Supabase project.
2. Open the SQL Editor and run `supabase/001_create_tables.sql` (copy-paste the contents).
3. For each table (categories, transactions, subscriptions, budgets, creditCards) enable RLS:

   ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

4. Add example policy to allow each authenticated user to access only their rows (repeat per table):

   CREATE POLICY "self_access" ON public.categories
     FOR ALL
     USING (uid::text = auth.uid())
     WITH CHECK (uid::text = auth.uid());

5. If you want anonymous read for some tables during development, adjust policies accordingly. Keep `service_role` key secret for server-only operations.

Testing
- After running SQL and policies, test via REST endpoint in browser (or curl):
  https://<PROJECT>.supabase.co/rest/v1/categories?select=*&uid=eq.<USER_UUID>

Notes
- If you use RLS and let the browser use anon key, ensure policies reference `auth.uid()` so anon users access only their rows.
- If you plan to run server-side privileged operations (backfills, admin), use the `service_role` key on the server only.
