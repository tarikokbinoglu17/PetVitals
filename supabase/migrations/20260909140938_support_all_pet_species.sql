alter table public.pets drop constraint pets_species_check;
alter table public.pets add constraint pets_species_check check (species in ('cat','dog','bird','rabbit','reptile','fish','other'));
