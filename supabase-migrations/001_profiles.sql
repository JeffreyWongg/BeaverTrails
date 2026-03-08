-- Run this in Supabase SQL Editor to create the profiles table for Auth0 sync.
-- Auth0 user id (sub) is stored as `id`; we upsert on each login.

create table if not exists public.profiles (
  id text primary key,
  email text,
  name text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- Optional: enable RLS and allow read for authenticated users
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid()::text = id);

-- If you use Supabase Auth elsewhere, auth.uid() will match. With Auth0-only,
-- you may use the id from Auth0 (sub) in your app when calling Supabase.
