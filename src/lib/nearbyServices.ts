import { supabase } from './supabase';

export type NearbyCategory = 'all' | 'veterinary' | 'petshop';

export type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  kind: 'veterinary' | 'petshop' | 'other';
  rating: number | null;
  ratingCount: number | null;
  openNow: boolean | null;
  weekdayDescriptions: string[];
  mapsUrl: string | null;
  phone: string | null;
  distanceMeters: number | null;
};

export async function findNearbyPetServices(input: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  category?: NearbyCategory;
  openNowOnly?: boolean;
  languageCode?: string;
}): Promise<NearbyPlace[]> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { data, error } = await supabase.functions.invoke('nearby-pet-services', { body: input });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return Array.isArray(data?.places) ? data.places : [];
}
