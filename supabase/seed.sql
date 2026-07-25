-- Synthetic seed only. NO real patient data (AGENTS.md §1.5).
-- One patient row with a fixed id so fixtures/tests can reference it deterministically.
insert into public.patients (id, display_name)
values ('00000000-0000-0000-0000-0000000000a1', 'Synthetic Patient 1')
on conflict (id) do nothing;

-- NOTE: no `members` row is seeded here — membership is created when a real auth user is linked.
-- There is deliberately no hardcoded user identity in the schema or seed.
