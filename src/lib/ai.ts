import { supabase } from './supabase';
import type { SupportedLocale } from './globalization';

export type AssistantReply = {
  answer: string;
  disclaimer: string;
};

export type DocumentExtraction = {
  id: string;
  status: string;
  extracted_data: Record<string, unknown> | null;
  created_at: string;
};

export type ConfirmedDocumentEntity = {
  entityType: "vaccine" | "medication_plan" | "health_record";
  entityId: string;
};

export async function askPetHealthAssistant(
  petId: string,
  question: string,
  language: SupportedLocale = 'en',
): Promise<AssistantReply> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { data, error } = await supabase.functions.invoke('pet-health-assistant', {
    body: { petId, question, language },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as AssistantReply;
}

export async function scanPetDocument(petId: string, imageDataUrl: string) {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { data, error } = await supabase.functions.invoke('pet-document-scan', {
    body: { petId, imageDataUrl },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { extraction: DocumentExtraction; requiresConfirmation: boolean };
}

export async function confirmDocumentExtraction(
  extractionId: string,
  confirmedData: Record<string, unknown>,
): Promise<ConfirmedDocumentEntity> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { data, error } = await (supabase as any).rpc('confirm_document_extraction', {
    p_extraction_id: extractionId,
    p_confirmed_data: confirmedData,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.entity_type || !row?.entity_id) {
    throw new Error('Belge sağlık kaydına dönüştürülemedi.');
  }
  return {
    entityType: row.entity_type,
    entityId: String(row.entity_id),
  } as ConfirmedDocumentEntity;
}
