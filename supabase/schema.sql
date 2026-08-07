-- ============================================================
-- Run this once in Supabase: Dashboard → SQL Editor → New query →
-- paste this whole file → Run.
-- ============================================================
-- Creates the table that tracks who has Premium, keyed to their Supabase
-- account (auth.users.id) instead of the browser — so it survives a
-- browser-data-clear or a device switch.

create table if not exists public.premium_status (
    user_id uuid primary key references auth.users(id) on delete cascade,
    is_premium boolean not null default false,
    last_payment_id text,
    updated_at timestamptz not null default now()
);

alter table public.premium_status enable row level security;

-- A signed-in user can READ only their own row (to check their own
-- premium status) — but cannot write it at all. Only the Razorpay webhook
-- (supabase/functions/razorpay-webhook), using the service_role key which
-- bypasses RLS entirely, is allowed to set is_premium. This is what
-- actually makes premium tamper-proof — nobody can fake it from the
-- browser console.
create policy "Users can read their own premium status"
    on public.premium_status
    for select
    using (auth.uid() = user_id);

-- No insert/update/delete policy is created for regular users on purpose —
-- Postgres RLS denies by default when no policy grants an action.
