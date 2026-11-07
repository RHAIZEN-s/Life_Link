\set ON_ERROR_STOP on
-- Exercises the workflow functions with realistic data. Each check RAISEs on failure.

-- Legacy data survived the upgrade.
do $$ begin
  assert (select email from users where id = '00000000-0000-0000-0000-00000000000a') = 'old.user@example.com', 'email not normalised';
  assert (select name from users where id = '00000000-0000-0000-0000-00000000000a') = 'Old User', 'name not moved';
  assert (select blood_group from profiles where user_id = '00000000-0000-0000-0000-00000000000a') = 'A+', 'blood group not normalised';
  assert to_regclass('public.legacy_blood_requests') is not null, 'legacy table not kept';
end $$;

-- Hospital, requester, donors (Pune).
insert into hospitals (id, name, city, latitude, longitude, is_verified)
values ('10000000-0000-0000-0000-000000000001', 'Ruby Hall', 'Pune', 18.5314, 73.8770, true);

insert into users (id, email, name, is_verified, role, verification_status) values
  ('20000000-0000-0000-0000-000000000001', 'req@x.co',   'Requester One', true, 'user', 'verified'),
  ('20000000-0000-0000-0000-000000000002', 'oneg@x.co',  'Neha Oneg',     true, 'user', 'verified'),
  ('20000000-0000-0000-0000-000000000003', 'apos@x.co',  'Arun Apos',     true, 'user', 'verified'),
  ('20000000-0000-0000-0000-000000000004', 'bpos@x.co',  'Bina Bpos',     true, 'user', 'verified'),
  ('20000000-0000-0000-0000-000000000005', 'unver@x.co', 'Uma Unverified',true, 'user', 'pending'),
  ('20000000-0000-0000-0000-000000000006', 'far@x.co',   'Farid Far',     true, 'user', 'verified'),
  ('20000000-0000-0000-0000-000000000007', 'susp@x.co',  'Sam Suspended', true, 'user', 'verified'),
  ('20000000-0000-0000-0000-000000000008', 'recent@x.co','Rita Recent',   true, 'user', 'verified');
update users set status = 'suspended' where id = '20000000-0000-0000-0000-000000000007';

insert into profiles (user_id, blood_group, city, latitude, longitude, available_to_donate, registered_as) values
  ('20000000-0000-0000-0000-000000000001', 'A+',  'Pune',   18.52, 73.85, false, 'recipient'),
  ('20000000-0000-0000-0000-000000000002', 'O-',  'Pune',   18.53, 73.86, true,  'donor'),
  ('20000000-0000-0000-0000-000000000003', 'A+',  'Pune',   18.50, 73.84, true,  'donor'),
  ('20000000-0000-0000-0000-000000000004', 'B+',  'Pune',   18.51, 73.85, true,  'donor'),
  ('20000000-0000-0000-0000-000000000005', 'A+',  'Pune',   18.52, 73.86, true,  'donor'),
  ('20000000-0000-0000-0000-000000000006', 'A-',  'Mumbai', 19.07, 72.87, true,  'donor'),
  ('20000000-0000-0000-0000-000000000007', 'O+',  'Pune',   18.52, 73.85, true,  'donor'),
  ('20000000-0000-0000-0000-000000000008', 'O+',  'Pune',   18.52, 73.85, true,  'donor');
-- Rita donated 10 days ago: not eligible for whole blood yet.
insert into donations (donor_id, hospital_name, donation_type, blood_group, units, donated_on, verified_at)
values ('20000000-0000-0000-0000-000000000008', 'Ruby Hall', 'whole_blood', 'O+', 1, current_date - 10, now());

insert into donation_requests (id, requester_id, hospital_id, hospital_name, patient_name, request_type, blood_group,
                               units_required, priority, contact_phone, location_text, city, latitude, longitude)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', 'Ruby Hall', 'Patient A', 'blood', 'A+', 2, 'urgent',
        '+919876543210', 'Ruby Hall, Pune', 'Pune', 18.5314, 73.8770);

-- Smart matching: compatible + verified + active + in range only.
do $$
declare ids uuid[];
begin
  select array_agg(user_id order by score desc) into ids from match_donors('30000000-0000-0000-0000-000000000001', 50, 50);
  assert '20000000-0000-0000-0000-000000000002' = any(ids), 'O- donor should match A+';
  assert '20000000-0000-0000-0000-000000000003' = any(ids), 'A+ donor should match';
  assert not ('20000000-0000-0000-0000-000000000004' = any(ids)), 'B+ must not match A+';
  assert not ('20000000-0000-0000-0000-000000000005' = any(ids)), 'unverified donor must not match';
  assert not ('20000000-0000-0000-0000-000000000006' = any(ids)), 'donor 120 km away must not match within 50 km';
  assert not ('20000000-0000-0000-0000-000000000007' = any(ids)), 'suspended donor must not match';
  assert not ('20000000-0000-0000-0000-000000000001' = any(ids)), 'requester must not match own request';
  -- exact group ranks above the universal donor at similar distance
  assert ids[1] = '20000000-0000-0000-0000-000000000003', 'exact match should rank first';
  -- Rita (O+) is compatible but ineligible: listed, flagged ineligible
  assert (select not is_eligible from match_donors('30000000-0000-0000-0000-000000000001', 50, 50)
           where user_id = '20000000-0000-0000-0000-000000000008'), 'recent donor should be ineligible';
end $$;

-- Requests feed for a donor, compatibility flag.
do $$ begin
  assert (select can_donate from list_open_requests('20000000-0000-0000-0000-000000000002')
           where id = '30000000-0000-0000-0000-000000000001'), 'O- donor can donate to A+';
  assert not exists (select 1 from list_open_requests('20000000-0000-0000-0000-000000000004', p_compatible_only => true)),
    'B+ donor should see no compatible requests';
  assert not exists (select 1 from list_open_requests('20000000-0000-0000-0000-000000000001')),
    'requester should not see their own request';
end $$;

-- Donor search: compatible mode returns O- and A+ for an A+ patient, exact first.
do $$
declare names text[];
begin
  select array_agg(name) into names
    from search_donors('20000000-0000-0000-0000-000000000001', 'blood', 'A+', null, null, null, null, true);
  assert 'Arun Apos' = any(names) and 'Neha Oneg' = any(names) and 'Farid Far' = any(names), 'compatible donors missing';
  assert not ('Uma Unverified' = any(names)), 'unverified donor visible in search';
  assert not ('Bina Bpos' = any(names)), 'incompatible donor in search';
  assert names[1] = 'Arun Apos', 'exact group should come first';
end $$;

-- Lifecycle, alerts, ratings, analytics, leaderboard, reminders.
insert into request_responses (request_id, donor_id, status)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'accepted');
update donation_requests set status = 'matched' where id = '30000000-0000-0000-0000-000000000001';
insert into request_alerts (request_id, donor_id) values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
insert into appointments (donor_id, request_id, hospital_id, hospital_name, scheduled_at)
values ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', 'Ruby Hall', now() + interval '3 hours');
-- Second active appointment for the same donor+request must be rejected.
do $$ begin
  begin
    insert into appointments (donor_id, request_id, hospital_name, scheduled_at)
    values ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'Ruby Hall', now() + interval '1 day');
    raise exception 'duplicate active appointment was allowed';
  exception when unique_violation then null;
  end;
end $$;

do $$
declare r jsonb;
begin
  r := run_scheduled_reminders();
  assert (r ->> 'appointments')::int = 1, 'appointment reminder not sent: ' || r::text;
  r := run_scheduled_reminders();
  assert (r ->> 'appointments')::int = 0, 'reminder sent twice';
  assert exists (select 1 from notifications where user_id = '20000000-0000-0000-0000-000000000003' and type = 'reminder');
end $$;

update donation_requests set status = 'completed', completed_at = now() where id = '30000000-0000-0000-0000-000000000001';
insert into donations (donor_id, hospital_id, hospital_name, donation_type, blood_group, units, donated_on, request_id, verified_at)
values ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Ruby Hall', 'whole_blood',
        'A+', 2, current_date, '30000000-0000-0000-0000-000000000001', now());
insert into ratings (request_id, rater_id, donor_id, score, comment)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000003', 5, 'On time and kind');
do $$ begin
  begin
    insert into ratings (request_id, rater_id, donor_id, score)
    values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 4);
    raise exception 'duplicate rating allowed';
  exception when unique_violation then null;
  end;
  assert (select avg_rating from donor_ratings where user_id = '20000000-0000-0000-0000-000000000003') = 5.0;
  assert (select points from donor_stats where user_id = '20000000-0000-0000-0000-000000000003') = 120, 'points = 100 + 20';
  assert (select next_eligible_on from donor_stats where user_id = '20000000-0000-0000-0000-000000000003') = current_date + 90;
end $$;

do $$
declare a jsonb; top record;
begin
  a := admin_analytics(null, current_date - 30, current_date, null);
  assert (a -> 'totals' ->> 'donations')::int = 2, 'analytics donations: ' || (a -> 'totals')::text;
  assert (a ->> 'successRate')::numeric = 100, 'success rate';
  assert jsonb_array_length(a -> 'bloodGroups') = 8;
  a := admin_analytics('10000000-0000-0000-0000-000000000001', null, null, 'Pune');
  assert (a -> 'totals' ->> 'requestsInPeriod')::int = 1, 'hospital-scoped analytics';

  select * into top from leaderboard('20000000-0000-0000-0000-000000000002') order by rank limit 1;
  assert top.display_name = 'Arun A.', 'leaderboard name privacy: ' || top.display_name;
  assert top.points = 120;
end $$;

-- Announcements broadcast respects audience.
insert into announcements (id, title, body, audience, ends_at)
values ('40000000-0000-0000-0000-000000000001', 'Drive', 'Sunday drive at City Hall', 'donors', now() + interval '1 day');
do $$
declare n int;
begin
  n := broadcast_announcement('40000000-0000-0000-0000-000000000001');
  assert n >= 4, 'broadcast count ' || n;
  assert not exists (select 1 from notifications where type = 'announcement'
                       and user_id = '20000000-0000-0000-0000-000000000001'), 'recipient got a donors-only announcement';
  assert not exists (select 1 from notifications where type = 'announcement'
                       and user_id = '20000000-0000-0000-0000-000000000007'), 'suspended user got an announcement';
end $$;

-- Public API is locked down.
do $$ begin
  assert not has_table_privilege('anon', 'public.users', 'select'), 'anon can read users';
  assert not has_table_privilege('authenticated', 'public.appointments', 'select'), 'authenticated can read appointments';
  assert not has_function_privilege('anon', 'public.match_donors(uuid, double precision, int)', 'execute'), 'anon can run match_donors';
  assert (select bool_and(relrowsecurity) from pg_class
           where relnamespace = 'public'::regnamespace and relkind = 'r'), 'a table without RLS';
end $$;

select 'ALL WORKFLOW CHECKS PASSED' as result;
