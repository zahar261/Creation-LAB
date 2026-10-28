-- CREATION LAB: cloud backup table and its security rules.
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run. Safe to run again.
-- The site ships the public "anon" key on purpose; these Row Level Security
-- policies are what keep every user's data private. Without them, anyone could
-- read or overwrite every account's projects.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Limit one row to ~5 MB so a single account cannot fill the database.
alter table public.user_data drop constraint if exists user_data_size;
alter table public.user_data add constraint user_data_size check (pg_column_size(data) < 5 * 1024 * 1024);

alter table public.user_data enable row level security;
alter table public.user_data force row level security;

drop policy if exists "own row: select" on public.user_data;
drop policy if exists "own row: insert" on public.user_data;
drop policy if exists "own row: update" on public.user_data;
drop policy if exists "own row: delete" on public.user_data;

create policy "own row: select" on public.user_data for select to authenticated using (user_id = (select auth.uid()));
create policy "own row: insert" on public.user_data for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own row: update" on public.user_data for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own row: delete" on public.user_data for delete to authenticated using (user_id = (select auth.uid()));

-- Visitors who are not signed in get nothing.
revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

-- ---------------------------------------------------------------------------
-- Check (run after the script): both lines must say "true".
--   select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.user_data'::regclass;
-- And from a terminal, without logging in, this must return [] or 401:
--   curl "https://<project>.supabase.co/rest/v1/user_data?select=user_id" -H "apikey: <anon key>"
--
-- Recommended Auth settings (Dashboard → Authentication):
--   * Email confirmations: ON
--   * Minimum password length: 8 or more, with "leaked password protection" ON
--   * Site URL and Redirect URLs: https://zaharcreationlab.com only
--   * Rate limits: keep the defaults (they block password guessing)

-- ---------------------------------------------------------------------------
-- "Delete my account" button: lets a signed-in user delete their own account
-- and cloud data. It can only ever delete the caller (auth.uid()).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from public.user_data where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
