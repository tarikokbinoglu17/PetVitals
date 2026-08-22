import { supabase } from './supabase';

export type SmartHealthAlert = {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | string;
  title: string;
  message: string;
  status: string;
  detected_at: string;
};

export type HealthBrainAnswer = {
  answer: string;
  disclaimer?: string;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

export async function evaluateSmartHealthAlerts(petId: string): Promise<SmartHealthAlert[]> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('evaluate-smart-health-alerts', {
    body: { petId },
  });

  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));

  return Array.isArray(data?.alerts) ? data.alerts : [];
}

export async function askPetHealthBrain(
  petId: string,
  question: string,
): Promise<HealthBrainAnswer> {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    throw new Error('Question is required.');
  }

  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('pet-health-assistant', {
    body: { petId, question: trimmedQuestion },
  });

  if (error) throw error;
  if (data?.code === 'PRO_REQUIRED') {
    throw new Error('PetVitals Pro is required for AI Health Brain.');
  }
  if (data?.code === 'AI_NOT_CONFIGURED') {
    throw new Error('AI Health Brain is not configured yet.');
  }
  if (data?.error) throw new Error(String(data.error));
  if (typeof data?.answer !== 'string' || !data.answer.trim()) {
    throw new Error('AI Health Brain returned an empty response.');
  }

  return {
    answer: data.answer.trim(),
    disclaimer: typeof data.disclaimer === 'string' ? data.disclaimer : undefined,
  };
}
