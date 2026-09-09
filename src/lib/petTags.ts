import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { isValidContactPhone, normalizePhone } from './petIdentity';

export type PetTag = {
  id: string; pet_id: string; owner_id: string; token: string;
  contact_phone: string; contact_name: string; finder_message: string;
  lost_mode: boolean; enabled: boolean; created_at: string;
};
export type TagDraft = Pick<PetTag, 'contact_phone' | 'contact_name' | 'finder_message' | 'lost_mode'>;
export type PublicPetTag = {
  name: string; species: string; breed: string; contactName: string;
  contactPhone: string; finderMessage: string; lostMode: boolean;
};
const key = (petId: string) => `@petcookiego/demo-collar/${petId}`;

export async function loadPetTag(petId: string, demoMode: boolean, ownerId?: string): Promise<PetTag | null> {
  if (demoMode) {
    const value = await AsyncStorage.getItem(key(petId));
    return value ? JSON.parse(value) : null;
  }
  if (!supabase || !ownerId) throw new Error('SIGN_IN_REQUIRED');
  const { data, error } = await supabase.from('pet_tags').select('*')
    .eq('pet_id', petId).eq('owner_id', ownerId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePetTag(petId: string, draft: TagDraft, demoMode: boolean, ownerId?: string, existing?: PetTag | null): Promise<PetTag> {
  if (!isValidContactPhone(draft.contact_phone)) throw new Error('INVALID_PHONE');
  const values = { ...draft, contact_phone: normalizePhone(draft.contact_phone), contact_name: draft.contact_name.trim(), finder_message: draft.finder_message.trim() };
  if (values.contact_name.length > 80 || values.finder_message.length > 400) throw new Error('INVALID_DETAILS');
  if (demoMode) {
    const tag: PetTag = { id: `demo-${petId}`, pet_id: petId, owner_id: 'demo', token: '', enabled: true, created_at: new Date().toISOString(), ...existing, ...values };
    await AsyncStorage.setItem(key(petId), JSON.stringify(tag));
    return tag;
  }
  if (!supabase || !ownerId) throw new Error('SIGN_IN_REQUIRED');
  // Updates never replace a token: printed QR codes remain valid.
  const query = existing
    ? supabase.from('pet_tags').update(values).eq('id', existing.id).eq('pet_id', petId).eq('owner_id', ownerId)
    : supabase.from('pet_tags').insert({ ...values, pet_id: petId, owner_id: ownerId });
  const { data, error } = await query.select('*').single();
  if (error || !data) throw error ?? new Error('TAG_NOT_SAVED');
  return data;
}

export async function setPetTagEnabled(tag: PetTag, enabled: boolean, demoMode: boolean, ownerId?: string): Promise<PetTag> {
  if (demoMode) {
    const next = { ...tag, enabled };
    await AsyncStorage.setItem(key(tag.pet_id), JSON.stringify(next));
    return next;
  }
  if (!supabase || !ownerId) throw new Error('SIGN_IN_REQUIRED');
  const { data, error } = await supabase.from('pet_tags').update({ enabled })
    .eq('id', tag.id).eq('owner_id', ownerId).select('*').single();
  if (error || !data) throw error ?? new Error('TAG_NOT_SAVED');
  return data;
}
