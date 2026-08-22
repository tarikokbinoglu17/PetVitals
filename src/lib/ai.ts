import { supabase } from './supabase';

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

export async function askPetHealthAssistant(petId: string, question: string): Promise<AssistantReply> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { data, error } = await supabase.functions.invoke('pet-health-assistant', {
    body: { petId, question },
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
