import type {
  CreateHealthRecordInput,
  HealthRecord,
  UpdateHealthRecordInput,
} from '@/types/healthRecord';
import type { Database } from '@/types/database.types';

import { supabase } from './client';

type HealthRecordRow = Database['public']['Tables']['health_records']['Row'];

function mapRowToHealthRecord(row: HealthRecordRow): HealthRecord {
  return {
    id: row.id,
    petId: row.pet_id,
    type: row.type,
    title: row.title,
    description: row.description,
    recordDate: row.record_date,
    veterinarian: row.veterinarian,
    attachmentUrl: row.attachment_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listHealthRecordsForPet(petId: string): Promise<HealthRecord[]> {
  const { data, error } = await supabase
    .from('health_records')
    .select('*')
    .eq('pet_id', petId)
    .order('record_date', { ascending: false });
  if (error) throw error;
  return data.map(mapRowToHealthRecord);
}

export async function createHealthRecord(input: CreateHealthRecordInput): Promise<HealthRecord> {
  const { data, error } = await supabase
    .from('health_records')
    .insert({
      pet_id: input.petId,
      type: input.type,
      title: input.title,
      description: input.description,
      record_date: input.recordDate,
      veterinarian: input.veterinarian,
      attachment_url: input.attachmentUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRowToHealthRecord(data);
}

export async function updateHealthRecord(
  recordId: string,
  input: UpdateHealthRecordInput,
): Promise<HealthRecord> {
  const payload: Database['public']['Tables']['health_records']['Update'] = {};
  if (input.type !== undefined) payload.type = input.type;
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.recordDate !== undefined) payload.record_date = input.recordDate;
  if (input.veterinarian !== undefined) payload.veterinarian = input.veterinarian;
  if (input.attachmentUrl !== undefined) payload.attachment_url = input.attachmentUrl;

  const { data, error } = await supabase
    .from('health_records')
    .update(payload)
    .eq('id', recordId)
    .select()
    .single();
  if (error) throw error;
  return mapRowToHealthRecord(data);
}

export async function deleteHealthRecord(recordId: string): Promise<void> {
  const { error } = await supabase.from('health_records').delete().eq('id', recordId);
  if (error) throw error;
}
