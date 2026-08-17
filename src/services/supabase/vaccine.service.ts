import type { Database } from '@/types/database.types';
import type { CreateVaccineInput, UpdateVaccineInput, VaccineRecord } from '@/types/vaccine';

import { supabase } from './client';

type VaccineRow = Database['public']['Tables']['vaccine_records']['Row'];

function mapRowToVaccine(row: VaccineRow): VaccineRecord {
  return {
    id: row.id,
    petId: row.pet_id,
    vaccineName: row.vaccine_name,
    vaccineType: row.vaccine_type,
    administeredDate: row.administered_date,
    nextDueDate: row.next_due_date,
    repeatIntervalDays: row.repeat_interval_days,
    veterinarian: row.veterinarian,
    notes: row.notes,
    attachmentUrl: row.attachment_url,
    notificationEnabled: row.notification_enabled,
    notificationIds: row.notification_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listVaccinesForPet(petId: string): Promise<VaccineRecord[]> {
  const { data, error } = await supabase
    .from('vaccine_records')
    .select('*')
    .eq('pet_id', petId)
    .order('administered_date', { ascending: false });
  if (error) throw error;
  return data.map(mapRowToVaccine);
}

export async function createVaccine(input: CreateVaccineInput): Promise<VaccineRecord> {
  const { data, error } = await supabase
    .from('vaccine_records')
    .insert({
      pet_id: input.petId,
      vaccine_name: input.vaccineName,
      vaccine_type: input.vaccineType,
      administered_date: input.administeredDate,
      next_due_date: input.nextDueDate,
      repeat_interval_days: input.repeatIntervalDays,
      veterinarian: input.veterinarian,
      notes: input.notes,
      attachment_url: input.attachmentUrl,
      notification_enabled: input.notificationEnabled,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRowToVaccine(data);
}

export async function updateVaccine(
  vaccineId: string,
  input: UpdateVaccineInput,
): Promise<VaccineRecord> {
  const payload: Database['public']['Tables']['vaccine_records']['Update'] = {};
  if (input.vaccineName !== undefined) payload.vaccine_name = input.vaccineName;
  if (input.vaccineType !== undefined) payload.vaccine_type = input.vaccineType;
  if (input.administeredDate !== undefined) payload.administered_date = input.administeredDate;
  if (input.nextDueDate !== undefined) payload.next_due_date = input.nextDueDate;
  if (input.repeatIntervalDays !== undefined)
    payload.repeat_interval_days = input.repeatIntervalDays;
  if (input.veterinarian !== undefined) payload.veterinarian = input.veterinarian;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.attachmentUrl !== undefined) payload.attachment_url = input.attachmentUrl;
  if (input.notificationEnabled !== undefined)
    payload.notification_enabled = input.notificationEnabled;

  const { data, error } = await supabase
    .from('vaccine_records')
    .update(payload)
    .eq('id', vaccineId)
    .select()
    .single();
  if (error) throw error;
  return mapRowToVaccine(data);
}

/** Persists the local-notification ids scheduled for this record, so reminders are never duplicated. */
export async function setVaccineNotificationIds(
  vaccineId: string,
  notificationIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from('vaccine_records')
    .update({ notification_ids: notificationIds })
    .eq('id', vaccineId);
  if (error) throw error;
}

export async function deleteVaccine(vaccineId: string): Promise<void> {
  const { error } = await supabase.from('vaccine_records').delete().eq('id', vaccineId);
  if (error) throw error;
}
