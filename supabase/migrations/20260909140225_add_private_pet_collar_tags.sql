create table public.pet_tags (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  contact_phone text not null check (contact_phone ~ '^\+[1-9][0-9]{6,14}$'),
  contact_name text not null default '' check (char_length(contact_name) <= 80),
  finder_message text not null default '' check (char_length(finder_message) <= 400),
  lost_mode boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index pet_tags_owner_id_idx on public.pet_tags(owner_id);
alter table public.pet_tags enable row level security;
revoke all on public.pet_tags from anon;
grant select,insert,update,delete on public.pet_tags to authenticated;
grant all on public.pet_tags to service_role;
create policy "Owners manage collars of their own pets" on public.pet_tags
  for all to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())
  ))
  with check ((select auth.uid()) = owner_id and exists (
    select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())
  ));
comment on table public.pet_tags is 'Owner-managed permanent collar links. Public access is only through the token-authenticated public-pet-tag function, which returns explicitly shared fields.';
