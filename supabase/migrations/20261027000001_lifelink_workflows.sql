-- =============================================================================
-- Life Link — workflows (run after 20261025000001_lifelink_core_schema.sql)
--
-- Adds what the product spec requires on top of the core schema:
--   * account verification (ID proof review) and moderation (suspend, reports)
--   * request lifecycle  pending → matched → in_progress → completed / cancelled
--   * appointments (hospital/requester schedules a donor; donors can book a slot)
--   * blood-compatibility aware smart matching, alert de-duplication
--   * ratings & feedback, leaderboard, announcements/banners
--   * reminders (appointments, camps, eligibility, stale requests)
--   * admin analytics
-- Idempotent: safe to re-run.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Users: identity verification + moderation
-- -----------------------------------------------------------------------------
alter table public.users
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verification_note   text,
  add column if not exists verified_at         timestamptz,
  add column if not exists verified_by         uuid references public.users (id) on delete set null,
  add column if not exists status              text not null default 'active',
  add column if not exists suspended_at        timestamptz,
  add column if not exists suspension_reason   text;

do $$ begin
  alter table public.users add constraint users_verification_status_chk
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.users add constraint users_status_chk check (status in ('active', 'suspended'));
exception when duplicate_object then null; end $$;

-- Staff accounts are trusted by construction.
update public.users set verification_status = 'verified', verified_at = coalesce(verified_at, now())
 where role in ('hospital_admin', 'super_admin') and verification_status <> 'verified';

create index if not exists users_verification_queue_idx
  on public.users (created_at) where verification_status = 'pending';

-- -----------------------------------------------------------------------------
-- Profiles: preferences
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists show_on_leaderboard     boolean not null default true,
  add column if not exists theme_preference        text not null default 'system',
  add column if not exists eligibility_reminded_on date;

do $$ begin
  alter table public.profiles add constraint profiles_theme_chk
    check (theme_preference in ('system', 'light', 'dark'));
exception when duplicate_object then null; end $$;

-- Recipients don't have to know their blood group.
alter table public.profiles alter column blood_group drop not null;

-- -----------------------------------------------------------------------------
-- Requests: lifecycle, authenticity, moderation
-- -----------------------------------------------------------------------------
alter table public.donation_requests
  add column if not exists is_verified       boolean not null default false,
  add column if not exists verified_by       uuid references public.users (id) on delete set null,
  add column if not exists verified_at       timestamptz,
  add column if not exists document_id       uuid references public.documents (id) on delete set null,
  add column if not exists matched_at        timestamptz,
  add column if not exists completed_at      timestamptz,
  add column if not exists closed_by         uuid references public.users (id) on delete set null,
  add column if not exists close_reason      text check (length(close_reason) <= 500),
  add column if not exists flagged           boolean not null default false,
  add column if not exists stale_notified_at timestamptz;

alter table public.donation_requests drop constraint if exists donation_requests_status_check;
alter table public.donation_requests alter column status set default 'pending';
update public.donation_requests r
   set status = case
                  when exists (select 1 from public.request_responses x
                                where x.request_id = r.id and x.status = 'accepted') then 'matched'
                  else 'pending'
                end
 where r.status = 'open';
update public.donation_requests set status = 'completed', completed_at = coalesce(completed_at, updated_at)
 where status = 'fulfilled';
do $$ begin
  alter table public.donation_requests add constraint donation_requests_status_chk
    check (status in ('pending', 'matched', 'in_progress', 'completed', 'cancelled'));
exception when duplicate_object then null; end $$;

drop index if exists public.donation_requests_open_idx;
drop index if exists public.donation_requests_coords_idx;
create index if not exists donation_requests_active_idx
  on public.donation_requests (created_at desc) where status in ('pending', 'matched', 'in_progress');
create index if not exists donation_requests_active_coords_idx
  on public.donation_requests (latitude, longitude) where status in ('pending', 'matched', 'in_progress');

-- Timeline shown to the requester ("created", "donor accepted", "appointment scheduled", ...).
create table if not exists public.request_events (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.donation_requests (id) on delete cascade,
  actor_id   uuid references public.users (id) on delete set null,
  type       text not null check (type in ('created', 'verified', 'donor_accepted', 'donor_declined',
                                           'donor_assigned', 'appointment_scheduled', 'appointment_cancelled',
                                           'donation_completed', 'completed', 'cancelled', 'flagged', 'reopened')),
  message    text,
  created_at timestamptz not null default now()
);
create index if not exists request_events_request_idx on public.request_events (request_id, created_at);

-- Who has already been alerted about a request (prevents duplicate alerts).
create table if not exists public.request_alerts (
  request_id uuid not null references public.donation_requests (id) on delete cascade,
  donor_id   uuid not null references public.users (id) on delete cascade,
  score      numeric(5, 1),
  created_at timestamptz not null default now(),
  primary key (request_id, donor_id)
);
create index if not exists request_alerts_created_idx on public.request_alerts (created_at);

-- Admin-assigned donors are recorded on the response.
alter table public.request_responses
  add column if not exists assigned_by uuid references public.users (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Appointments
-- -----------------------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  donor_id         uuid not null references public.users (id) on delete cascade,
  request_id       uuid references public.donation_requests (id) on delete cascade,
  hospital_id      uuid references public.hospitals (id) on delete set null,
  hospital_name    text not null check (length(trim(hospital_name)) > 0),
  scheduled_at     timestamptz not null,
  location_text    text check (length(location_text) <= 300),
  -- Pickup / reporting details; only the donor and the coordinators can see them.
  instructions     text check (length(instructions) <= 1000),
  donation_type    text not null default 'whole_blood'
                   check (donation_type in ('whole_blood', 'plasma', 'platelets', 'double_red_cells', 'organ')),
  status           text not null default 'scheduled'
                   check (status in ('requested', 'scheduled', 'completed', 'cancelled', 'no_show')),
  donor_note       text check (length(donor_note) <= 500),
  created_by       uuid references public.users (id) on delete set null,
  cancelled_by     uuid references public.users (id) on delete set null,
  cancel_reason    text check (length(cancel_reason) <= 500),
  donation_id      uuid references public.donations (id) on delete set null,
  completed_at     timestamptz,
  reminder_sent_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists appointments_donor_idx on public.appointments (donor_id, scheduled_at desc);
create index if not exists appointments_hospital_idx on public.appointments (hospital_id, scheduled_at);
create index if not exists appointments_request_idx on public.appointments (request_id);
create unique index if not exists appointments_one_active_per_request_donor
  on public.appointments (request_id, donor_id)
  where request_id is not null and status in ('requested', 'scheduled');
create index if not exists appointments_reminder_idx
  on public.appointments (scheduled_at) where status = 'scheduled' and reminder_sent_at is null;

-- -----------------------------------------------------------------------------
-- Ratings & feedback (requester → donor / hospital, after completion)
-- -----------------------------------------------------------------------------
create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.donation_requests (id) on delete cascade,
  rater_id    uuid not null references public.users (id) on delete cascade,
  donor_id    uuid references public.users (id) on delete cascade,
  hospital_id uuid references public.hospitals (id) on delete cascade,
  score       smallint not null check (score between 1 and 5),
  comment     text check (length(comment) <= 500),
  created_at  timestamptz not null default now(),
  constraint ratings_target_chk check ((donor_id is null) <> (hospital_id is null))
);
create unique index if not exists ratings_donor_unique on public.ratings (request_id, rater_id, donor_id) where donor_id is not null;
create unique index if not exists ratings_hospital_unique on public.ratings (request_id, rater_id, hospital_id) where hospital_id is not null;
create index if not exists ratings_donor_idx on public.ratings (donor_id, created_at desc) where donor_id is not null;
create index if not exists ratings_hospital_idx on public.ratings (hospital_id) where hospital_id is not null;

-- -----------------------------------------------------------------------------
-- Moderation reports
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.users (id) on delete cascade,
  target_type     text not null check (target_type in ('user', 'request')),
  target_user_id  uuid references public.users (id) on delete cascade,
  target_request_id uuid references public.donation_requests (id) on delete cascade,
  reason          text not null check (reason in ('fake_request', 'spam', 'abuse', 'fraud', 'no_show', 'other')),
  details         text check (length(details) <= 1000),
  status          text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution_note text check (length(resolution_note) <= 500),
  resolved_by     uuid references public.users (id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint reports_target_chk check (
       (target_type = 'user' and target_user_id is not null and target_request_id is null)
    or (target_type = 'request' and target_request_id is not null and target_user_id is null)
  )
);
create index if not exists reports_open_idx on public.reports (created_at) where status = 'open';
create unique index if not exists reports_one_open_per_reporter_target
  on public.reports (reporter_id, coalesce(target_user_id, target_request_id)) where status = 'open';

-- -----------------------------------------------------------------------------
-- Announcements (in-app banners, optionally pushed as notifications)
-- -----------------------------------------------------------------------------
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  hospital_id uuid references public.hospitals (id) on delete cascade,
  created_by  uuid references public.users (id) on delete set null,
  title       text not null check (length(trim(title)) between 3 and 120),
  body        text not null check (length(trim(body)) between 3 and 1000),
  audience    text not null default 'all' check (audience in ('all', 'donors', 'recipients')),
  city        text,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint announcements_window_chk check (ends_at > starts_at)
);
create index if not exists announcements_active_idx on public.announcements (ends_at) where is_active;

-- Camps: reminder bookkeeping
alter table public.camp_registrations add column if not exists reminder_sent_at timestamptz;

-- Notifications: new types
alter table public.notifications drop constraint if exists notifications_type_check;
do $$ begin
  alter table public.notifications add constraint notifications_type_chk
    check (type in ('request_alert', 'request_response', 'request_update', 'appointment', 'document_review',
                    'verification', 'donation_verified', 'camp', 'announcement', 'reminder', 'moderation', 'system'));
exception when duplicate_object then null; end $$;

-- updated_at triggers for new tables
do $$
declare t text;
begin
  foreach t in array array['appointments'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_set_updated_at', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Blood compatibility
--   Blood (red cells): donor ABO antigens ⊆ recipient's, and Rh− donors for Rh− recipients.
--   Organs (kidney/liver/heart/lung): ABO compatibility only; eyes & marrow ignore ABO here.
-- -----------------------------------------------------------------------------
create or replace function public.blood_compatible(donor text, recipient text, ignore_rh boolean default false)
returns boolean language sql immutable parallel safe as $$
  select case
    when donor is null or recipient is null then false
    else
      (ignore_rh or right(donor, 1) = '-' or right(recipient, 1) = '+')
      and (position('A' in left(donor, length(donor) - 1)) = 0 or position('A' in recipient) > 0)
      and (position('B' in left(donor, length(donor) - 1)) = 0 or position('B' in recipient) > 0)
  end
$$;

-- -----------------------------------------------------------------------------
-- Donor stats (adds ratings)
-- -----------------------------------------------------------------------------
create or replace view public.donor_ratings with (security_invoker = true) as
select donor_id as user_id, round(avg(score)::numeric, 1) as avg_rating, count(*)::int as ratings_count
  from public.ratings where donor_id is not null group by donor_id;

-- -----------------------------------------------------------------------------
-- Open requests for a viewer (replaces the core version)
-- -----------------------------------------------------------------------------
drop function if exists public.list_open_requests(uuid, double precision, double precision, double precision, text, text, text, int, int);

create or replace function public.list_open_requests(
  p_viewer          uuid,
  p_lat             double precision default null,
  p_lng             double precision default null,
  p_radius_km       double precision default null,
  p_request_type    text default null,
  p_blood_group     text default null,
  p_organ_type      text default null,
  p_compatible_only boolean default false,
  p_limit           int default 20,
  p_offset          int default 0
) returns table (
  id uuid, requester_id uuid, hospital_id uuid, hospital_name text,
  patient_name text, patient_age smallint, patient_gender text,
  request_type text, blood_group text, organ_type text, units_required smallint,
  priority text, status text, contact_phone text, location_text text, city text,
  latitude double precision, longitude double precision, needed_by date, notes text,
  is_verified boolean, created_at timestamptz, distance_km double precision,
  my_response text, accepted_count int, can_donate boolean
)
language sql stable as $$
  with viewer as (
    select p.blood_group,
           array(select op.organ_type from public.organ_pledges op where op.user_id = p_viewer) as organs
      from (select 1) one left join public.profiles p on p.user_id = p_viewer
  ),
  base as (
    select r.*,
           case when p_lat is not null and p_lng is not null and r.latitude is not null
                then public.haversine_km(p_lat, p_lng, r.latitude, r.longitude) end as dist,
           case when r.request_type = 'blood'
                then public.blood_compatible(v.blood_group, r.blood_group)
                else r.organ_type = any (v.organs)
                     and (r.blood_group is null or r.organ_type in ('eyes', 'bone_marrow')
                          or public.blood_compatible(v.blood_group, r.blood_group, true))
           end as compatible
      from public.donation_requests r cross join viewer v
     where r.status in ('pending', 'matched', 'in_progress')
       and not r.flagged
       and r.requester_id <> p_viewer
       and (p_request_type is null or r.request_type = p_request_type)
       and (p_blood_group  is null or r.blood_group  = p_blood_group)
       and (p_organ_type   is null or r.organ_type   = p_organ_type)
  )
  select b.id, b.requester_id, b.hospital_id, b.hospital_name,
         b.patient_name, b.patient_age, b.patient_gender,
         b.request_type, b.blood_group, b.organ_type, b.units_required,
         b.priority, b.status, b.contact_phone, b.location_text, b.city,
         b.latitude, b.longitude, b.needed_by, b.notes, b.is_verified,
         b.created_at, b.dist, rr.status,
         (select count(*)::int from public.request_responses a
           where a.request_id = b.id and a.status = 'accepted'),
         coalesce(b.compatible, false)
    from base b
    left join public.request_responses rr on rr.request_id = b.id and rr.donor_id = p_viewer
   where (p_radius_km is null or b.dist is null or b.dist <= p_radius_km)
     and (not p_compatible_only or coalesce(b.compatible, false))
   order by case b.priority when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
            coalesce(b.compatible, false) desc,
            b.dist nulls last,
            b.created_at desc
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

-- -----------------------------------------------------------------------------
-- Donor search: only verified, active, available donors (replaces core version)
-- -----------------------------------------------------------------------------
drop function if exists public.search_donors(uuid, text, text, text, double precision, double precision, double precision, int, int);

create or replace function public.search_donors(
  p_viewer      uuid,
  p_kind        text,
  p_blood_group text default null,
  p_organ_type  text default null,
  p_lat         double precision default null,
  p_lng         double precision default null,
  p_radius_km   double precision default null,
  p_compatible  boolean default false,
  p_limit       int default 20,
  p_offset      int default 0
) returns table (
  user_id uuid, name text, blood_group text, organ_type text, city text,
  hospital_name text, phone text, distance_km double precision,
  last_donation_on date, next_eligible_on date, is_eligible boolean,
  verified_donations int, avg_rating numeric, ratings_count int
)
language sql stable as $$
  with base as (
    select p.*, u.name as user_name,
           case when p_lat is not null and p_lng is not null and p.latitude is not null
                then public.haversine_km(p_lat, p_lng, p.latitude, p.longitude) end as dist
      from public.profiles p
      join public.users u on u.id = p.user_id
                         and u.is_verified and u.role = 'user'
                         and u.status = 'active' and u.verification_status = 'verified'
     where p.user_id <> p_viewer
       and (
            (p_kind = 'blood' and p.available_to_donate
             and (case when p_compatible then public.blood_compatible(p.blood_group, p_blood_group)
                       else p.blood_group = p_blood_group end))
         or (p_kind = 'organ' and exists (select 1 from public.organ_pledges op
                                           where op.user_id = p.user_id and op.organ_type = p_organ_type))
       )
  )
  select b.user_id, b.user_name, b.blood_group,
         case when p_kind = 'organ' then p_organ_type end,
         b.city, h.name,
         case when b.share_contact then b.phone end,
         b.dist, s.last_donation_on, s.next_eligible_on,
         (s.next_eligible_on is null or s.next_eligible_on <= current_date),
         coalesce(s.verified_donations, 0), dr.avg_rating, coalesce(dr.ratings_count, 0)
    from base b
    left join public.donor_stats s on s.user_id = b.user_id
    left join public.donor_ratings dr on dr.user_id = b.user_id
    left join public.hospitals h on h.id = b.associated_hospital_id
   where p_radius_km is null or b.dist is null or b.dist <= p_radius_km
   order by (s.next_eligible_on is null or s.next_eligible_on <= current_date) desc,
            (b.blood_group = p_blood_group) desc,
            b.dist nulls last,
            b.user_name
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

-- -----------------------------------------------------------------------------
-- Smart matching for one request.
--   Hard filters: active + identity-verified donor, available (blood) or pledged
--   (organ), compatible, eligible (blood cooldown), not the requester, has not
--   declined, within radius when both sides have coordinates (else same city).
--   Score (0–100) = 45·proximity + 25·compatibility + 15·reliability + 15·rating
--     proximity    1 − d/radius (0.3 when distance unknown but same city)
--     compatibility 1 exact group, 0.7 compatible (keeps scarce O− donors for when needed)
--     reliability  min(verified donations, 5) / 5
--     rating       avg rating / 5 (0.6 when unrated)
-- -----------------------------------------------------------------------------
create or replace function public.match_donors(
  p_request   uuid,
  p_radius_km double precision default 25,
  p_limit     int default 20
) returns table (
  user_id uuid, name text, blood_group text, city text, distance_km double precision,
  score numeric, is_eligible boolean, verified_donations int, avg_rating numeric,
  receive_notifications boolean, already_alerted boolean, response text
)
language sql stable as $$
  with r as (select * from public.donation_requests where id = p_request),
  cand as (
    select p.user_id, u.name, p.blood_group, p.city, p.receive_notifications,
           case when r.latitude is not null and p.latitude is not null
                then public.haversine_km(r.latitude, r.longitude, p.latitude, p.longitude) end as dist,
           (r.latitude is null or p.latitude is null) as dist_unknown,
           coalesce(lower(p.city) = lower(r.city), false) as same_city,
           case when r.request_type = 'blood'
                then case when p.blood_group = r.blood_group then 1.0 else 0.7 end
                else case when r.blood_group is null or p.blood_group = r.blood_group then 1.0 else 0.7 end
           end as compat,
           coalesce(s.verified_donations, 0) as vd,
           (s.next_eligible_on is null or s.next_eligible_on <= current_date) as eligible,
           dr.avg_rating,
           rr.status as resp,
           exists (select 1 from public.request_alerts ra where ra.request_id = r.id and ra.donor_id = p.user_id) as alerted
      from r
      join public.profiles p on p.user_id <> r.requester_id
      join public.users u on u.id = p.user_id and u.role = 'user' and u.is_verified
                         and u.status = 'active' and u.verification_status = 'verified'
      left join public.donor_stats s on s.user_id = p.user_id
      left join public.donor_ratings dr on dr.user_id = p.user_id
      left join public.request_responses rr on rr.request_id = r.id and rr.donor_id = p.user_id
     where (
             (r.request_type = 'blood' and p.available_to_donate
              and public.blood_compatible(p.blood_group, r.blood_group))
          or (r.request_type = 'organ'
              and exists (select 1 from public.organ_pledges op
                           where op.user_id = p.user_id and op.organ_type = r.organ_type)
              and (r.blood_group is null or r.organ_type in ('eyes', 'bone_marrow')
                   or public.blood_compatible(p.blood_group, r.blood_group, true)))
           )
       and coalesce(rr.status, '') <> 'declined'
  )
  select c.user_id, c.name, c.blood_group, c.city, round(c.dist::numeric, 1)::double precision,
         round((45 * case when c.dist is not null then greatest(0, 1 - c.dist / p_radius_km)
                          when c.same_city then 0.3 else 0.1 end
              + 25 * c.compat
              + 15 * least(c.vd, 5) / 5.0
              + 15 * coalesce(c.avg_rating / 5.0, 0.6))::numeric, 1) as score,
         c.eligible, c.vd, c.avg_rating, c.receive_notifications, c.alerted, c.resp
    from cand c
   where (c.dist is not null and c.dist <= p_radius_km)
      or (c.dist_unknown and c.same_city)
   order by c.eligible desc, score desc
   limit least(greatest(p_limit, 1), 200)
$$;

-- -----------------------------------------------------------------------------
-- Users near a point (camps / announcements). Falls back to city match.
-- -----------------------------------------------------------------------------
create or replace function public.users_near(
  p_lat double precision, p_lng double precision, p_radius_km double precision, p_city text default null
) returns table (user_id uuid)
language sql stable as $$
  select p.user_id
    from public.profiles p
    join public.users u on u.id = p.user_id and u.status = 'active' and u.is_verified and u.role = 'user'
   where p.receive_notifications
     and (
           (p_lat is not null and p.latitude is not null
            and public.haversine_km(p_lat, p_lng, p.latitude, p.longitude) <= p_radius_km)
        or (p_city is not null and lower(p.city) = lower(p_city))
         )
$$;

-- -----------------------------------------------------------------------------
-- Leaderboard
-- -----------------------------------------------------------------------------
create or replace function public.leaderboard(
  p_viewer uuid, p_city text default null, p_since date default null, p_limit int default 20
) returns table (
  rank int, user_id uuid, display_name text, city text, blood_group text,
  verified_donations int, points int, is_me boolean
)
language sql stable as $$
  with scored as (
    select u.id, u.name, p.city, p.blood_group, p.show_on_leaderboard,
           (select count(*)::int from public.donations d
             where d.donor_id = u.id and d.verified_at is not null
               and (p_since is null or d.donated_on >= p_since)) as vd,
           (select count(*)::int from public.request_responses x
             where x.donor_id = u.id and x.status = 'accepted'
               and (p_since is null or x.updated_at >= p_since)) as ar
      from public.users u
      join public.profiles p on p.user_id = u.id
     where u.role = 'user' and u.status = 'active'
       and (p_city is null or lower(p.city) = lower(p_city))
  ),
  ranked as (
    select s.*, (s.vd * 100 + s.ar * 20) as pts,
           rank() over (order by (s.vd * 100 + s.ar * 20) desc)::int as rk
      from scored s
     where s.vd > 0 or s.ar > 0
  )
  select r.rk, r.id,
         -- First name + last initial only, to protect privacy.
         case when r.show_on_leaderboard or r.id = p_viewer
              then split_part(coalesce(r.name, 'Donor'), ' ', 1)
                   || coalesce(' ' || left(nullif(split_part(r.name, ' ', 2), ''), 1) || '.', '')
              else 'Anonymous donor' end,
         r.city, r.blood_group, r.vd, r.pts, r.id = p_viewer
    from ranked r
   where r.rk <= p_limit or r.id = p_viewer
   order by r.rk, r.id
$$;

-- -----------------------------------------------------------------------------
-- Admin analytics (p_hospital null = platform-wide)
-- -----------------------------------------------------------------------------
create or replace function public.admin_analytics(
  p_hospital uuid default null, p_from date default null, p_to date default null, p_city text default null
) returns jsonb
language sql stable as $$
  with
  win as (select coalesce(p_from, current_date - 90) as d_from, coalesce(p_to, current_date) as d_to),
  req as (
    select r.* from public.donation_requests r, win
     where (p_hospital is null or r.hospital_id = p_hospital)
       and (p_city is null or lower(r.city) = lower(p_city))
       and r.created_at::date between win.d_from and win.d_to
  ),
  active_req as (
    select r.* from public.donation_requests r
     where r.status in ('pending', 'matched', 'in_progress') and not r.flagged
       and (p_hospital is null or r.hospital_id = p_hospital)
       and (p_city is null or lower(r.city) = lower(p_city))
  ),
  don as (
    select d.* from public.donations d, win
     where d.verified_at is not null
       and (p_hospital is null or d.hospital_id = p_hospital)
       and d.donated_on between win.d_from and win.d_to
  ),
  donors as (
    select p.*, s.next_eligible_on from public.profiles p
      join public.users u on u.id = p.user_id and u.role = 'user' and u.status = 'active'
      left join public.donor_stats s on s.user_id = p.user_id
     where p_city is null or lower(p.city) = lower(p_city)
  ),
  available as (
    select * from donors
     where available_to_donate and blood_group is not null
       and (next_eligible_on is null or next_eligible_on <= current_date)
  ),
  first_match as (
    select r.id, r.created_at, min(x.created_at) as matched
      from req r join public.request_responses x on x.request_id = r.id and x.status = 'accepted'
     group by r.id, r.created_at
  )
  select jsonb_build_object(
    'from', (select d_from from win),
    'to', (select d_to from win),
    'totals', jsonb_build_object(
      'donors', (select count(*) from donors where registered_as = 'donor'),
      'verifiedDonors', (select count(*) from donors d join public.users u on u.id = d.user_id
                          where u.verification_status = 'verified' and d.registered_as = 'donor'),
      'recipients', (select count(*) from donors where registered_as = 'recipient'),
      'availableDonors', (select count(*) from available),
      'activeRequests', (select count(*) from active_req),
      'urgentActive', (select count(*) from active_req where priority = 'urgent'),
      'requestsInPeriod', (select count(*) from req),
      'completedInPeriod', (select count(*) from req where status = 'completed'),
      'cancelledInPeriod', (select count(*) from req where status = 'cancelled'),
      'donations', (select count(*) from don),
      'unitsDonated', (select coalesce(sum(units), 0) from don),
      'pendingVerifications', (select count(*) from public.users where verification_status = 'pending'),
      'openReports', (select count(*) from public.reports where status = 'open'),
      'alertsLast7Days', (select count(*) from public.request_alerts a
                            join public.donation_requests r on r.id = a.request_id
                           where a.created_at >= now() - interval '7 days'
                             and (p_hospital is null or r.hospital_id = p_hospital))
    ),
    'successRate', (select case when count(*) filter (where status in ('completed', 'cancelled')) = 0 then null
                                else round(100.0 * count(*) filter (where status = 'completed')
                                           / count(*) filter (where status in ('completed', 'cancelled')), 1) end
                      from req),
    'avgHoursToMatch', (select round((extract(epoch from avg(matched - created_at)) / 3600)::numeric, 1) from first_match),
    'avgHoursToComplete', (select round((extract(epoch from avg(completed_at - created_at)) / 3600)::numeric, 1)
                             from req where status = 'completed' and completed_at is not null),
    'bloodGroups', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'bloodGroup', g.bg,
               'availableDonors', (select count(*) from available a where a.blood_group = g.bg),
               'activeRequests', (select count(*) from active_req r where r.blood_group = g.bg and r.request_type = 'blood'),
               'unitsNeeded', (select coalesce(sum(units_required), 0) from active_req r
                                where r.blood_group = g.bg and r.request_type = 'blood')
             ) order by g.bg), '[]'::jsonb)
        from unnest(array['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']) as g(bg)
    ),
    'cities', (
      select coalesce(jsonb_agg(c order by (c ->> 'activeRequests')::int desc, (c ->> 'availableDonors')::int desc), '[]'::jsonb)
        from (
          select jsonb_build_object(
                   'city', x.city,
                   'availableDonors', (select count(*) from available a where lower(a.city) = lower(x.city)),
                   'activeRequests', (select count(*) from active_req r where lower(r.city) = lower(x.city)),
                   'donations', (select count(*) from don d join public.profiles p on p.user_id = d.donor_id
                                  where lower(p.city) = lower(x.city))
                 ) as c
            from (select distinct initcap(trim(city)) as city from donors where city is not null
                  union select distinct initcap(trim(city)) from active_req where city is not null) x
           limit 50
        ) cc
    ),
    'weekly', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'weekStart', w.wk,
               'requests', (select count(*) from req r where date_trunc('week', r.created_at)::date = w.wk),
               'completed', (select count(*) from req r where r.status = 'completed'
                               and date_trunc('week', coalesce(r.completed_at, r.updated_at))::date = w.wk),
               'donations', (select count(*) from don d where date_trunc('week', d.donated_on)::date = w.wk),
               'units', (select coalesce(sum(units), 0) from don d where date_trunc('week', d.donated_on)::date = w.wk)
             ) order by w.wk), '[]'::jsonb)
        from (select generate_series(date_trunc('week', (select d_from from win)),
                                     date_trunc('week', (select d_to from win)), interval '1 week')::date as wk) w
    ),
    'requestTypes', jsonb_build_object(
      'blood', (select count(*) from req where request_type = 'blood'),
      'organ', (select count(*) from req where request_type = 'organ')
    )
  )
$$;

-- -----------------------------------------------------------------------------
-- Reminders (called by the API every 15 minutes; idempotent and safe to run
-- concurrently because every branch claims rows with UPDATE … RETURNING).
-- -----------------------------------------------------------------------------
create or replace function public.run_scheduled_reminders() returns jsonb
language plpgsql as $$
declare
  n_appt int; n_camp int; n_elig int; n_stale int;
begin
  -- Appointments in the next 24 hours.
  with due as (
    update public.appointments a set reminder_sent_at = now()
     where a.status = 'scheduled' and a.reminder_sent_at is null
       and a.scheduled_at between now() and now() + interval '24 hours'
    returning a.*
  ), ins as (
    insert into public.notifications (user_id, type, title, body, data)
    select d.donor_id, 'reminder', 'Donation appointment tomorrow',
           'Your appointment at ' || d.hospital_name || ' is at '
             || to_char(d.scheduled_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM')
             || '. Eat well, stay hydrated and carry an ID.',
           jsonb_build_object('appointmentId', d.id, 'requestId', d.request_id)
      from due d
    returning 1
  ) select count(*) into n_appt from ins;

  -- Camps starting in the next 24 hours.
  with due as (
    update public.camp_registrations cr set reminder_sent_at = now()
      from public.camps c
     where c.id = cr.camp_id and cr.reminder_sent_at is null and c.status = 'scheduled'
       and c.starts_at between now() and now() + interval '24 hours'
    returning cr.user_id, c.id as camp_id, c.title, c.starts_at, c.address
  ), ins as (
    insert into public.notifications (user_id, type, title, body, data)
    select d.user_id, 'reminder', 'Blood camp tomorrow: ' || d.title,
           to_char(d.starts_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM') || ' at ' || d.address,
           jsonb_build_object('campId', d.camp_id)
      from due d
    returning 1
  ) select count(*) into n_camp from ins;

  -- Donors who became eligible again.
  with due as (
    update public.profiles p set eligibility_reminded_on = current_date
      from public.donor_stats s
     where s.user_id = p.user_id and p.receive_notifications and p.available_to_donate
       and s.next_eligible_on is not null and s.next_eligible_on <= current_date
       and (p.eligibility_reminded_on is null or p.eligibility_reminded_on < s.next_eligible_on)
    returning p.user_id
  ), ins as (
    insert into public.notifications (user_id, type, title, body, data)
    select d.user_id, 'reminder', 'You can donate again',
           'Your recovery period is over. Check nearby requests and camps to help someone today.',
           '{}'::jsonb
      from due d
    returning 1
  ) select count(*) into n_elig from ins;

  -- Requests past their needed-by date that are still open.
  with due as (
    update public.donation_requests r set stale_notified_at = now()
     where r.status in ('pending', 'matched', 'in_progress') and r.stale_notified_at is null
       and r.needed_by is not null and r.needed_by < current_date
    returning r.id, r.requester_id, r.patient_name
  ), ins as (
    insert into public.notifications (user_id, type, title, body, data)
    select d.requester_id, 'request_update', 'Is this request still needed?',
           'The needed-by date for ' || d.patient_name || ' has passed. Mark it completed or cancel it so donors aren''t contacted unnecessarily.',
           jsonb_build_object('requestId', d.id)
      from due d
    returning 1
  ) select count(*) into n_stale from ins;

  return jsonb_build_object('appointments', n_appt, 'camps', n_camp, 'eligibility', n_elig, 'staleRequests', n_stale);
end $$;

-- -----------------------------------------------------------------------------
-- Broadcast an announcement as notifications (set-based, one statement).
-- -----------------------------------------------------------------------------
create or replace function public.broadcast_announcement(p_announcement uuid) returns int
language plpgsql as $$
declare n int;
begin
  with a as (select * from public.announcements where id = p_announcement),
  ins as (
    insert into public.notifications (user_id, type, title, body, data)
    select u.id, 'announcement', a.title, a.body, jsonb_build_object('announcementId', a.id)
      from a
      join public.users u on u.role = 'user' and u.status = 'active' and u.is_verified
      join public.profiles p on p.user_id = u.id and p.receive_notifications
     where (a.audience = 'all' or (a.audience = 'donors' and p.registered_as = 'donor')
                               or (a.audience = 'recipients' and p.registered_as = 'recipient'))
       and (a.city is null or lower(p.city) = lower(a.city))
    returning 1
  ) select count(*) into n from ins;
  return n;
end $$;

-- -----------------------------------------------------------------------------
-- Lock down new objects: backend (service_role) only
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['request_events', 'request_alerts', 'appointments', 'ratings', 'reports', 'announcements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke all on public.donor_ratings from anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.list_open_requests(uuid, double precision, double precision, double precision, text, text, text, boolean, int, int)',
    'public.search_donors(uuid, text, text, text, double precision, double precision, double precision, boolean, int, int)',
    'public.match_donors(uuid, double precision, int)',
    'public.users_near(double precision, double precision, double precision, text)',
    'public.leaderboard(uuid, text, date, int)',
    'public.admin_analytics(uuid, date, date, text)',
    'public.run_scheduled_reminders()',
    'public.broadcast_announcement(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

commit;
