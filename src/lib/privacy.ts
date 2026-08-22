import { supabase } from './supabase';

function client() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  return supabase as any;
}

export async function exportUserData(userId: string) {
  const db = client();
  const [profile, pets, vaccines, healthRecords, reminders, weights, members, passports, documents] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).maybeSingle(),
    db.from('pets').select('*').eq('owner_id', userId),
    db.from('vaccines').select('*').eq('owner_id', userId),
    db.from('health_records').select('*').eq('owner_id', userId),
    db.from('reminders').select('*').eq('owner_id', userId),
    db.from('weight_entries').select('*').eq('owner_id', userId),
    db.from('pet_members').select('*').eq('owner_id', userId),
    db.from('passport_shares').select('id,pet_id,lost_mode,include_vaccines,include_allergies,include_medications,include_owner_contact,expires_at,revoked_at,created_at').eq('owner_id', userId),
    db.from('document_extractions').select('id,pet_id,status,extracted_data,confirmed_at,created_at').eq('owner_id', userId),
  ]);

  const firstError = [profile, pets, vaccines, healthRecords, reminders, weights, members, passports, documents].find(result => result.error)?.error;
  if (firstError) throw firstError;

  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    pets: pets.data ?? [],
    vaccines: vaccines.data ?? [],
    healthRecords: healthRecords.data ?? [],
    reminders: reminders.data ?? [],
    weights: weights.data ?? [],
    sharedAccess: members.data ?? [],
    passports: passports.data ?? [],
    documentExtractions: documents.data ?? [],
  }, null, 2);
}

export async function deleteCurrentAccount() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { data, error } = await supabase.functions.invoke('delete-account');
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  await supabase.auth.signOut();
}
