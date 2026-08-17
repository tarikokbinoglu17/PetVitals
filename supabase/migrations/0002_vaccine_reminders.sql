-- PetVitals — vaccine reminders
-- Additive migration: run this AFTER 0001_init.sql. It does not touch
-- profiles/pets/health_records, and only removes one now-redundant column
-- from vaccine_records (see below).
--
-- Adds a dedicated `vaccine_reminders` table so each reminder instance
-- (30/7/1/0 days before a vaccine's next_due_date) is its own row with its
-- own status and its own local/push notification id. This replaces the
-- earlier `vaccine_records.notification_ids` array, which could not track
-- per-offset status (sent/cancelled) or be queried for "what's due soon
-- across all of a user's pets".

-- ---------------------------------------------------------------------------
-- vaccine_reminders
-- ---------------------------------------------------------------------------

create table public.vaccine_reminders (
  id uuid primary key default gen_random_uuid(),
  vaccine_id uuid not null references public.vaccine_records (id) on delete cascade,
  offset_days integer not null check (offset_days >= 0),
  scheduled_date date not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  -- Set once a local/push notification is actually scheduled for this row.
  -- Scheduling itself is a separate, not-yet-built notification service —
  -- this column just gives it somewhere to record what it did.
  notification_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vaccine_id, offset_days)
);

create index vaccine_reminders_vaccine_id_idx on public.vaccine_reminders (vaccine_id);
create index vaccine_reminders_scheduled_date_idx on public.vaccine_reminders (scheduled_date);

alter table public.vaccine_reminders enable row level security;

-- Same transitive-ownership pattern as vaccine_records: a user may only
-- touch a reminder if they own the pet the underlying vaccine belongs to.
create policy "vaccine_reminders_select_own" on public.vaccine_reminders
  for select using (
    exists (
      select 1
      from public.vaccine_records
      join public.pets on pets.id = vaccine_records.pet_id
      where vaccine_records.id = vaccine_reminders.vaccine_id
        and pets.owner_id = auth.uid()
    )
  );

create policy "vaccine_reminders_insert_own" on public.vaccine_reminders
  for insert with check (
    exists (
      select 1
      from public.vaccine_records
      join public.pets on pets.id = vaccine_records.pet_id
      where vaccine_records.id = vaccine_reminders.vaccine_id
        and pets.owner_id = auth.uid()
    )
  );

create policy "vaccine_reminders_update_own" on public.vaccine_reminders
  for update using (
    exists (
      select 1
      from public.vaccine_records
      join public.pets on pets.id = vaccine_records.pet_id
      where vaccine_records.id = vaccine_reminders.vaccine_id
        and pets.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.vaccine_records
      join public.pets on pets.id = vaccine_records.pet_id
      where vaccine_records.id = vaccine_reminders.vaccine_id
        and pets.owner_id = auth.uid()
    )
  );

create policy "vaccine_reminders_delete_own" on public.vaccine_reminders
  for delete using (
    exists (
      select 1
      from public.vaccine_records
      join public.pets on pets.id = vaccine_records.pet_id
      where vaccine_records.id = vaccine_reminders.vaccine_id
        and pets.owner_id = auth.uid()
    )
  );

create trigger set_updated_at before update on public.vaccine_reminders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vaccine_records cleanup: superseded by vaccine_reminders rows above.
-- ---------------------------------------------------------------------------

alter table public.vaccine_records drop column if exists notification_ids;
