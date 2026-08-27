import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { SupportedLocale } from './globalization';

export type CheckInMetric = 'appetite' | 'waterIntake' | 'stoolQuality' | 'energy' | 'pain' | 'mood';
export type EmergencyRedFlag =
  | 'breathing_difficulty'
  | 'collapse'
  | 'seizure'
  | 'repeated_vomiting'
  | 'uncontrolled_bleeding'
  | 'possible_poisoning';

export type DailyCheckIn = {
  id: string;
  clientEventId: string;
  petId: string;
  observedAt: string;
  appetite: number;
  waterIntake: number;
  stoolQuality: number;
  energy: number;
  pain: number;
  mood: number;
  redFlags: EmergencyRedFlag[];
  speciesMetrics: Record<string, number | string | boolean>;
  notes?: string;
  queued?: boolean;
};

export type MedicationPlan = {
  id: string;
  petId: string;
  medicationName: string;
  dosageText: string;
  instructions?: string;
  scheduleTimes: string[];
  startDate: string;
  endDate?: string;
  stockQuantity?: number;
  stockUnit?: string;
  refillThreshold?: number;
  prescribingVeterinarian?: string;
  verificationStatus: 'owner_entered' | 'pending' | 'vet_verified' | 'rejected';
  active: boolean;
};

export type MedicationDose = {
  id: string;
  clientEventId: string;
  petId: string;
  medicationPlanId: string;
  plannedAt: string;
  actualAt?: string;
  status: 'taken' | 'missed' | 'skipped';
  stockAfter?: number;
  notes?: string;
  queued?: boolean;
};

export type CareProgram = {
  id: string;
  petId: string;
  conditionKey: 'kidney' | 'diabetes' | 'epilepsy' | 'heart' | 'allergy' | 'senior' | 'other';
  label: string;
  status: 'active' | 'paused' | 'completed';
  targets: Record<string, unknown>;
  notes?: string;
  verificationStatus: 'owner_entered' | 'pending' | 'vet_verified' | 'rejected';
  startedAt: string;
};

export type CareMeasurement = {
  id: string;
  clientEventId: string;
  petId: string;
  programId: string;
  metricType: string;
  valueNumeric?: number;
  valueText?: string;
  unit?: string;
  occurredAt: string;
  notes?: string;
  queued?: boolean;
};

export type VetVisit = {
  id: string;
  petId: string;
  clinicName?: string;
  veterinarian?: string;
  visitAt: string;
  recordingConsent: boolean;
  audioStoragePath?: string;
  transcript?: string;
  summary?: VetVisitSummary;
  status: 'draft' | 'processing' | 'needs_review' | 'confirmed' | 'failed';
};

export type VetVisitSummary = {
  reason?: string;
  observations?: string[];
  diagnoses?: string[];
  medications?: Array<{ name: string; dosage: string; instructions: string }>;
  tests?: string[];
  followUps?: Array<{ action: string; dueDate?: string }>;
  ownerQuestions?: string[];
  warnings?: string[];
};

export type EmergencyProfile = {
  petId: string;
  bloodType?: string;
  emergencyVetName?: string;
  emergencyVetPhone?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  safetyNotes?: string;
};

export type CareJourneySnapshot = {
  checkIns: DailyCheckIn[];
  medicationPlans: MedicationPlan[];
  medicationDoses: MedicationDose[];
  programs: CareProgram[];
  measurements: CareMeasurement[];
  visits: VetVisit[];
  emergencyProfile?: EmergencyProfile;
  queuedCount: number;
};

type OfflineMutation = {
  id: string;
  userId: string;
  table: 'daily_check_ins' | 'medication_doses' | 'care_measurements';
  payload: Record<string, unknown>;
  createdAt: string;
};

const DEMO_KEY = '@petvitals/care-journey/v1';
const QUEUE_PREFIX = '@petvitals/care-queue/v1';
const CACHE_PREFIX = '@petvitals/care-cache/v1';
const MS_PER_DAY = 86_400_000;

const emptySnapshot = (): CareJourneySnapshot => ({
  checkIns: [], medicationPlans: [], medicationDoses: [], programs: [], measurements: [], visits: [], queuedCount: 0,
});

function db() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  return supabase as any;
}

export function createClientEventId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function isNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /network|fetch|timeout|offline|internet|connection/i.test(message);
}

function queueKey(userId: string) { return `${QUEUE_PREFIX}/${userId}`; }
function cacheKey(userId: string, petId: string) { return `${CACHE_PREFIX}/${userId}/${petId}`; }

async function readQueue(userId: string): Promise<OfflineMutation[]> {
  try { return JSON.parse((await AsyncStorage.getItem(queueKey(userId))) ?? '[]'); }
  catch { return []; }
}

async function addToQueue(mutation: OfflineMutation) {
  const current = await readQueue(mutation.userId);
  if (!current.some(item => item.id === mutation.id)) current.push(mutation);
  await AsyncStorage.setItem(queueKey(mutation.userId), JSON.stringify(current.slice(-250)));
}

async function upsertOrQueue(userId: string, table: OfflineMutation['table'], payload: Record<string, unknown>) {
  try {
    const { error } = await db().from(table).upsert(payload, { onConflict: 'owner_id,client_event_id', ignoreDuplicates: true });
    if (error) throw error;
    return false;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    await addToQueue({ id: String(payload.client_event_id), userId, table, payload, createdAt: new Date().toISOString() });
    return true;
  }
}

export async function flushCareQueue(userId: string) {
  if (!supabase) return 0;
  const queued = await readQueue(userId);
  if (!queued.length) return 0;
  const remaining: OfflineMutation[] = [];
  for (const mutation of queued) {
    try {
      const { error } = await db().from(mutation.table).upsert(mutation.payload, { onConflict: 'owner_id,client_event_id', ignoreDuplicates: true });
      if (error) throw error;
    } catch (error) {
      remaining.push(mutation);
      if (isNetworkError(error)) remaining.push(...queued.slice(queued.indexOf(mutation) + 1));
      if (isNetworkError(error)) break;
    }
  }
  await AsyncStorage.setItem(queueKey(userId), JSON.stringify(remaining));
  return queued.length - remaining.length;
}

function mapCheckIn(row: any): DailyCheckIn {
  return {
    id: row.id, clientEventId: row.client_event_id, petId: row.pet_id, observedAt: row.observed_at,
    appetite: row.appetite, waterIntake: row.water_intake, stoolQuality: row.stool_quality,
    energy: row.energy, pain: row.pain, mood: row.mood, redFlags: row.red_flags ?? [],
    speciesMetrics: row.species_metrics ?? {}, notes: row.notes ?? undefined,
  };
}

function mapMedicationPlan(row: any): MedicationPlan {
  return {
    id: row.id, petId: row.pet_id, medicationName: row.medication_name, dosageText: row.dosage_text,
    instructions: row.instructions ?? undefined, scheduleTimes: Array.isArray(row.schedule_times) ? row.schedule_times : [],
    startDate: row.start_date, endDate: row.end_date ?? undefined,
    stockQuantity: row.stock_quantity == null ? undefined : Number(row.stock_quantity), stockUnit: row.stock_unit ?? undefined,
    refillThreshold: row.refill_threshold == null ? undefined : Number(row.refill_threshold),
    prescribingVeterinarian: row.prescribing_veterinarian ?? undefined,
    verificationStatus: row.verification_status, active: row.active,
  };
}

function mapDose(row: any): MedicationDose {
  return {
    id: row.id, clientEventId: row.client_event_id, petId: row.pet_id, medicationPlanId: row.medication_plan_id,
    plannedAt: row.planned_at, actualAt: row.actual_at ?? undefined, status: row.status,
    stockAfter: row.stock_after == null ? undefined : Number(row.stock_after), notes: row.notes ?? undefined,
  };
}

function mapProgram(row: any): CareProgram {
  return {
    id: row.id, petId: row.pet_id, conditionKey: row.condition_key, label: row.label, status: row.status,
    targets: row.targets ?? {}, notes: row.notes ?? undefined, verificationStatus: row.verification_status,
    startedAt: row.started_at,
  };
}

function mapMeasurement(row: any): CareMeasurement {
  return {
    id: row.id, clientEventId: row.client_event_id, petId: row.pet_id, programId: row.program_id,
    metricType: row.metric_type, valueNumeric: row.value_numeric == null ? undefined : Number(row.value_numeric),
    valueText: row.value_text ?? undefined, unit: row.unit ?? undefined, occurredAt: row.occurred_at,
    notes: row.notes ?? undefined,
  };
}

function mapVisit(row: any): VetVisit {
  return {
    id: row.id, petId: row.pet_id, clinicName: row.clinic_name ?? undefined,
    veterinarian: row.veterinarian ?? undefined, visitAt: row.visit_at,
    recordingConsent: row.recording_consent, audioStoragePath: row.audio_storage_path ?? undefined,
    transcript: row.transcript ?? undefined, summary: row.summary ?? undefined, status: row.status,
  };
}

function demoSeed(petId: string): CareJourneySnapshot {
  const checkIns: DailyCheckIn[] = Array.from({ length: 14 }, (_, index) => {
    const observedAt = new Date(Date.now() - (13 - index) * MS_PER_DAY).toISOString();
    return {
      id: `demo-check-${index}`, clientEventId: `demo-check-${index}`, petId, observedAt,
      appetite: index === 13 ? 2 : 4, waterIntake: 3, stoolQuality: 4,
      energy: index === 13 ? 2 : 4, pain: index === 13 ? 2 : 0, mood: index === 13 ? 3 : 4,
      redFlags: [], speciesMetrics: {}, notes: index === 13 ? 'Bugün daha sakin.' : undefined,
    };
  });
  const plan: MedicationPlan = {
    id: 'demo-med-1', petId, medicationName: 'Örnek ilaç', dosageText: 'Veterinerin belirlediği doz',
    instructions: 'Demo kaydıdır.', scheduleTimes: ['09:00', '21:00'], startDate: new Date().toISOString().slice(0, 10),
    stockQuantity: 8, stockUnit: 'tablet', refillThreshold: 5, verificationStatus: 'owner_entered', active: true,
  };
  return { ...emptySnapshot(), checkIns, medicationPlans: [plan] };
}

async function loadDemo(petId: string) {
  try {
    const all = JSON.parse((await AsyncStorage.getItem(DEMO_KEY)) ?? '{}') as Record<string, CareJourneySnapshot>;
    return all[petId] ?? demoSeed(petId);
  } catch { return demoSeed(petId); }
}

async function saveDemo(petId: string, snapshot: CareJourneySnapshot) {
  let all: Record<string, CareJourneySnapshot> = {};
  try { all = JSON.parse((await AsyncStorage.getItem(DEMO_KEY)) ?? '{}'); } catch {}
  all[petId] = snapshot;
  await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(all));
}

export async function loadCareJourney(userId: string | undefined, petId: string, demoMode: boolean): Promise<CareJourneySnapshot> {
  if (demoMode || !userId || !supabase) return loadDemo(petId);
  await flushCareQueue(userId);
  try {
    const client = db();
    const [checkIns, plans, doses, programs, measurements, visits, emergency, queued] = await Promise.all([
      client.from('daily_check_ins').select('*').eq('pet_id', petId).order('observed_at', { ascending: false }).limit(120),
      client.from('medication_plans').select('*').eq('pet_id', petId).order('created_at', { ascending: false }),
      client.from('medication_doses').select('*').eq('pet_id', petId).order('planned_at', { ascending: false }).limit(180),
      client.from('care_programs').select('*').eq('pet_id', petId).order('created_at', { ascending: false }),
      client.from('care_measurements').select('*').eq('pet_id', petId).order('occurred_at', { ascending: false }).limit(180),
      client.from('vet_visits').select('*').eq('pet_id', petId).order('visit_at', { ascending: false }).limit(30),
      client.from('pet_emergency_profiles').select('*').eq('pet_id', petId).maybeSingle(),
      readQueue(userId),
    ]);
    const error = checkIns.error ?? plans.error ?? doses.error ?? programs.error ?? measurements.error ?? visits.error ?? emergency.error;
    if (error) throw error;
    const snapshot: CareJourneySnapshot = {
      checkIns: (checkIns.data ?? []).map(mapCheckIn), medicationPlans: (plans.data ?? []).map(mapMedicationPlan),
      medicationDoses: (doses.data ?? []).map(mapDose), programs: (programs.data ?? []).map(mapProgram),
      measurements: (measurements.data ?? []).map(mapMeasurement), visits: (visits.data ?? []).map(mapVisit),
      emergencyProfile: emergency.data ? {
        petId: emergency.data.pet_id, bloodType: emergency.data.blood_type ?? undefined,
        emergencyVetName: emergency.data.emergency_vet_name ?? undefined,
        emergencyVetPhone: emergency.data.emergency_vet_phone ?? undefined,
        insuranceProvider: emergency.data.insurance_provider ?? undefined,
        policyNumber: emergency.data.policy_number ?? undefined, safetyNotes: emergency.data.safety_notes ?? undefined,
      } : undefined,
      queuedCount: queued.length,
    };
    await AsyncStorage.setItem(cacheKey(userId, petId), JSON.stringify(snapshot));
    return snapshot;
  } catch (error) {
    const cached = await AsyncStorage.getItem(cacheKey(userId, petId));
    if (cached && isNetworkError(error)) return { ...JSON.parse(cached), queuedCount: (await readQueue(userId)).length };
    throw error;
  }
}

export async function saveDailyCheckIn(input: {
  userId?: string; petId: string; demoMode: boolean; appetite: number; waterIntake: number;
  stoolQuality: number; energy: number; pain: number; mood: number; redFlags?: EmergencyRedFlag[];
  speciesMetrics?: Record<string, number | string | boolean>; notes?: string;
}) {
  const clientEventId = createClientEventId('checkin');
  const observedAt = new Date().toISOString();
  const item: DailyCheckIn = {
    id: clientEventId, clientEventId, petId: input.petId, observedAt, appetite: input.appetite,
    waterIntake: input.waterIntake, stoolQuality: input.stoolQuality, energy: input.energy,
    pain: input.pain, mood: input.mood, redFlags: input.redFlags ?? [], speciesMetrics: input.speciesMetrics ?? {},
    notes: input.notes?.trim() || undefined,
  };
  if (input.demoMode || !input.userId || !supabase) {
    const snapshot = await loadDemo(input.petId); snapshot.checkIns = [item, ...snapshot.checkIns]; await saveDemo(input.petId, snapshot); return { queued: false };
  }
  const queued = await upsertOrQueue(input.userId, 'daily_check_ins', {
    client_event_id: clientEventId, owner_id: input.userId, pet_id: input.petId, recorded_by: input.userId,
    observed_at: observedAt, appetite: input.appetite, water_intake: input.waterIntake,
    stool_quality: input.stoolQuality, energy: input.energy, pain: input.pain, mood: input.mood,
    red_flags: input.redFlags ?? [], species_metrics: input.speciesMetrics ?? {}, notes: input.notes?.trim() || null,
  });
  return { queued };
}

export async function createMedicationPlan(input: {
  userId?: string; petId: string; demoMode: boolean; medicationName: string; dosageText: string;
  instructions?: string; scheduleTimes: string[]; stockQuantity?: number; stockUnit?: string; refillThreshold?: number;
}) {
  if (!input.medicationName.trim() || !input.dosageText.trim()) throw new Error('İlaç adı ve doz bilgisi gerekli.');
  if (input.demoMode || !input.userId || !supabase) {
    const snapshot = await loadDemo(input.petId);
    snapshot.medicationPlans.unshift({
      id: createClientEventId('med'), petId: input.petId, medicationName: input.medicationName.trim(),
      dosageText: input.dosageText.trim(), instructions: input.instructions?.trim(), scheduleTimes: input.scheduleTimes,
      startDate: new Date().toISOString().slice(0, 10), stockQuantity: input.stockQuantity, stockUnit: input.stockUnit,
      refillThreshold: input.refillThreshold, verificationStatus: 'owner_entered', active: true,
    });
    await saveDemo(input.petId, snapshot); return;
  }
  const { error } = await db().from('medication_plans').insert({
    owner_id: input.userId, pet_id: input.petId, medication_name: input.medicationName.trim(), dosage_text: input.dosageText.trim(),
    instructions: input.instructions?.trim() || null, schedule_times: input.scheduleTimes,
    stock_quantity: Number.isFinite(input.stockQuantity) ? input.stockQuantity : null,
    stock_unit: input.stockUnit?.trim() || null, refill_threshold: Number.isFinite(input.refillThreshold) ? input.refillThreshold : null,
  });
  if (error) throw error;
}

export async function recordMedicationDose(input: {
  userId?: string; petId: string; demoMode: boolean; plan: MedicationPlan;
  status: MedicationDose['status']; plannedAt?: string; notes?: string;
}) {
  const clientEventId = createClientEventId('dose');
  const plannedAt = input.plannedAt ?? new Date().toISOString();
  const actualAt = input.status === 'taken' ? new Date().toISOString() : undefined;
  const stockAfter = input.status === 'taken' && input.plan.stockQuantity != null ? Math.max(0, input.plan.stockQuantity - 1) : input.plan.stockQuantity;
  const dose: MedicationDose = { id: clientEventId, clientEventId, petId: input.petId, medicationPlanId: input.plan.id, plannedAt, actualAt, status: input.status, stockAfter, notes: input.notes };
  if (input.demoMode || !input.userId || !supabase) {
    const snapshot = await loadDemo(input.petId); snapshot.medicationDoses.unshift(dose);
    snapshot.medicationPlans = snapshot.medicationPlans.map(plan => plan.id === input.plan.id ? { ...plan, stockQuantity: stockAfter } : plan);
    await saveDemo(input.petId, snapshot); return { queued: false };
  }
  const queued = await upsertOrQueue(input.userId, 'medication_doses', {
    client_event_id: clientEventId, owner_id: input.userId, pet_id: input.petId, medication_plan_id: input.plan.id,
    planned_at: plannedAt, actual_at: actualAt ?? null, status: input.status, stock_after: stockAfter ?? null,
    recorded_by: input.userId, notes: input.notes?.trim() || null,
  });
  if (!queued && stockAfter != null) {
    const { error } = await db().from('medication_plans').update({ stock_quantity: stockAfter, updated_at: new Date().toISOString() }).eq('id', input.plan.id).eq('owner_id', input.userId);
    if (error) throw error;
  }
  return { queued };
}

export async function createCareProgram(input: { userId?: string; petId: string; demoMode: boolean; conditionKey: CareProgram['conditionKey']; label: string; notes?: string }) {
  if (!input.label.trim()) throw new Error('Program adı gerekli.');
  if (input.demoMode || !input.userId || !supabase) {
    const snapshot = await loadDemo(input.petId); snapshot.programs.unshift({ id: createClientEventId('program'), petId: input.petId, conditionKey: input.conditionKey, label: input.label.trim(), notes: input.notes?.trim(), targets: {}, status: 'active', verificationStatus: 'owner_entered', startedAt: new Date().toISOString().slice(0, 10) }); await saveDemo(input.petId, snapshot); return;
  }
  const { error } = await db().from('care_programs').insert({ owner_id: input.userId, pet_id: input.petId, condition_key: input.conditionKey, label: input.label.trim(), notes: input.notes?.trim() || null });
  if (error) throw error;
}

export async function addCareMeasurement(input: { userId?: string; petId: string; demoMode: boolean; programId: string; metricType: string; value: string; unit?: string; notes?: string }) {
  const numeric = Number(input.value.replace(',', '.'));
  const valueNumeric = Number.isFinite(numeric) ? numeric : undefined;
  const clientEventId = createClientEventId('measure');
  const occurredAt = new Date().toISOString();
  const item: CareMeasurement = { id: clientEventId, clientEventId, petId: input.petId, programId: input.programId, metricType: input.metricType.trim(), valueNumeric, valueText: valueNumeric == null ? input.value.trim() : undefined, unit: input.unit?.trim(), occurredAt, notes: input.notes?.trim() };
  if (!item.metricType || (item.valueNumeric == null && !item.valueText)) throw new Error('Ölçüm türü ve değeri gerekli.');
  if (input.demoMode || !input.userId || !supabase) { const snapshot = await loadDemo(input.petId); snapshot.measurements.unshift(item); await saveDemo(input.petId, snapshot); return { queued: false }; }
  const queued = await upsertOrQueue(input.userId, 'care_measurements', {
    client_event_id: clientEventId, owner_id: input.userId, pet_id: input.petId, program_id: input.programId,
    metric_type: item.metricType, value_numeric: valueNumeric ?? null, value_text: item.valueText ?? null,
    unit: item.unit ?? null, occurred_at: occurredAt, recorded_by: input.userId, notes: item.notes ?? null,
  });
  return { queued };
}

export async function createVetVisit(input: { userId: string; petId: string; clinicName?: string; veterinarian?: string; recordingConsent: boolean; audioStoragePath?: string; transcript?: string }) {
  if (!input.recordingConsent && input.audioStoragePath) throw new Error('Kayıt için açık rıza gerekli.');
  const { data, error } = await db().from('vet_visits').insert({
    owner_id: input.userId, pet_id: input.petId, clinic_name: input.clinicName?.trim() || null,
    veterinarian: input.veterinarian?.trim() || null, recording_consent: input.recordingConsent,
    consent_given_at: input.recordingConsent ? new Date().toISOString() : null,
    consent_note: input.recordingConsent ? 'Owner confirmed all participants were informed before recording.' : null,
    audio_storage_path: input.audioStoragePath ?? null, transcript: input.transcript?.trim() || null,
    status: input.audioStoragePath || input.transcript?.trim() ? 'processing' : 'draft',
  }).select('id').single();
  if (error) throw error;
  return String(data.id);
}

export async function runVetVisitCopilot(visitId: string) {
  const { data, error } = await db().functions.invoke('vet-visit-copilot', { body: { visitId } });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as { transcript: string; summary: VetVisitSummary; requiresConfirmation: boolean };
}

export async function confirmVetVisit(userId: string, visitId: string, summary: VetVisitSummary) {
  const { error } = await db().from('vet_visits').update({ summary, status: 'confirmed', confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', visitId).eq('owner_id', userId);
  if (error) throw error;
}

export async function saveEmergencyProfile(userId: string, profile: EmergencyProfile) {
  const { error } = await db().from('pet_emergency_profiles').upsert({
    owner_id: userId, pet_id: profile.petId, blood_type: profile.bloodType?.trim() || null,
    emergency_vet_name: profile.emergencyVetName?.trim() || null, emergency_vet_phone: profile.emergencyVetPhone?.trim() || null,
    insurance_provider: profile.insuranceProvider?.trim() || null, policy_number: profile.policyNumber?.trim() || null,
    safety_notes: profile.safetyNotes?.trim() || null, updated_at: new Date().toISOString(),
  }, { onConflict: 'pet_id' });
  if (error) throw error;
}

export type BaselineWindow = { days: 7 | 30 | 90; count: number; averages: Record<CheckInMetric, number> };
export type BaselineResult = { status: 'learning' | 'stable' | 'watch' | 'urgent'; windows: BaselineWindow[]; changeScore: number; reasons: string[] };

const metricKeys: CheckInMetric[] = ['appetite', 'waterIntake', 'stoolQuality', 'energy', 'pain', 'mood'];

export function calculatePersonalBaseline(checkIns: DailyCheckIn[], now = new Date()): BaselineResult {
  const ordered = [...checkIns].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const windows = ([7, 30, 90] as const).map(days => {
    const entries = ordered.filter(item => now.getTime() - new Date(item.observedAt).getTime() <= days * MS_PER_DAY);
    const averages = Object.fromEntries(metricKeys.map(key => [key, entries.length ? entries.reduce((sum, item) => sum + item[key], 0) / entries.length : 0])) as Record<CheckInMetric, number>;
    return { days, count: entries.length, averages };
  });
  const latest = ordered[0];
  const baselineEntries = ordered.slice(1).filter(item => now.getTime() - new Date(item.observedAt).getTime() <= 30 * MS_PER_DAY);
  if (!latest || baselineEntries.length < 4) return { status: 'learning', windows, changeScore: 0, reasons: ['baseline_learning'] };
  if (latest.redFlags.length) return { status: 'urgent', windows, changeScore: 100, reasons: latest.redFlags };
  const avg = (key: CheckInMetric) => baselineEntries.reduce((sum, item) => sum + item[key], 0) / baselineEntries.length;
  const drops = ['appetite', 'waterIntake', 'stoolQuality', 'energy', 'mood'] as const;
  const reasons: string[] = [];
  let changeScore = 0;
  drops.forEach(key => { const delta = avg(key) - latest[key]; if (delta >= 1) { changeScore += delta * 12; reasons.push(`${key}_drop`); } });
  const painRise = latest.pain - avg('pain');
  if (painRise >= 1 || latest.pain >= 3) { changeScore += Math.max(20, painRise * 18); reasons.push('pain_rise'); }
  const status = changeScore >= 45 ? 'watch' : 'stable';
  if (!reasons.length) reasons.push('within_baseline');
  return { status, windows, changeScore: Math.min(100, Math.round(changeScore)), reasons };
}

export function medicationAdherence(planId: string, doses: MedicationDose[], days = 30) {
  const since = Date.now() - days * MS_PER_DAY;
  const relevant = doses.filter(dose => dose.medicationPlanId === planId && new Date(dose.plannedAt).getTime() >= since && dose.status !== 'skipped');
  if (!relevant.length) return undefined;
  return Math.round((relevant.filter(dose => dose.status === 'taken').length / relevant.length) * 100);
}

export type SpeciesMetricDefinition = { key: string; label: string; unit?: string; keyboard?: 'numeric' | 'text' };

export function speciesMetricDefinitions(species: string, language: SupportedLocale = 'en'): SpeciesMetricDefinition[] {
  const normalized = species.toLocaleLowerCase('tr-TR');
  const label = (tr: string, en: string, de: string, es: string, ja: string) => ({ tr, en, de, es, ja })[language];
  if (normalized.includes('balık') || normalized.includes('fish')) return [
    { key: 'water_temperature', label: label('Su sıcaklığı','Water temperature','Wassertemperatur','Temperatura del agua','水温'), unit: '°C', keyboard: 'numeric' },
    { key: 'ph', label: 'pH', keyboard: 'numeric' }, { key: 'ammonia', label: label('Amonyak','Ammonia','Ammoniak','Amoníaco','アンモニア'), unit: 'ppm', keyboard: 'numeric' },
  ];
  if (normalized.includes('sürüngen') || normalized.includes('reptile')) return [
    { key: 'warm_side_temperature', label: label('Sıcak bölge','Warm-side temperature','Temperatur Warmzone','Temperatura zona cálida','ホットスポット温度'), unit: '°C', keyboard: 'numeric' },
    { key: 'humidity', label: label('Nem','Humidity','Luftfeuchtigkeit','Humedad','湿度'), unit: '%', keyboard: 'numeric' }, { key: 'shedding', label: label('Deri değişimi','Shedding','Häutung','Muda','脱皮'), keyboard: 'text' },
  ];
  if (normalized.includes('kuş') || normalized.includes('bird')) return [
    { key: 'weight_grams', label: label('Ağırlık','Weight','Gewicht','Peso','体重'), unit: 'g', keyboard: 'numeric' },
    { key: 'molt', label: label('Tüy değişimi','Molt','Mauser','Muda de plumas','換羽'), keyboard: 'text' }, { key: 'eggs', label: label('Yumurta','Eggs','Eier','Huevos','産卵数'), keyboard: 'numeric' },
  ];
  if (normalized.includes('tavşan') || normalized.includes('rabbit')) return [
    { key: 'hay_intake', label: label('Saman tüketimi','Hay intake','Heuaufnahme','Consumo de heno','牧草の摂取量'), keyboard: 'text' },
    { key: 'droppings', label: label('Dışkı miktarı','Droppings','Kotmenge','Cantidad de heces','便の量'), keyboard: 'text' }, { key: 'dental_signs', label: label('Diş belirtisi','Dental signs','Zahnanzeichen','Signos dentales','歯の症状'), keyboard: 'text' },
  ];
  return [
    { key: 'resting_breaths', label: label('Dinlenme solunumu','Resting breaths','Ruheatmung','Respiración en reposo','安静時呼吸数'), unit: '/min', keyboard: 'numeric' },
    { key: 'mobility', label: label('Hareketlilik notu','Mobility note','Mobilität','Movilidad','動きのメモ'), keyboard: 'text' }, { key: 'itching', label: label('Kaşıntı','Itching','Juckreiz','Picor','かゆみ'), keyboard: 'text' },
  ];
}
