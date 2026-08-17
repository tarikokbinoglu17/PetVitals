-- PetVitals — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
--
-- Scope of this migration:
--   1. profiles       — one row per auth user (role, display info)
--   2. pets           — pets owned by a profile
--   3. vaccine_records — vaccine history for a pet
--   4. health_records  — vet visits / treatments / medications / allergies / other for a pet
--
-- Security model: Row Level Security (RLS) is the primary access-control layer.
-- Every table is owner-scoped, either directly (pets.owner_id) or transitively
-- through the owning pet (vaccine_records, health_records). No table can be
-- read or written by a user who isn't the owner — this is enforced in
-- Postgres itself, not just in application code.

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'pet_owner' check (role in ('pet_owner', 'veterinarian')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can only ever see and edit their own profile row. There is no
-- INSERT policy on purpose: profile rows are created exclusively by the
-- handle_new_user() trigger below (SECURITY DEFINER), so a client can never
-- insert an arbitrary profile row (e.g. to spoof another user's id or role).
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up, copying the
-- optional full_name/role passed in signUp({ options: { data: {...} } }).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'pet_owner')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. pets
-- ---------------------------------------------------------------------------

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  gender text not null default 'unknown' check (gender in ('male', 'female', 'unknown')),
  date_of_birth date,
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg > 0),
  microchip_id text,
  photo_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pets_owner_id_idx on public.pets (owner_id);

alter table public.pets enable row level security;

create policy "pets_select_own" on public.pets
  for select using (auth.uid() = owner_id);

create policy "pets_insert_own" on public.pets
  for insert with check (auth.uid() = owner_id);

create policy "pets_update_own" on public.pets
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "pets_delete_own" on public.pets
  for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 3. vaccine_records — health data, deliberately its own table (not mixed
--    with any future social/post tables) so health data access can always be
--    reasoned about independently of the social graph.
-- ---------------------------------------------------------------------------

create table public.vaccine_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  vaccine_name text not null,
  vaccine_type text not null default 'other' check (vaccine_type in ('core', 'non_core', 'other')),
  administered_date date not null,
  next_due_date date,
  repeat_interval_days integer check (repeat_interval_days is null or repeat_interval_days > 0),
  veterinarian text,
  notes text,
  attachment_url text,
  notification_enabled boolean not null default true,
  notification_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vaccine_records_pet_id_idx on public.vaccine_records (pet_id);
create index vaccine_records_next_due_date_idx on public.vaccine_records (next_due_date);

alter table public.vaccine_records enable row level security;

-- Ownership is transitive through pets: a user may only touch a vaccine
-- record if they own the pet it belongs to.
create policy "vaccine_records_select_own" on public.vaccine_records
  for select using (
    exists (select 1 from public.pets where pets.id = vaccine_records.pet_id and pets.owner_id = auth.uid())
  );

create policy "vaccine_records_insert_own" on public.vaccine_records
  for insert with check (
    exists (select 1 from public.pets where pets.id = vaccine_records.pet_id and pets.owner_id = auth.uid())
  );

create policy "vaccine_records_update_own" on public.vaccine_records
  for update using (
    exists (select 1 from public.pets where pets.id = vaccine_records.pet_id and pets.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.pets where pets.id = vaccine_records.pet_id and pets.owner_id = auth.uid())
  );

create policy "vaccine_records_delete_own" on public.vaccine_records
  for delete using (
    exists (select 1 from public.pets where pets.id = vaccine_records.pet_id and pets.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 4. health_records — vet visits, treatments, medications, allergies, other.
--    Same ownership model as vaccine_records.
-- ---------------------------------------------------------------------------

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  type text not null check (type in ('vet_visit', 'treatment', 'medication', 'allergy', 'other')),
  title text not null,
  description text,
  record_date date not null,
  veterinarian text,
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index health_records_pet_id_idx on public.health_records (pet_id);

alter table public.health_records enable row level security;

create policy "health_records_select_own" on public.health_records
  for select using (
    exists (select 1 from public.pets where pets.id = health_records.pet_id and pets.owner_id = auth.uid())
  );

create policy "health_records_insert_own" on public.health_records
  for insert with check (
    exists (select 1 from public.pets where pets.id = health_records.pet_id and pets.owner_id = auth.uid())
  );

create policy "health_records_update_own" on public.health_records
  for update using (
    exists (select 1 from public.pets where pets.id = health_records.pet_id and pets.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.pets where pets.id = health_records.pet_id and pets.owner_id = auth.uid())
  );

create policy "health_records_delete_own" on public.health_records
  for delete using (
    exists (select 1 from public.pets where pets.id = health_records.pet_id and pets.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.pets
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.vaccine_records
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.health_records
  for each row execute function public.set_updated_at();
