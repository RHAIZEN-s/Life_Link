-- Minimal stand-ins for what Supabase provides, so the migrations can run.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);

-- The project's ORIGINAL schema (before any of our migrations), with data,
-- to prove the migrations upgrade an existing database in place.
create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  password_hash text,
  is_verified boolean default false,
  verification_otp_hash text,
  verification_expires_at timestamptz,
  created_at timestamptz default now()
);
create table public.initial_profile_data (
  user_id uuid primary key references public.users(id) on delete cascade,
  full_name text not null, dob date not null, gender text not null, blood_group text not null,
  phone text not null, email text not null, address text not null,
  created_at timestamptz not null default now()
);
create table public.blood_requests (id uuid primary key default gen_random_uuid(), blood_type text, status text);
create table public.user_stats (user_id uuid, donations int, points int);

insert into public.users (id, name, email, password_hash, is_verified)
values ('00000000-0000-0000-0000-00000000000a', null, 'Old.User@Example.com', 'x', true);
insert into public.initial_profile_data values
  ('00000000-0000-0000-0000-00000000000a', 'Old User', '1990-01-01', 'Male', 'a+', '+919876543210',
   'Old.User@Example.com', 'Pune', now());
insert into public.blood_requests (blood_type, status) values ('A+', 'open');
