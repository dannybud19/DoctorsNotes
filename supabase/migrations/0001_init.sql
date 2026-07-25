-- DoctorsNotes initial schema.
-- Invariants (AGENTS.md §1.5): patient_id on every table; RLS enabled on every table from the start;
-- access is anchored to the `members` table; no hardcoded identity; synthetic data only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core identity
-- ---------------------------------------------------------------------------
create table public.patients (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- Who may see which patient. This is the anchor for every RLS policy below.
create table public.members (
  user_id    uuid not null,                       -- references auth.users(id)
  patient_id uuid not null references public.patients(id) on delete cascade,
  role       text not null default 'patient',
  created_at timestamptz not null default now(),
  primary key (user_id, patient_id)
);

-- ---------------------------------------------------------------------------
-- Captured sources
-- ---------------------------------------------------------------------------
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  storage_path text not null,
  page_count   int,
  captured_at  timestamptz not null default now()
);

create table public.recordings (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  storage_path text not null,
  duration_ms  int,
  captured_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ground truth + reconciliation
-- ---------------------------------------------------------------------------
create table public.claims (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  category      text not null,
  subject       text not null,
  verbatim_text text not null,        -- exact words; never a paraphrase (invariant §1.2)
  value         text not null,
  source        jsonb not null,       -- ClaimSource discriminated union (audio | document)
  observed_at   timestamptz not null,
  created_at    timestamptz not null default now()
);

create table public.claim_groups (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  category    text not null,
  subject     text not null,
  status      text not null check (status in ('agreed', 'worth_confirming', 'uncorroborated')),
  computed_at timestamptz not null default now()
);

create table public.confirmations (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  category        text not null,
  subject         text not null,
  confirmed_value text not null,
  from_claim_id   uuid not null references public.claims(id) on delete cascade,
  confirmed_at    timestamptz not null default now()
);

-- Indexes: patient_id as the trailing access column on every scoped table.
create index documents_patient_id_idx     on public.documents (patient_id);
create index recordings_patient_id_idx    on public.recordings (patient_id);
create index claims_patient_id_idx        on public.claims (patient_id);
create index claim_groups_patient_id_idx  on public.claim_groups (patient_id);
create index confirmations_patient_id_idx on public.confirmations (patient_id);
create index members_patient_id_idx       on public.members (patient_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — enabled + forced on EVERY table
-- ---------------------------------------------------------------------------
alter table public.patients      enable row level security;
alter table public.members       enable row level security;
alter table public.documents     enable row level security;
alter table public.recordings    enable row level security;
alter table public.claims        enable row level security;
alter table public.claim_groups  enable row level security;
alter table public.confirmations enable row level security;

alter table public.patients      force row level security;
alter table public.members       force row level security;
alter table public.documents     force row level security;
alter table public.recordings    force row level security;
alter table public.claims        force row level security;
alter table public.claim_groups  force row level security;
alter table public.confirmations force row level security;

-- Helper: the patient_ids the current user is a member of. `(select auth.uid())` is wrapped so the
-- planner treats it as an init-plan constant (Supabase RLS performance best practice).
create or replace function public.current_member_patient_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select m.patient_id from public.members m where m.user_id = (select auth.uid())
$$;

-- A user sees only their own membership rows.
create policy members_self_select on public.members
  for select using (user_id = (select auth.uid()));

-- Patients: visible only to their members.
create policy patients_member_select on public.patients
  for select using (id in (select public.current_member_patient_ids()));

-- Scoped tables: full access limited to the member's patient_ids.
create policy documents_member_all on public.documents
  for all using (patient_id in (select public.current_member_patient_ids()))
  with check (patient_id in (select public.current_member_patient_ids()));

create policy recordings_member_all on public.recordings
  for all using (patient_id in (select public.current_member_patient_ids()))
  with check (patient_id in (select public.current_member_patient_ids()));

create policy claims_member_all on public.claims
  for all using (patient_id in (select public.current_member_patient_ids()))
  with check (patient_id in (select public.current_member_patient_ids()));

create policy claim_groups_member_all on public.claim_groups
  for all using (patient_id in (select public.current_member_patient_ids()))
  with check (patient_id in (select public.current_member_patient_ids()));

create policy confirmations_member_all on public.confirmations
  for all using (patient_id in (select public.current_member_patient_ids()))
  with check (patient_id in (select public.current_member_patient_ids()));
