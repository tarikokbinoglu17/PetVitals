-- Longitudinal care foundation for PetSolea.
-- Every exposed table is protected by RLS and explicitly granted to authenticated users.

begin;

-- Seven-day access is created by the user, but only the billing backend may
-- change the subscribed flag. This prevents client-side entitlement spoofing.
create table if not exists public.subscription_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_started_at timestamptz not null default now(),
  subscribed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_webhook_events (
  event_id text primary key,
  event_type text not null,
  app_user_id uuid,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  processed_at timestamptz not null default now()
);

create table if not exists public.ai_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('health_assistant','document_scan','vet_visit_copilot')),
  created_at timestamptz not null default now()
);

create table if not exists public.veterinarian_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinic_name text not null check (char_length(trim(clinic_name)) between 2 and 180),
  license_country text not null check (char_length(trim(license_country)) between 2 and 80),
  license_number text not null check (char_length(trim(license_number)) between 2 and 120),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (license_country, license_number)
);

create table if not exists public.daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  recorded_by uuid not null references auth.users(id) on delete cascade,
  observed_at timestamptz not null default now(),
  appetite smallint not null check (appetite between 1 and 5),
  water_intake smallint not null check (water_intake between 1 and 5),
  stool_quality smallint not null check (stool_quality between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  pain smallint not null check (pain between 0 and 4),
  mood smallint not null check (mood between 1 and 5),
  red_flags text[] not null default '{}',
  species_metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(species_metrics) = 'object'),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (owner_id, client_event_id),
  check (red_flags <@ array['breathing_difficulty','collapse','seizure','repeated_vomiting','uncontrolled_bleeding','possible_poisoning']::text[])
);

create table if not exists public.medication_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  medication_name text not null check (char_length(trim(medication_name)) between 1 and 160),
  dosage_text text not null check (char_length(trim(dosage_text)) between 1 and 240),
  instructions text check (char_length(instructions) <= 2000),
  schedule_times jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule_times) = 'array'),
  timezone text not null default 'Europe/Istanbul',
  start_date date not null default current_date,
  end_date date,
  stock_quantity numeric check (stock_quantity is null or stock_quantity >= 0),
  stock_unit text,
  refill_threshold numeric check (refill_threshold is null or refill_threshold >= 0),
  prescribing_veterinarian text,
  source_type text not null default 'owner_entered' check (source_type in ('owner_entered','document','veterinarian')),
  verification_status text not null default 'owner_entered' check (verification_status in ('owner_entered','pending','vet_verified','rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table if not exists public.medication_doses (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  medication_plan_id uuid not null references public.medication_plans(id) on delete cascade,
  planned_at timestamptz not null,
  actual_at timestamptz,
  status text not null check (status in ('taken','missed','skipped')),
  stock_after numeric check (stock_after is null or stock_after >= 0),
  recorded_by uuid not null references auth.users(id) on delete cascade,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  unique (owner_id, client_event_id)
);

create table if not exists public.care_programs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  condition_key text not null check (condition_key in ('kidney','diabetes','epilepsy','heart','allergy','senior','other')),
  label text not null check (char_length(trim(label)) between 1 and 160),
  status text not null default 'active' check (status in ('active','paused','completed')),
  targets jsonb not null default '{}'::jsonb check (jsonb_typeof(targets) = 'object'),
  notes text check (char_length(notes) <= 3000),
  verification_status text not null default 'owner_entered' check (verification_status in ('owner_entered','pending','vet_verified','rejected')),
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.care_measurements (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  program_id uuid not null references public.care_programs(id) on delete cascade,
  metric_type text not null check (char_length(trim(metric_type)) between 1 and 120),
  value_numeric numeric,
  value_text text,
  unit text,
  occurred_at timestamptz not null default now(),
  recorded_by uuid not null references auth.users(id) on delete cascade,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  unique (owner_id, client_event_id),
  check (value_numeric is not null or nullif(trim(value_text), '') is not null)
);

create table if not exists public.vet_visits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  clinic_name text,
  veterinarian text,
  visit_at timestamptz not null default now(),
  recording_consent boolean not null default false,
  consent_given_at timestamptz,
  consent_note text,
  audio_storage_path text,
  transcript text,
  summary jsonb,
  status text not null default 'draft' check (status in ('draft','processing','needs_review','confirmed','failed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((recording_consent = false and consent_given_at is null and audio_storage_path is null) or recording_consent = true)
);

create table if not exists public.record_verifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  entity_type text not null check (entity_type in ('health_record','vaccine','medication_plan','care_program','vet_visit')),
  entity_id uuid not null,
  record_label text,
  status text not null default 'owner_entered' check (status in ('owner_entered','pending','vet_verified','rejected')),
  clinic_name text,
  verifier_user_id uuid references auth.users(id) on delete set null,
  verifier_name text,
  verified_at timestamptz,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create table if not exists public.pet_emergency_profiles (
  pet_id uuid primary key references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  blood_type text,
  emergency_vet_name text,
  emergency_vet_phone text,
  insurance_provider text,
  policy_number text,
  safety_notes text check (char_length(safety_notes) <= 3000),
  updated_at timestamptz not null default now()
);

alter table public.document_extractions add column if not exists original_file_name text;
alter table public.document_extractions add column if not exists document_type text;
alter table public.document_extractions add column if not exists confidence numeric check (confidence is null or confidence between 0 and 1);
alter table public.document_extractions add column if not exists warnings text[] not null default '{}';
alter table public.document_extractions add column if not exists confirmed_record_ids uuid[] not null default '{}';
alter table public.record_verifications add column if not exists record_label text;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.pet_members'::regclass and conname = 'pet_members_role_check'
  ) then
    alter table public.pet_members drop constraint pet_members_role_check;
  end if;
end $$;
alter table public.pet_members
  add constraint pet_members_role_check check (role in ('partner','caregiver','veterinarian','viewer'));

alter table public.daily_check_ins enable row level security;
alter table public.medication_plans enable row level security;
alter table public.medication_doses enable row level security;
alter table public.care_programs enable row level security;
alter table public.care_measurements enable row level security;
alter table public.vet_visits enable row level security;
alter table public.record_verifications enable row level security;
alter table public.pet_emergency_profiles enable row level security;
alter table public.subscription_access enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.veterinarian_profiles enable row level security;

drop policy if exists "Veterinarians view own credential profile" on public.veterinarian_profiles;
create policy "Veterinarians view own credential profile" on public.veterinarian_profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Owners create pet members" on public.pet_members;
create policy "Owners create pet members" on public.pet_members for insert to authenticated
with check ((select auth.uid()) = owner_id);
drop policy if exists "Owners update pet members" on public.pet_members;
create policy "Owners update pet members" on public.pet_members for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "Owners delete pet members" on public.pet_members;
create policy "Owners delete pet members" on public.pet_members for delete to authenticated
using ((select auth.uid()) = owner_id);
drop policy if exists "Owners or active members view pet members" on public.pet_members;
create policy "Owners or active members view pet members" on public.pet_members for select to authenticated
using ((select auth.uid()) = owner_id or (member_user_id = (select auth.uid()) and revoked_at is null and (expires_at is null or expires_at > now())));

drop policy if exists "Active members view shared pets" on public.pets;
create policy "Active members view shared pets" on public.pets for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = pets.id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));
drop policy if exists "Active members view shared vaccines" on public.vaccines;
create policy "Active members view shared vaccines" on public.vaccines for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = vaccines.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));
drop policy if exists "Active members view shared health records" on public.health_records;
create policy "Active members view shared health records" on public.health_records for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = health_records.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));
drop policy if exists "Active members view shared weights" on public.weight_entries;
create policy "Active members view shared weights" on public.weight_entries for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = weight_entries.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));
drop policy if exists "Active members view shared life entries" on public.pet_life_entries;
create policy "Active members view shared life entries" on public.pet_life_entries for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = pet_life_entries.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));
drop policy if exists "Active members view shared alerts" on public.smart_health_alerts;
create policy "Active members view shared alerts" on public.smart_health_alerts for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = smart_health_alerts.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));

drop policy if exists "users_select_own_subscription" on public.subscription_access;
create policy "users_select_own_subscription" on public.subscription_access
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users_insert_own_subscription" on public.subscription_access;
create policy "users_insert_own_subscription" on public.subscription_access
for insert to authenticated with check ((select auth.uid()) = user_id and subscribed = false);

create policy "Owners manage daily check-ins" on public.daily_check_ins for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id and recorded_by = (select auth.uid()));
create policy "Active members read daily check-ins" on public.daily_check_ins for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = daily_check_ins.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));
create policy "Editable members add daily check-ins" on public.daily_check_ins for insert to authenticated
with check (recorded_by = (select auth.uid()) and exists (select 1 from public.pet_members pm where pm.pet_id = daily_check_ins.pet_id and pm.owner_id = daily_check_ins.owner_id and pm.member_user_id = (select auth.uid()) and pm.can_edit and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));

create policy "Owners manage medication plans" on public.medication_plans for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Active members read medication plans" on public.medication_plans for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = medication_plans.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));

create policy "Owners manage medication doses" on public.medication_doses for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id and recorded_by = (select auth.uid()));
create policy "Active members read medication doses" on public.medication_doses for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = medication_doses.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));
create policy "Editable members add medication doses" on public.medication_doses for insert to authenticated
with check (recorded_by = (select auth.uid()) and exists (select 1 from public.pet_members pm where pm.pet_id = medication_doses.pet_id and pm.owner_id = medication_doses.owner_id and pm.member_user_id = (select auth.uid()) and pm.can_edit and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));

create policy "Owners manage care programs" on public.care_programs for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Active members read care programs" on public.care_programs for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = care_programs.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));

create policy "Owners manage care measurements" on public.care_measurements for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id and recorded_by = (select auth.uid()));
create policy "Active members read care measurements" on public.care_measurements for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = care_measurements.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));
create policy "Editable members add care measurements" on public.care_measurements for insert to authenticated
with check (recorded_by = (select auth.uid()) and exists (select 1 from public.pet_members pm where pm.pet_id = care_measurements.pet_id and pm.owner_id = care_measurements.owner_id and pm.member_user_id = (select auth.uid()) and pm.can_edit and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));

create policy "Owners manage vet visits" on public.vet_visits for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "Owners read verifications" on public.record_verifications for select to authenticated
using ((select auth.uid()) = owner_id);
create policy "Owners request verification" on public.record_verifications for insert to authenticated
with check ((select auth.uid()) = owner_id and status in ('owner_entered','pending') and verifier_user_id is null and verified_at is null);
create policy "Veterinarians read verification requests" on public.record_verifications for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = record_verifications.pet_id and pm.member_user_id = (select auth.uid()) and pm.role = 'veterinarian' and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));
create policy "Veterinarians update verification requests" on public.record_verifications for update to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = record_verifications.pet_id and pm.member_user_id = (select auth.uid()) and pm.role = 'veterinarian' and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())))
with check (status in ('vet_verified','rejected') and verifier_user_id = (select auth.uid()) and verified_at is not null and exists (select 1 from public.pet_members pm where pm.pet_id = record_verifications.pet_id and pm.member_user_id = (select auth.uid()) and pm.role = 'veterinarian' and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));

create policy "Owners manage emergency profiles" on public.pet_emergency_profiles for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Active members read emergency profiles" on public.pet_emergency_profiles for select to authenticated
using (exists (select 1 from public.pet_members pm where pm.pet_id = pet_emergency_profiles.pet_id and pm.member_user_id = (select auth.uid()) and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())));

create index if not exists daily_check_ins_pet_observed_idx on public.daily_check_ins (pet_id, observed_at desc);
create index if not exists daily_check_ins_recorded_by_idx on public.daily_check_ins (recorded_by);
create index if not exists medication_plans_pet_active_idx on public.medication_plans (pet_id, active);
create index if not exists medication_plans_verified_by_idx on public.medication_plans (verified_by) where verified_by is not null;
create index if not exists medication_doses_plan_time_idx on public.medication_doses (medication_plan_id, planned_at desc);
create index if not exists medication_doses_pet_time_idx on public.medication_doses (pet_id, planned_at desc);
create index if not exists medication_doses_recorded_by_idx on public.medication_doses (recorded_by);
create index if not exists care_programs_pet_status_idx on public.care_programs (pet_id, status);
create index if not exists care_measurements_program_time_idx on public.care_measurements (program_id, occurred_at desc);
create index if not exists care_measurements_pet_time_idx on public.care_measurements (pet_id, occurred_at desc);
create index if not exists care_measurements_recorded_by_idx on public.care_measurements (recorded_by);
create index if not exists vet_visits_pet_time_idx on public.vet_visits (pet_id, visit_at desc);
create index if not exists record_verifications_pet_status_idx on public.record_verifications (pet_id, status);
create index if not exists record_verifications_verifier_idx on public.record_verifications (verifier_user_id) where verifier_user_id is not null;
create index if not exists ai_usage_events_user_feature_time_idx on public.ai_usage_events (user_id, feature, created_at desc);
create index if not exists care_tasks_assigned_user_idx on public.care_tasks (assigned_user_id) where assigned_user_id is not null;
create index if not exists care_tasks_completed_by_idx on public.care_tasks (completed_by) where completed_by is not null;
create index if not exists smart_reminders_completed_by_idx on public.smart_reminders (completed_by) where completed_by is not null;

drop policy if exists "Invitees view email invitations" on public.pet_members;
create policy "Invitees view email invitations" on public.pet_members for select to authenticated
using (member_user_id is null and lower(invite_email) = lower(coalesce((select auth.jwt())->>'email','')) and revoked_at is null and (expires_at is null or expires_at > now()));
drop policy if exists "Invitees accept own email invitation" on public.pet_members;
create policy "Invitees accept own email invitation" on public.pet_members for update to authenticated
using (member_user_id is null and lower(invite_email) = lower(coalesce((select auth.jwt())->>'email','')) and revoked_at is null and (expires_at is null or expires_at > now()))
with check (member_user_id = (select auth.uid()) and lower(invite_email) = lower(coalesce((select auth.jwt())->>'email','')) and revoked_at is null);

create or replace function public.confirm_document_extraction(p_extraction_id uuid, p_confirmed_data jsonb)
returns table(entity_type text, entity_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_extraction public.document_extractions%rowtype;
  v_kind text;
  v_id uuid;
  v_record_date date;
  v_administered_date date;
  v_next_due_date date;
begin
  if jsonb_typeof(p_confirmed_data) <> 'object' then
    raise exception 'Confirmed data must be an object';
  end if;

  select * into v_extraction
  from public.document_extractions
  where id = p_extraction_id and owner_id = (select auth.uid()) and status = 'needs_review'
  for update;
  if not found then raise exception 'Extraction not found or already confirmed'; end if;

  begin v_record_date := nullif(p_confirmed_data->>'recordDate','')::date;
  exception when others then raise exception 'Invalid record date'; end;
  begin v_administered_date := nullif(p_confirmed_data->>'administeredDate','')::date;
  exception when others then raise exception 'Invalid administered date'; end;
  begin v_next_due_date := nullif(p_confirmed_data->>'nextDueDate','')::date;
  exception when others then raise exception 'Invalid next due date'; end;

  if nullif(trim(p_confirmed_data->>'vaccineName'), '') is not null then
    insert into public.vaccines (owner_id, pet_id, vaccine_name, vaccine_type, administered_date, next_due_date, veterinarian, notes, notifications_enabled)
    values (v_extraction.owner_id, v_extraction.pet_id, trim(p_confirmed_data->>'vaccineName'), nullif(trim(p_confirmed_data->>'vaccineType'),''), v_administered_date, v_next_due_date, nullif(trim(p_confirmed_data->>'veterinarian'),''), nullif(trim(p_confirmed_data->>'notes'),''), false)
    returning id into v_id;
    v_kind := 'vaccine';
  elsif nullif(trim(p_confirmed_data->>'medicationName'), '') is not null then
    insert into public.medication_plans (owner_id, pet_id, medication_name, dosage_text, instructions, source_type, verification_status)
    values (v_extraction.owner_id, v_extraction.pet_id, trim(p_confirmed_data->>'medicationName'), coalesce(nullif(trim(p_confirmed_data->>'dosageText'),''),'Doz belgeden doğrulanmalı'), nullif(trim(p_confirmed_data->>'notes'),''), 'document', 'owner_entered')
    returning id into v_id;
    v_kind := 'medication_plan';
  else
    insert into public.health_records (owner_id, pet_id, record_type, title, description, record_date, veterinarian)
    values (v_extraction.owner_id, v_extraction.pet_id, coalesce(nullif(trim(p_confirmed_data->>'documentType'),''),'document'), coalesce(nullif(trim(p_confirmed_data->>'title'),''),'Veteriner belgesi'), nullif(trim(p_confirmed_data->>'notes'),''), coalesce(v_record_date,current_date), nullif(trim(p_confirmed_data->>'veterinarian'),''))
    returning id into v_id;
    v_kind := 'health_record';
  end if;

  update public.document_extractions
  set status = 'confirmed', confirmed_at = now(), document_type = nullif(trim(p_confirmed_data->>'documentType'),''),
      confidence = case when (p_confirmed_data->>'confidence') ~ '^(0(\.\d+)?|1(\.0+)?)$' then (p_confirmed_data->>'confidence')::numeric else confidence end,
      extracted_data = p_confirmed_data, confirmed_record_ids = array_append(confirmed_record_ids, v_id)
  where id = p_extraction_id;

  insert into public.record_verifications (owner_id, pet_id, entity_type, entity_id, record_label, status)
  values (v_extraction.owner_id, v_extraction.pet_id, v_kind, v_id,
    coalesce(nullif(trim(p_confirmed_data->>'vaccineName'),''), nullif(trim(p_confirmed_data->>'medicationName'),''), nullif(trim(p_confirmed_data->>'title'),''), 'Veteriner belgesi'),
    'owner_entered')
  on conflict (entity_type, entity_id) do nothing;

  return query select v_kind, v_id;
end;
$$;

revoke all on function public.confirm_document_extraction(uuid, jsonb) from public;
grant execute on function public.confirm_document_extraction(uuid, jsonb) to authenticated;

create or replace function public.request_record_verification(
  p_pet_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_label text;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  case p_entity_type
    when 'vaccine' then
      select vaccine_name into v_label from public.vaccines where id = p_entity_id and pet_id = p_pet_id and owner_id = v_user_id;
    when 'health_record' then
      select title into v_label from public.health_records where id = p_entity_id and pet_id = p_pet_id and owner_id = v_user_id;
    when 'medication_plan' then
      select medication_name into v_label from public.medication_plans where id = p_entity_id and pet_id = p_pet_id and owner_id = v_user_id;
    when 'care_program' then
      select label into v_label from public.care_programs where id = p_entity_id and pet_id = p_pet_id and owner_id = v_user_id;
    when 'vet_visit' then
      select coalesce(clinic_name, veterinarian, 'Veteriner görüşmesi') into v_label from public.vet_visits where id = p_entity_id and pet_id = p_pet_id and owner_id = v_user_id and status = 'confirmed';
    else raise exception 'Unsupported entity type';
  end case;
  if v_label is null then raise exception 'Record not found or not authorized'; end if;

  insert into public.record_verifications(owner_id, pet_id, entity_type, entity_id, record_label, status)
  values (v_user_id, p_pet_id, p_entity_type, p_entity_id, v_label, 'pending')
  on conflict (entity_type, entity_id) do update
  set status = 'pending', record_label = excluded.record_label, clinic_name = null,
      verifier_user_id = null, verifier_name = null, verified_at = null,
      notes = null, updated_at = now()
  where record_verifications.owner_id = v_user_id
  returning id into v_id;
  if v_id is null then raise exception 'Verification request could not be created'; end if;
  return v_id;
end;
$$;

create or replace function public.review_record_verification(
  p_verification_id uuid,
  p_status text,
  p_clinic_name text default null,
  p_verifier_name text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_request public.record_verifications%rowtype;
  v_verified_clinic text;
  v_profile_name text;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_status not in ('vet_verified','rejected') then raise exception 'Invalid status'; end if;
  select * into v_request from public.record_verifications where id = p_verification_id and status = 'pending' for update;
  if not found then raise exception 'Pending request not found'; end if;
  if not exists (
    select 1 from public.pet_members pm
    where pm.pet_id = v_request.pet_id and pm.owner_id = v_request.owner_id
      and pm.member_user_id = v_user_id and pm.role = 'veterinarian'
      and pm.revoked_at is null and (pm.expires_at is null or pm.expires_at > now())
  ) then raise exception 'Veterinarian access required'; end if;
  select vp.clinic_name into v_verified_clinic
  from public.veterinarian_profiles vp
  where vp.user_id = v_user_id and vp.verification_status = 'verified';
  if v_verified_clinic is null then raise exception 'Verified veterinarian credentials required'; end if;
  select full_name into v_profile_name from public.profiles where id = v_user_id;
  update public.record_verifications
  set status = p_status, clinic_name = v_verified_clinic,
      verifier_user_id = v_user_id, verifier_name = coalesce(v_profile_name, nullif(trim(p_verifier_name),'')),
      verified_at = now(), notes = nullif(trim(p_notes),''), updated_at = now()
  where id = p_verification_id;
end;
$$;

revoke all on function public.request_record_verification(uuid, text, uuid) from public;
grant execute on function public.request_record_verification(uuid, text, uuid) to authenticated;
revoke all on function public.review_record_verification(uuid, text, text, text, text) from public;
grant execute on function public.review_record_verification(uuid, text, text, text, text) to authenticated;

create or replace function public.submit_veterinarian_credentials(
  p_clinic_name text,
  p_license_country text,
  p_license_number text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if char_length(trim(p_clinic_name)) not between 2 and 180
    or char_length(trim(p_license_country)) not between 2 and 80
    or char_length(trim(p_license_number)) not between 2 and 120
  then raise exception 'Credential fields are invalid'; end if;
  insert into public.veterinarian_profiles(user_id, clinic_name, license_country, license_number, verification_status)
  values (v_user_id, trim(p_clinic_name), trim(p_license_country), trim(p_license_number), 'pending')
  on conflict (user_id) do update
  set clinic_name = excluded.clinic_name, license_country = excluded.license_country,
      license_number = excluded.license_number, verification_status = 'pending',
      verified_by = null, verified_at = null, rejection_reason = null, updated_at = now();
end;
$$;

revoke all on function public.submit_veterinarian_credentials(text, text, text) from public;
grant execute on function public.submit_veterinarian_credentials(text, text, text) to authenticated;

create or replace function public.consume_ai_quota(
  p_feature text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer;
begin
  if v_user_id is null then return false; end if;
  if p_feature not in ('health_assistant','document_scan','vet_visit_copilot') then return false; end if;
  if p_limit < 1 or p_limit > 100 or p_window_seconds < 60 or p_window_seconds > 86400 then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_feature, 0));
  select count(*) into v_count
  from public.ai_usage_events
  where user_id = v_user_id and feature = p_feature
    and created_at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_limit then return false; end if;

  insert into public.ai_usage_events(user_id, feature) values (v_user_id, p_feature);
  delete from public.ai_usage_events where user_id = v_user_id and created_at < now() - interval '7 days';
  return true;
end;
$$;

revoke all on function public.consume_ai_quota(text, integer, integer) from public;
grant execute on function public.consume_ai_quota(text, integer, integer) to authenticated;

revoke all on table public.daily_check_ins, public.medication_plans, public.medication_doses,
  public.care_programs, public.care_measurements, public.vet_visits,
  public.record_verifications, public.pet_emergency_profiles from anon;
grant select, insert, update, delete on table public.daily_check_ins, public.medication_plans, public.medication_doses,
  public.care_programs, public.care_measurements, public.vet_visits,
  public.record_verifications, public.pet_emergency_profiles to authenticated;
revoke update, delete on table public.record_verifications from authenticated;
grant select, update on table public.document_extractions to authenticated;
revoke all on table public.subscription_access from anon;
revoke update, delete on table public.subscription_access from authenticated;
grant select, insert on table public.subscription_access to authenticated;
revoke all on table public.billing_webhook_events from anon, authenticated;
revoke all on table public.ai_usage_events from anon, authenticated;
revoke all on table public.veterinarian_profiles from anon, authenticated;
grant select on table public.veterinarian_profiles to authenticated;

commit;
