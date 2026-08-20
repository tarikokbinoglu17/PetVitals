create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'pet_owner'
    check (role in ('pet_owner', 'veterinarian')),
  language text not null default 'en'
    check (language in ('tr', 'en', 'de', 'es')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  gender text check (gender in ('male', 'female', 'unknown')),
  birth_date date,
  weight numeric,
  microchip_id text,
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vaccines (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  vaccine_name text not null,
  vaccine_type text,
  administered_date date,
  next_due_date date,
  repeat_interval_months integer
    check (repeat_interval_months is null or repeat_interval_months > 0),
  veterinarian text,
  notes text,
  document_url text,
  notifications_enabled boolean not null default true,
  reminder_30_days_id text,
  reminder_7_days_id text,
  reminder_1_day_id text,
  reminder_same_day_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null
    check (record_type in ('vet_visit', 'treatment', 'medication', 'allergy', 'other')),
  title text not null,
  description text,
  record_date date not null default current_date,
  veterinarian text,
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  vaccine_id uuid references public.vaccines(id) on delete cascade,
  title text not null,
  reminder_type text not null default 'custom'
    check (reminder_type in (
      'vaccine_30_days',
      'vaccine_7_days',
      'vaccine_1_day',
      'vaccine_same_day',
      'medication',
      'appointment',
      'custom'
    )),
  remind_at timestamptz not null,
  notification_id text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sent', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.vaccine_reminders (
  id uuid primary key default uuid_generate_v4(),
  vaccine_id uuid not null references public.vaccines(id) on delete cascade,
  reminder_type text not null
    check (reminder_type in ('30_days', '7_days', '1_day', 'due_day')),
  reminder_date timestamptz not null,
  notification_id text,
  status text default 'scheduled'
    check (status in ('scheduled', 'sent', 'cancelled')),
  created_at timestamptz default now()
);

create index if not exists pets_owner_id_idx on public.pets (owner_id);
create index if not exists vaccines_owner_id_idx on public.vaccines (owner_id);
create index if not exists vaccines_pet_id_idx on public.vaccines (pet_id);
create index if not exists vaccines_next_due_date_idx on public.vaccines (next_due_date);
create index if not exists health_records_owner_id_idx on public.health_records (owner_id);
create index if not exists health_records_pet_id_idx on public.health_records (pet_id);
create index if not exists reminders_owner_id_idx on public.reminders (owner_id);
create index if not exists reminders_pet_id_idx on public.reminders (pet_id);
create index if not exists reminders_vaccine_id_idx on public.reminders (vaccine_id);
create index if not exists reminders_remind_at_idx on public.reminders (remind_at);
create index if not exists vaccine_reminders_vaccine_id_idx on public.vaccine_reminders (vaccine_id);
create index if not exists vaccine_reminders_date_idx on public.vaccine_reminders (reminder_date);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

revoke all privileges on table
  public.profiles,
  public.pets,
  public.vaccines,
  public.health_records,
  public.reminders,
  public.vaccine_reminders
from public, anon, authenticated;

grant usage on schema public to authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.pets,
  public.vaccines,
  public.health_records,
  public.reminders,
  public.vaccine_reminders
to authenticated;

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.vaccines enable row level security;
alter table public.health_records enable row level security;
alter table public.reminders enable row level security;
alter table public.vaccine_reminders enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can view own pets" on public.pets;
drop policy if exists "Users can create own pets" on public.pets;
drop policy if exists "Users can update own pets" on public.pets;
drop policy if exists "Users can delete own pets" on public.pets;

create policy "Users can view own pets"
on public.pets for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create own pets"
on public.pets for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can update own pets"
on public.pets for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can delete own pets"
on public.pets for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Users can view own vaccines" on public.vaccines;
drop policy if exists "Users can create own vaccines" on public.vaccines;
drop policy if exists "Users can update own vaccines" on public.vaccines;
drop policy if exists "Users can delete own vaccines" on public.vaccines;
drop policy if exists "Users manage own pet vaccines" on public.vaccines;

create policy "Users can view own vaccines"
on public.vaccines for select
to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = vaccines.pet_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "Users can create own vaccines"
on public.vaccines for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = vaccines.pet_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "Users can update own vaccines"
on public.vaccines for update
to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = vaccines.pet_id
      and p.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = vaccines.pet_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "Users can delete own vaccines"
on public.vaccines for delete
to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = vaccines.pet_id
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can view own health records" on public.health_records;
drop policy if exists "Users can create own health records" on public.health_records;
drop policy if exists "Users can update own health records" on public.health_records;
drop policy if exists "Users can delete own health records" on public.health_records;
drop policy if exists "Users manage own pet health records" on public.health_records;

create policy "Users can view own health records"
on public.health_records for select
to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = health_records.pet_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "Users can create own health records"
on public.health_records for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = health_records.pet_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "Users can update own health records"
on public.health_records for update
to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = health_records.pet_id
      and p.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = health_records.pet_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "Users can delete own health records"
on public.health_records for delete
to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = health_records.pet_id
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can view own reminders" on public.reminders;
drop policy if exists "Users can create own reminders" on public.reminders;
drop policy if exists "Users can update own reminders" on public.reminders;
drop policy if exists "Users can delete own reminders" on public.reminders;

create policy "Users can view own reminders"
on public.reminders for select
to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = reminders.pet_id
      and p.owner_id = (select auth.uid())
  )
  and (
    vaccine_id is null
    or exists (
      select 1 from public.vaccines v
      where v.id = reminders.vaccine_id
        and v.pet_id = reminders.pet_id
        and v.owner_id = (select auth.uid())
    )
  )
);

create policy "Users can create own reminders"
on public.reminders for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = reminders.pet_id
      and p.owner_id = (select auth.uid())
  )
  and (
    vaccine_id is null
    or exists (
      select 1 from public.vaccines v
      where v.id = reminders.vaccine_id
        and v.pet_id = reminders.pet_id
        and v.owner_id = (select auth.uid())
    )
  )
);

create policy "Users can update own reminders"
on public.reminders for update
to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = reminders.pet_id
      and p.owner_id = (select auth.uid())
  )
  and (
    vaccine_id is null
    or exists (
      select 1 from public.vaccines v
      where v.id = reminders.vaccine_id
        and v.pet_id = reminders.pet_id
        and v.owner_id = (select auth.uid())
    )
  )
)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = reminders.pet_id
      and p.owner_id = (select auth.uid())
  )
  and (
    vaccine_id is null
    or exists (
      select 1 from public.vaccines v
      where v.id = reminders.vaccine_id
        and v.pet_id = reminders.pet_id
        and v.owner_id = (select auth.uid())
    )
  )
);

create policy "Users can delete own reminders"
on public.reminders for delete
to authenticated
using (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.pets p
    where p.id = reminders.pet_id
      and p.owner_id = (select auth.uid())
  )
  and (
    vaccine_id is null
    or exists (
      select 1 from public.vaccines v
      where v.id = reminders.vaccine_id
        and v.pet_id = reminders.pet_id
        and v.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users manage own vaccine reminders" on public.vaccine_reminders;

create policy "Users manage own vaccine reminders"
on public.vaccine_reminders for all
to authenticated
using (
  exists (
    select 1
    from public.vaccines v
    join public.pets p on p.id = v.pet_id
    where v.id = vaccine_reminders.vaccine_id
      and v.owner_id = (select auth.uid())
      and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.vaccines v
    join public.pets p on p.id = v.pet_id
    where v.id = vaccine_reminders.vaccine_id
      and v.owner_id = (select auth.uid())
      and p.owner_id = (select auth.uid())
  )
);

insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'pet-photos',
    'pet-photos',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  ),
  (
    'health-documents',
    'health-documents',
    false,
    20971520,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "PetVitals users can view own files" on storage.objects;
drop policy if exists "PetVitals users can upload own files" on storage.objects;
drop policy if exists "PetVitals users can update own files" on storage.objects;
drop policy if exists "PetVitals users can delete own files" on storage.objects;

create policy "PetVitals users can view own files"
on storage.objects for select
to authenticated
using (
  bucket_id in ('pet-photos', 'health-documents')
  and owner_id = (select auth.uid())::text
);

create policy "PetVitals users can upload own files"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('pet-photos', 'health-documents')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "PetVitals users can update own files"
on storage.objects for update
to authenticated
using (
  bucket_id in ('pet-photos', 'health-documents')
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id in ('pet-photos', 'health-documents')
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "PetVitals users can delete own files"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('pet-photos', 'health-documents')
  and owner_id = (select auth.uid())::text
);
