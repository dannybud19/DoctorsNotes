-- Runtime RLS test (pgTAP). Requires a live Postgres with pgTAP + the schema applied.
-- Run in a later integration window (needs a database): `pg_prove` or `supabase test db`.
-- Proves a member of patient A cannot read patient B's claims.
begin;
select plan(2);

-- Two synthetic patients and two users.
insert into public.patients (id, display_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Synthetic A'),
  ('00000000-0000-0000-0000-0000000000b2', 'Synthetic B')
on conflict (id) do nothing;

insert into public.members (user_id, patient_id, role) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000a1', 'patient'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000b2', 'patient');

insert into public.claims (patient_id, category, subject, verbatim_text, value, source, observed_at)
values
  ('00000000-0000-0000-0000-0000000000a1', 'medication-dose', 'metoprolol',
   'Take 25 milligrams of metoprolol twice daily.', '25mg twice daily',
   '{"kind":"document","documentId":"d1","page":1,"region":{"x":0,"y":0,"width":0.1,"height":0.1}}'::jsonb,
   now());

-- Act as user A (member of patient A).
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from public.claims where patient_id = '00000000-0000-0000-0000-0000000000a1'),
  1, 'member A can read patient A claims');

-- Act as user B (member of patient B) — must see zero of patient A's claims.
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from public.claims where patient_id = '00000000-0000-0000-0000-0000000000a1'),
  0, 'member B is denied patient A claims (cross-patient read blocked)');

select * from finish();
rollback;
