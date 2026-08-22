-- PetVitals global platform extensions.
-- Idempotent where practical so a fresh project can reproduce the production schema.

create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  weight numeric(8,2) not null check (weight > 0),
  measured_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.pet_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  invite_email text,
  role text not null check (role in ('caregiver','veterinarian','viewer')),
  can_edit boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (member_user_id is not null or invite_email is not null)
);

create table if not exists public.passport_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  token_hash text not null unique,
  lost_mode boolean not null default false,
  include_vaccines boolean not null default true,
  include_allergies boolean not null default true,
  include_medications boolean not null default true,
  include_owner_contact boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending','processing','needs_review','confirmed','failed')),
  extracted_data jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pro_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  provider text,
  product_id text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_service_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  kind text not null check (kind in ('veterinarian','pet_store')),
  name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  phone text,
  maps_url text,
  created_at timestamptz not null default now(),
  unique(user_id, place_id)
);

create table if not exists public.vet_appointment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  place_id text not null,
  clinic_name text not null,
  clinic_phone text,
  requested_at timestamptz not null default now(),
  preferred_time text,
  note text,
  status text not null default 'draft' check (status in ('draft','sent','confirmed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.pet_life_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  entry_type text not null check (entry_type in ('food','water','activity','sleep','grooming','parasite','mood','custom')),
  value_numeric numeric,
  value_text text,
  unit text,
  occurred_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  check (value_numeric is not null or value_text is not null or notes is not null)
);

create table if not exists public.smart_health_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high')),
  title text not null,
  message text not null,
  status text not null default 'active' check (status in ('active','dismissed','resolved')),
  source_key text not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(owner_id, source_key)
);

alter table public.weight_entries enable row level security;
alter table public.pet_members enable row level security;
alter table public.passport_shares enable row level security;
alter table public.document_extractions enable row level security;
alter table public.pro_entitlements enable row level security;
alter table public.pet_service_favorites enable row level security;
alter table public.vet_appointment_requests enable row level security;
alter table public.pet_life_entries enable row level security;
alter table public.smart_health_alerts enable row level security;

-- Recreate policies with stable names when missing.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='weight_entries' and policyname='Owners manage own weight entries') then
    create policy "Owners manage own weight entries" on public.weight_entries for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='passport_shares' and policyname='Owners manage own passport shares') then
    create policy "Owners manage own passport shares" on public.passport_shares for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='document_extractions' and policyname='Owners manage own document extractions') then
    create policy "Owners manage own document extractions" on public.document_extractions for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pro_entitlements' and policyname='Users view own entitlements') then
    create policy "Users view own entitlements" on public.pro_entitlements for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pet_life_entries' and policyname='Owners manage own life entries') then
    create policy "Owners manage own life entries" on public.pet_life_entries for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='smart_health_alerts' and policyname='Owners manage own smart alerts') then
    create policy "Owners manage own smart alerts" on public.smart_health_alerts for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pet_service_favorites' and policyname='Users manage own service favorites') then
    create policy "Users manage own service favorites" on public.pet_service_favorites for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vet_appointment_requests' and policyname='Users manage own appointment requests') then
    create policy "Users manage own appointment requests" on public.vet_appointment_requests for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
end $$;

create index if not exists weight_entries_pet_date_idx on public.weight_entries (pet_id, measured_at desc);
create index if not exists weight_entries_owner_idx on public.weight_entries (owner_id);
create index if not exists pet_members_pet_idx on public.pet_members (pet_id);
create index if not exists pet_members_member_idx on public.pet_members (member_user_id) where member_user_id is not null;
create index if not exists pet_members_owner_idx on public.pet_members (owner_id);
create index if not exists passport_shares_pet_idx on public.passport_shares (pet_id);
create index if not exists passport_shares_owner_idx on public.passport_shares (owner_id);
create index if not exists document_extractions_owner_idx on public.document_extractions (owner_id, created_at desc);
create index if not exists document_extractions_pet_idx on public.document_extractions (pet_id) where pet_id is not null;
create index if not exists pet_service_favorites_user_idx on public.pet_service_favorites (user_id);
create index if not exists vet_appointment_requests_user_idx on public.vet_appointment_requests (user_id, created_at desc);
create index if not exists vet_appointment_requests_pet_idx on public.vet_appointment_requests (pet_id) where pet_id is not null;
create index if not exists pet_life_entries_pet_date_idx on public.pet_life_entries (pet_id, occurred_at desc);
create index if not exists pet_life_entries_owner_idx on public.pet_life_entries (owner_id);
create index if not exists smart_health_alerts_pet_status_idx on public.smart_health_alerts (pet_id, status, detected_at desc);
create index if not exists smart_health_alerts_owner_idx on public.smart_health_alerts (owner_id);
