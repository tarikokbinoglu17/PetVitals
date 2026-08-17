/**
 * Common species presets for quick selection. `other` covers any species not
 * listed here so the data model is never limited to dogs/cats.
 */
export type PetSpecies =
  'dog' | 'cat' | 'bird' | 'rabbit' | 'rodent' | 'reptile' | 'fish' | 'horse' | 'other';

export type PetGender = 'male' | 'female' | 'unknown';

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  gender: PetGender;
  dateOfBirth: string | null;
  weightKg: number | null;
  microchipId: string | null;
  photoUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreatePetInput = Omit<Pet, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export type UpdatePetInput = Partial<CreatePetInput>;
