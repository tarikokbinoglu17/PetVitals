-- Cover ownership and verifier foreign keys used by RLS and cleanup operations.
create index if not exists care_programs_owner_id_idx on public.care_programs(owner_id);
create index if not exists medication_plans_owner_id_idx on public.medication_plans(owner_id);
create index if not exists pet_emergency_profiles_owner_id_idx on public.pet_emergency_profiles(owner_id);
create index if not exists record_verifications_owner_id_idx on public.record_verifications(owner_id);
create index if not exists vet_visits_owner_id_idx on public.vet_visits(owner_id);
create index if not exists veterinarian_profiles_verified_by_idx on public.veterinarian_profiles(verified_by)
  where verified_by is not null;
