-- =============================================================================
-- Life Link — core schema
--
-- Run once in Supabase → SQL Editor (or `supabase db push`). Idempotent: safe to
-- re-run. Existing data is preserved:
--   * users / initial_profile_data are migrated in place (initial_profile_data → profiles)
--   * the old ad-hoc tables (blood_requests, blood_camps, blood_donors,
--     organ_donors, user_stats) are renamed to legacy_* instead of dropped
--
-- Access model: only the Nest backend (service_role) touches these tables.
-- RLS is enabled with no policies and anon/authenticated have no grants, so the
-- auto-generated Supabase REST API cannot be used to bypass the backend.
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select 2 * 6371 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )))
$$;

-- -----------------------------------------------------------------------------
-- Legacy tables: keep the data, get them out of the way
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['blood_requests', 'blood_camps', 'blood_donors', 'organ_donors', 'user_stats'] loop
    if to_regclass('public.' || t) is not null and to_regclass('public.legacy_' || t) is null then
      execute format('alter table public.%I rename to %I', t, 'legacy_' || t);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Hospitals
-- -----------------------------------------------------------------------------
create table if not exists public.hospitals (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) > 0),
  registration_no text unique,
  address         text,
  city            text,
  state           text,
  latitude        double precision check (latitude between -90 and 90),
  longitude       double precision check (longitude between -180 and 180),
  phone           text,
  email           text,
  is_verified     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists hospitals_name_idx on public.hospitals (lower(name));

create table if not exists public.hospital_staff (
  id          uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  title       text not null check (length(trim(title)) > 0),
  created_at  timestamptz not null default now()
);
create index if not exists hospital_staff_hospital_idx on public.hospital_staff (hospital_id);

-- -----------------------------------------------------------------------------
-- Users
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  created_at  timestamptz not null default now()
);

alter table public.users
  add column if not exists name          text,
  add column if not exists password_hash text,
  add column if not exists is_verified   boolean default false,
  add column if not exists role          text not null default 'user',
  add column if not exists hospital_id   uuid references public.hospitals (id) on delete set null,
  add column if not exists last_login_at timestamptz,
  add column if not exists created_at    timestamptz default now(),
  add column if not exists updated_at    timestamptz not null default now();

update public.users set email = lower(trim(email)) where email <> lower(trim(email));
update public.users set is_verified = false where is_verified is null;
alter table public.users
  alter column is_verified set not null,
  alter column is_verified set default false;

create unique index if not exists users_email_unique_idx on public.users (email);
create index if not exists users_hospital_idx on public.users (hospital_id) where hospital_id is not null;

do $$ begin
  alter table public.users add constraint users_role_chk
    check (role in ('user', 'hospital_admin', 'super_admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.users add constraint users_admin_hospital_chk
    check (role <> 'hospital_admin' or hospital_id is not null);
exception when duplicate_object then null; end $$;

-- OTPs moved to auth_otps; pending verifications can simply request a new code.
alter table public.users
  drop column if exists verification_otp_hash,
  drop column if exists verification_expires_at;

-- -----------------------------------------------------------------------------
-- Auth: one-time codes and refresh tokens (only hashes are stored)
-- -----------------------------------------------------------------------------
create table if not exists public.auth_otps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  purpose     text not null check (purpose in ('verify_email', 'reset_password')),
  code_hash   text not null,
  attempts    int  not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create unique index if not exists auth_otps_active_idx
  on public.auth_otps (user_id, purpose) where consumed_at is null;

create table if not exists public.refresh_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  replaced_by uuid references public.refresh_tokens (id) on delete set null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists refresh_tokens_user_idx on public.refresh_tokens (user_id);

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with users)
-- -----------------------------------------------------------------------------
do $$ begin
  if to_regclass('public.initial_profile_data') is not null and to_regclass('public.profiles') is null then
    alter table public.initial_profile_data rename to profiles;
  end if;
end $$;

create table if not exists public.profiles (
  user_id    uuid primary key references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists dob                      date,
  add column if not exists gender                   text,
  add column if not exists blood_group              text,
  add column if not exists phone                    text,
  add column if not exists address                  text,
  add column if not exists city                     text,
  add column if not exists latitude                 double precision,
  add column if not exists longitude                double precision,
  add column if not exists registered_as            text not null default 'donor',
  add column if not exists avatar_path              text,
  add column if not exists associated_hospital_id   uuid references public.hospitals (id) on delete set null,
  add column if not exists available_to_donate      boolean not null default true,
  add column if not exists share_contact            boolean not null default false,
  add column if not exists receive_notifications    boolean not null default true,
  add column if not exists existing_diseases        text,
  add column if not exists genetic_disorder         text,
  add column if not exists genetic_disorder_other   text,
  add column if not exists had_surgery_last_5_years boolean,
  add column if not exists allergies                text,
  add column if not exists medications              text,
  add column if not exists updated_at               timestamptz not null default now();

-- Legacy columns: the name lives on users, the email on users.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name') then
    update public.users u set name = p.full_name
      from public.profiles p
     where p.user_id = u.id and coalesce(trim(u.name), '') = '';
    alter table public.profiles drop column full_name;
  end if;
end $$;
alter table public.profiles drop column if exists email;

alter table public.profiles
  alter column dob drop not null,
  alter column gender drop not null,
  alter column blood_group drop not null,
  alter column phone drop not null,
  alter column address drop not null;

update public.profiles set blood_group = upper(replace(trim(blood_group), ' ', '')) where blood_group is not null;
update public.profiles set gender = lower(trim(gender)) where gender is not null;

do $$ begin
  alter table public.profiles add constraint profiles_blood_group_chk
    check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_gender_chk
    check (gender in ('male', 'female', 'other'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_registered_as_chk
    check (registered_as in ('donor', 'recipient'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_genetic_disorder_chk
    check (genetic_disorder in ('none', 'thalassemia', 'sickle_cell_anemia', 'cystic_fibrosis', 'hemophilia', 'other'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_coords_chk
    check ((latitude is null and longitude is null)
        or (latitude between -90 and 90 and longitude between -180 and 180));
exception when duplicate_object then null; end $$;

create index if not exists profiles_blood_donor_idx
  on public.profiles (blood_group) where available_to_donate;
create index if not exists profiles_coords_idx on public.profiles (latitude, longitude);

-- -----------------------------------------------------------------------------
-- Organ pledges
-- -----------------------------------------------------------------------------
create table if not exists public.organ_pledges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  organ_type  text not null check (organ_type in ('kidney', 'liver', 'heart', 'lung', 'eyes', 'bone_marrow')),
  created_at  timestamptz not null default now(),
  unique (user_id, organ_type)
);
create index if not exists organ_pledges_organ_idx on public.organ_pledges (organ_type);

-- -----------------------------------------------------------------------------
-- Donation requests and donor responses
-- -----------------------------------------------------------------------------
create table if not exists public.donation_requests (
  id             uuid primary key default gen_random_uuid(),
  requester_id   uuid not null references public.users (id) on delete cascade,
  hospital_id    uuid references public.hospitals (id) on delete set null,
  hospital_name  text not null check (length(trim(hospital_name)) > 0),
  patient_name   text not null check (length(trim(patient_name)) > 0),
  patient_age    smallint check (patient_age between 0 and 130),
  patient_gender text check (patient_gender in ('male', 'female', 'other')),
  request_type   text not null check (request_type in ('blood', 'organ')),
  blood_group    text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  organ_type     text check (organ_type in ('kidney', 'liver', 'heart', 'lung', 'eyes', 'bone_marrow')),
  units_required smallint check (units_required between 1 and 50),
  priority       text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status         text not null default 'open' check (status in ('open', 'fulfilled', 'cancelled')),
  contact_phone  text not null,
  location_text  text not null check (length(trim(location_text)) > 0),
  city           text,
  latitude       double precision,
  longitude      double precision,
  needed_by      date,
  notes          text check (length(notes) <= 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint donation_requests_kind_chk check (
       (request_type = 'blood' and blood_group is not null and organ_type is null and units_required is not null)
    or (request_type = 'organ' and organ_type is not null and units_required is null)
  ),
  constraint donation_requests_coords_chk check (
       (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  )
);
create index if not exists donation_requests_open_idx
  on public.donation_requests (created_at desc) where status = 'open';
create index if not exists donation_requests_requester_idx on public.donation_requests (requester_id, created_at desc);
create index if not exists donation_requests_hospital_idx on public.donation_requests (hospital_id, created_at desc);
create index if not exists donation_requests_coords_idx
  on public.donation_requests (latitude, longitude) where status = 'open';

create table if not exists public.request_responses (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.donation_requests (id) on delete cascade,
  donor_id   uuid not null references public.users (id) on delete cascade,
  status     text not null check (status in ('accepted', 'declined')),
  message    text check (length(message) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, donor_id)
);
create index if not exists request_responses_donor_idx on public.request_responses (donor_id, updated_at desc);

-- -----------------------------------------------------------------------------
-- Donations (history, eligibility, points, certificates)
-- -----------------------------------------------------------------------------
create table if not exists public.donations (
  id            uuid primary key default gen_random_uuid(),
  donor_id      uuid not null references public.users (id) on delete cascade,
  hospital_id   uuid references public.hospitals (id) on delete set null,
  hospital_name text not null check (length(trim(hospital_name)) > 0),
  donation_type text not null check (donation_type in ('whole_blood', 'plasma', 'platelets', 'double_red_cells', 'organ')),
  blood_group   text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units         smallint not null default 1 check (units between 1 and 10),
  donated_on    date not null,
  request_id    uuid references public.donation_requests (id) on delete set null,
  verified_by   uuid references public.users (id) on delete set null,
  verified_at   timestamptz,
  notes         text check (length(notes) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists donations_donor_idx on public.donations (donor_id, donated_on desc);

-- -----------------------------------------------------------------------------
-- Documents (files live in the private `documents` storage bucket)
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  doc_type     text not null check (doc_type in ('id_proof', 'medical_report', 'blood_report', 'donor_card', 'other')),
  storage_path text not null unique,
  mime_type    text not null,
  size_bytes   int  not null check (size_bytes > 0),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note  text check (length(review_note) <= 500),
  reviewed_by  uuid references public.users (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists documents_user_idx on public.documents (user_id, created_at desc);
create index if not exists documents_pending_idx on public.documents (created_at) where status = 'pending';

-- -----------------------------------------------------------------------------
-- Blood camps and registrations
-- -----------------------------------------------------------------------------
create table if not exists public.camps (
  id             uuid primary key default gen_random_uuid(),
  hospital_id    uuid references public.hospitals (id) on delete set null,
  organizer_name text not null check (length(trim(organizer_name)) > 0),
  title          text not null check (length(trim(title)) > 0),
  description    text check (length(description) <= 2000),
  address        text not null,
  city           text,
  latitude       double precision,
  longitude      double precision,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  capacity       int check (capacity > 0),
  status         text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  created_by     uuid references public.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint camps_time_chk check (ends_at > starts_at),
  constraint camps_coords_chk check (
       (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  )
);
create index if not exists camps_upcoming_idx on public.camps (starts_at) where status = 'scheduled';
create index if not exists camps_hospital_idx on public.camps (hospital_id, starts_at desc);

create table if not exists public.camp_registrations (
  camp_id    uuid not null references public.camps (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (camp_id, user_id)
);
create index if not exists camp_registrations_user_idx on public.camp_registrations (user_id);

-- -----------------------------------------------------------------------------
-- In-app notifications
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       text not null check (type in ('request_alert', 'request_response', 'document_review', 'donation_verified', 'camp', 'system')),
  title      text not null,
  body       text not null,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['hospitals', 'users', 'profiles', 'donation_requests', 'request_responses',
                           'donations', 'documents', 'camps'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_set_updated_at', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Derived donor statistics (single source of truth for points & eligibility)
--   whole blood 90 days, double red cells 112, plasma 14, platelets 7.
--   Points: 100 per verified donation + 20 per accepted request.
-- -----------------------------------------------------------------------------
create or replace view public.donor_stats with (security_invoker = true) as
select
  u.id                                                   as user_id,
  coalesce(d.total_donations, 0)                         as total_donations,
  coalesce(d.verified_donations, 0)                      as verified_donations,
  d.last_donation_on,
  d.next_eligible_on,
  coalesce(r.accepted_responses, 0)                      as accepted_responses,
  coalesce(d.verified_donations, 0) * 100
    + coalesce(r.accepted_responses, 0) * 20             as points
from public.users u
left join lateral (
  select count(*)::int                                          as total_donations,
         (count(*) filter (where x.verified_at is not null))::int as verified_donations,
         max(x.donated_on)                                      as last_donation_on,
         max(x.donated_on + case x.donation_type
               when 'whole_blood'      then 90
               when 'double_red_cells' then 112
               when 'plasma'           then 14
               when 'platelets'        then 7
             end) filter (where x.donation_type <> 'organ')     as next_eligible_on
    from public.donations x
   where x.donor_id = u.id
) d on true
left join lateral (
  select count(*)::int as accepted_responses
    from public.request_responses y
   where y.donor_id = u.id and y.status = 'accepted'
) r on true;

-- -----------------------------------------------------------------------------
-- Query functions (called by the backend through supabase.rpc)
-- -----------------------------------------------------------------------------
create or replace function public.list_open_requests(
  p_viewer       uuid,
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_radius_km    double precision default null,
  p_request_type text default null,
  p_blood_group  text default null,
  p_organ_type   text default null,
  p_limit        int default 20,
  p_offset       int default 0
) returns table (
  id uuid, requester_id uuid, hospital_id uuid, hospital_name text,
  patient_name text, patient_age smallint, patient_gender text,
  request_type text, blood_group text, organ_type text, units_required smallint,
  priority text, status text, contact_phone text, location_text text, city text,
  latitude double precision, longitude double precision, needed_by date, notes text,
  created_at timestamptz, distance_km double precision, my_response text, accepted_count int
)
language sql stable as $$
  with base as (
    select r.*,
           case when p_lat is not null and p_lng is not null and r.latitude is not null
                then public.haversine_km(p_lat, p_lng, r.latitude, r.longitude) end as dist
      from public.donation_requests r
     where r.status = 'open'
       and r.requester_id <> p_viewer
       and (p_request_type is null or r.request_type = p_request_type)
       and (p_blood_group  is null or r.blood_group  = p_blood_group)
       and (p_organ_type   is null or r.organ_type   = p_organ_type)
  )
  select b.id, b.requester_id, b.hospital_id, b.hospital_name,
         b.patient_name, b.patient_age, b.patient_gender,
         b.request_type, b.blood_group, b.organ_type, b.units_required,
         b.priority, b.status, b.contact_phone, b.location_text, b.city,
         b.latitude, b.longitude, b.needed_by, b.notes,
         b.created_at, b.dist, rr.status,
         (select count(*)::int from public.request_responses a
           where a.request_id = b.id and a.status = 'accepted')
    from base b
    left join public.request_responses rr on rr.request_id = b.id and rr.donor_id = p_viewer
   where p_radius_km is null or b.dist is null or b.dist <= p_radius_km
   order by case b.priority when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
            b.dist nulls last,
            b.created_at desc
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

create or replace function public.search_donors(
  p_viewer      uuid,
  p_kind        text,
  p_blood_group text default null,
  p_organ_type  text default null,
  p_lat         double precision default null,
  p_lng         double precision default null,
  p_radius_km   double precision default null,
  p_limit       int default 20,
  p_offset      int default 0
) returns table (
  user_id uuid, name text, blood_group text, organ_type text, city text,
  hospital_name text, phone text, distance_km double precision,
  last_donation_on date, next_eligible_on date, is_eligible boolean
)
language sql stable as $$
  with base as (
    select p.*, u.name as user_name,
           case when p_lat is not null and p_lng is not null and p.latitude is not null
                then public.haversine_km(p_lat, p_lng, p.latitude, p.longitude) end as dist
      from public.profiles p
      join public.users u on u.id = p.user_id and u.is_verified and u.role = 'user'
     where p.user_id <> p_viewer
       and (
            (p_kind = 'blood' and p.available_to_donate and p.blood_group = p_blood_group)
         or (p_kind = 'organ' and exists (select 1 from public.organ_pledges op
                                           where op.user_id = p.user_id and op.organ_type = p_organ_type))
       )
  )
  select b.user_id, b.user_name, b.blood_group,
         case when p_kind = 'organ' then p_organ_type end,
         b.city, h.name,
         case when b.share_contact then b.phone end,
         b.dist, s.last_donation_on, s.next_eligible_on,
         (s.next_eligible_on is null or s.next_eligible_on <= current_date)
    from base b
    left join public.donor_stats s on s.user_id = b.user_id
    left join public.hospitals h on h.id = b.associated_hospital_id
   where p_radius_km is null or b.dist is null or b.dist <= p_radius_km
   order by (s.next_eligible_on is null or s.next_eligible_on <= current_date) desc,
            b.dist nulls last,
            b.user_name
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

create or replace function public.list_upcoming_camps(
  p_viewer    uuid,
  p_lat       double precision default null,
  p_lng       double precision default null,
  p_radius_km double precision default null,
  p_limit     int default 20,
  p_offset    int default 0
) returns table (
  id uuid, hospital_id uuid, organizer_name text, title text, description text,
  address text, city text, latitude double precision, longitude double precision,
  starts_at timestamptz, ends_at timestamptz, capacity int,
  registered_count int, is_registered boolean, distance_km double precision
)
language sql stable as $$
  with base as (
    select c.*,
           case when p_lat is not null and p_lng is not null and c.latitude is not null
                then public.haversine_km(p_lat, p_lng, c.latitude, c.longitude) end as dist
      from public.camps c
     where c.status = 'scheduled' and c.ends_at >= now()
  )
  select b.id, b.hospital_id, b.organizer_name, b.title, b.description,
         b.address, b.city, b.latitude, b.longitude,
         b.starts_at, b.ends_at, b.capacity,
         (select count(*)::int from public.camp_registrations cr where cr.camp_id = b.id),
         exists (select 1 from public.camp_registrations cr where cr.camp_id = b.id and cr.user_id = p_viewer),
         b.dist
    from base b
   where p_radius_km is null or b.dist is null or b.dist <= p_radius_km
   order by b.starts_at
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

-- -----------------------------------------------------------------------------
-- Storage buckets (private; files are served through short-lived signed URLs)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',   'avatars',   false, 5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Lock down the public REST API: backend (service_role) only
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['hospitals', 'hospital_staff', 'users', 'auth_otps', 'refresh_tokens', 'profiles',
                           'organ_pledges', 'donation_requests', 'request_responses', 'donations',
                           'documents', 'camps', 'camp_registrations', 'notifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;

  foreach t in array array['legacy_blood_requests', 'legacy_blood_camps', 'legacy_blood_donors',
                           'legacy_organ_donors', 'legacy_user_stats'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

revoke all on public.donor_stats from anon, authenticated;
revoke execute on function public.list_open_requests(uuid, double precision, double precision, double precision, text, text, text, int, int) from public, anon, authenticated;
revoke execute on function public.search_donors(uuid, text, text, text, double precision, double precision, double precision, int, int) from public, anon, authenticated;
revoke execute on function public.list_upcoming_camps(uuid, double precision, double precision, double precision, int, int) from public, anon, authenticated;
grant execute on function public.list_open_requests(uuid, double precision, double precision, double precision, text, text, text, int, int) to service_role;
grant execute on function public.search_donors(uuid, text, text, text, double precision, double precision, double precision, int, int) to service_role;
grant execute on function public.list_upcoming_camps(uuid, double precision, double precision, double precision, int, int) to service_role;

commit;
