create extension if not exists pgcrypto;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  birth_date date,
  weight numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  title text not null,
  category text not null,
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.health_records
  add column if not exists vaccine_type text,
  add column if not exists administered_date date,
  add column if not exists next_due_date date,
  add column if not exists repeat_interval_months integer,
  add column if not exists veterinarian text,
  add column if not exists attachment_url text,
  add column if not exists notification_enabled boolean not null default true,
  add column if not exists notification_status text not null default 'disabled',
  add column if not exists notification_ids text[] not null default '{}'::text[];

alter table public.health_records
  drop constraint if exists health_records_repeat_interval_months_check,
  add constraint health_records_repeat_interval_months_check
    check (repeat_interval_months is null or repeat_interval_months between 1 and 120),
  drop constraint if exists health_records_notification_status_check,
  add constraint health_records_notification_status_check
    check (notification_status in ('disabled', 'pending', 'scheduled', 'denied', 'failed', 'no_future_dates'));

create index if not exists pets_user_id_idx on public.pets(user_id);
create index if not exists health_records_user_id_idx on public.health_records(user_id);
create index if not exists health_records_pet_id_idx on public.health_records(pet_id);
create index if not exists health_records_next_due_date_idx on public.health_records(next_due_date);

alter table public.pets enable row level security;
alter table public.health_records enable row level security;

-- Data API access is explicit for projects using the secure 2026 defaults.
-- Signed-out clients receive no table privileges; signed-in clients are still
-- restricted to their own rows by the RLS policies below.
revoke all on table public.pets, public.health_records from anon;
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on table public.pets, public.health_records to authenticated, service_role;

drop policy if exists pets_owner_select on public.pets;
create policy pets_owner_select on public.pets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists pets_owner_insert on public.pets;
create policy pets_owner_insert on public.pets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists pets_owner_update on public.pets;
create policy pets_owner_update on public.pets
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists pets_owner_delete on public.pets;
create policy pets_owner_delete on public.pets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists health_records_owner_select on public.health_records;
create policy health_records_owner_select on public.health_records
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists health_records_owner_insert on public.health_records;
create policy health_records_owner_insert on public.health_records
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.pets
      where pets.id = health_records.pet_id
        and pets.user_id = (select auth.uid())
    )
  );

drop policy if exists health_records_owner_update on public.health_records;
create policy health_records_owner_update on public.health_records
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.pets
      where pets.id = health_records.pet_id
        and pets.user_id = (select auth.uid())
    )
  );

drop policy if exists health_records_owner_delete on public.health_records;
create policy health_records_owner_delete on public.health_records
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
