import { supabase } from './supabase';
import type { NearbyPlace } from './nearbyServices';

function db() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  return supabase as any;
}

export async function loadFavoritePlaceIds(userId: string): Promise<string[]> {
  const { data, error } = await db().from('pet_service_favorites').select('place_id').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row: any) => String(row.place_id));
}

export async function setPlaceFavorite(userId: string, place: NearbyPlace, favorite: boolean) {
  if (favorite) {
    const { error } = await db().from('pet_service_favorites').upsert({
      user_id: userId,
      place_id: place.id,
      kind: place.kind === 'petshop' ? 'petshop' : 'veterinary',
      name: place.name,
      address: place.address || null,
      latitude: place.latitude,
      longitude: place.longitude,
      phone: place.phone,
      maps_url: place.mapsUrl,
    }, { onConflict: 'user_id,place_id' });
    if (error) throw error;
    return;
  }
  const { error } = await db().from('pet_service_favorites').delete().eq('user_id', userId).eq('place_id', place.id);
  if (error) throw error;
}

export async function createAppointmentRequest(input: {
  userId: string;
  petId?: string;
  place: NearbyPlace;
  preferredTime?: string;
  note?: string;
}) {
  const { data, error } = await db().from('vet_appointment_requests').insert({
    user_id: input.userId,
    pet_id: input.petId || null,
    place_id: input.place.id,
    clinic_name: input.place.name,
    clinic_phone: input.place.phone,
    preferred_time: input.preferredTime?.trim() || null,
    note: input.note?.trim() || null,
    status: 'draft',
  }).select('id').single();
  if (error) throw error;
  return String(data.id);
}

export async function markAppointmentRequestSent(userId: string, requestId: string) {
  const { error } = await db().from('vet_appointment_requests').update({ status: 'sent' }).eq('user_id', userId).eq('id', requestId);
  if (error) throw error;
}
