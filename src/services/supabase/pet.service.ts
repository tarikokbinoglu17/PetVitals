import type { Database } from '@/types/database.types';
import type { CreatePetInput, Pet, UpdatePetInput } from '@/types/pet';

import { supabase } from './client';

type PetRow = Database['public']['Tables']['pets']['Row'];

function mapRowToPet(row: PetRow): Pet {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    species: row.species as Pet['species'],
    breed: row.breed,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    weightKg: row.weight_kg,
    microchipId: row.microchip_id,
    photoUrl: row.photo_url,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyPets(ownerId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapRowToPet);
}

export async function getPet(petId: string): Promise<Pet> {
  const { data, error } = await supabase.from('pets').select('*').eq('id', petId).single();
  if (error) throw error;
  return mapRowToPet(data);
}

export async function createPet(ownerId: string, input: CreatePetInput): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .insert({
      owner_id: ownerId,
      name: input.name,
      species: input.species,
      breed: input.breed,
      gender: input.gender,
      date_of_birth: input.dateOfBirth,
      weight_kg: input.weightKg,
      microchip_id: input.microchipId,
      photo_url: input.photoUrl,
      description: input.description,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRowToPet(data);
}

export async function updatePet(petId: string, input: UpdatePetInput): Promise<Pet> {
  const payload: Database['public']['Tables']['pets']['Update'] = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.species !== undefined) payload.species = input.species;
  if (input.breed !== undefined) payload.breed = input.breed;
  if (input.gender !== undefined) payload.gender = input.gender;
  if (input.dateOfBirth !== undefined) payload.date_of_birth = input.dateOfBirth;
  if (input.weightKg !== undefined) payload.weight_kg = input.weightKg;
  if (input.microchipId !== undefined) payload.microchip_id = input.microchipId;
  if (input.photoUrl !== undefined) payload.photo_url = input.photoUrl;
  if (input.description !== undefined) payload.description = input.description;

  const { data, error } = await supabase
    .from('pets')
    .update(payload)
    .eq('id', petId)
    .select()
    .single();
  if (error) throw error;
  return mapRowToPet(data);
}

export async function deletePet(petId: string): Promise<void> {
  const { error } = await supabase.from('pets').delete().eq('id', petId);
  if (error) throw error;
}
