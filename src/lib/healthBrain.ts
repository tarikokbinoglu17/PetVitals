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

type IntelligenceReason = { text: string; penalty: number; severity: 'low' | 'medium' | 'high' };

type LifeRow = {
  entry_type: string;
  value_numeric: number | null;
  value_text: string | null;
  occurred_at: string;
};

const DAY = 86_400_000;

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase as any;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function severityForScore(score: number): 'low' | 'medium' | 'high' {
  return score >= 85 ? 'low' : score >= 70 ? 'medium' : 'high';
}

function average(rows: LifeRow[]) {
  const values = rows.map(row => Number(row.value_numeric)).filter(value => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentageChange(previous: number | null, recent: number | null) {
  if (previous == null || recent == null || previous === 0) return null;
  return ((recent - previous) / Math.abs(previous)) * 100;
}

function splitLifeWindow(rows: LifeRow[], type: string, now: number) {
  const typed = rows.filter(row => row.entry_type === type && Number.isFinite(Number(row.value_numeric)));
  const recent = typed.filter(row => {
    const time = new Date(row.occurred_at).getTime();
    return time >= now - 7 * DAY && time <= now;
  });
  const previous = typed.filter(row => {
    const time = new Date(row.occurred_at).getTime();
    return time >= now - 14 * DAY && time < now - 7 * DAY;
  });
  return { recent: average(recent), previous: average(previous), recentCount: recent.length, previousCount: previous.length };
}

function makeAlert(id: string, severity: 'low' | 'medium' | 'high', title: string, message: string, nowIso: string, type = 'petvitals_intelligence'): SmartHealthAlert {
  return { id, alert_type: type, severity, title, message, status: 'active', detected_at: nowIso };
}

export async function evaluateSmartHealthAlerts(petId: string): Promise<SmartHealthAlert[]> {
  const client = requireSupabase();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const [vaccinesResult, recordsResult, weightsResult, lifeResult] = await Promise.all([
    client.from('vaccines').select('id,vaccine_name,next_due_date').eq('pet_id', petId),
    client.from('health_records').select('id,record_type,title,record_date').eq('pet_id', petId).order('record_date', { ascending: false }).limit(50),
    client.from('weight_entries').select('id,weight,measured_at').eq('pet_id', petId).order('measured_at', { ascending: true }),
    client.from('pet_life_entries').select('id,entry_type,value_numeric,value_text,occurred_at').eq('pet_id', petId).order('occurred_at', { ascending: false }).limit(120),
  ]);

  const firstError = vaccinesResult.error ?? recordsResult.error ?? weightsResult.error ?? lifeResult.error;
  if (firstError) throw firstError;

  const vaccines = vaccinesResult.data ?? [];
  const records = recordsResult.data ?? [];
  const weights = weightsResult.data ?? [];
  const lifeRows: LifeRow[] = lifeResult.data ?? [];
  const reasons: IntelligenceReason[] = [];
  const alerts: SmartHealthAlert[] = [];

  const overdue = vaccines.filter((row: any) => row.next_due_date && new Date(`${row.next_due_date}T23:59:59`).getTime() < now);
  if (overdue.length) {
    const penalty = Math.min(30, overdue.length * 15);
    reasons.push({ text: `${overdue.length} overdue vaccine${overdue.length > 1 ? 's' : ''}`, penalty, severity: overdue.length >= 2 ? 'high' : 'medium' });
    alerts.push(makeAlert('intel-overdue-vaccine', overdue.length >= 2 ? 'high' : 'medium', 'Vaccine follow-up needed', `${overdue.length} vaccine schedule${overdue.length > 1 ? 's are' : ' is'} past the recorded due date.`, nowIso));
  }

  const recentVetVisit = records.some((row: any) => row.record_type === 'vet_visit' && now - new Date(`${row.record_date}T12:00:00`).getTime() <= 365 * DAY);
  if (!recentVetVisit) reasons.push({ text: 'No vet visit recorded in the last 12 months', penalty: 8, severity: 'low' });

  const recentVetVisits = records.filter((row: any) => row.record_type === 'vet_visit' && now - new Date(`${row.record_date}T12:00:00`).getTime() <= 90 * DAY).length;
  if (recentVetVisits >= 3) {
    reasons.push({ text: `${recentVetVisits} vet visits recorded in 90 days`, penalty: 5, severity: 'low' });
    alerts.push(makeAlert('intel-frequent-vet-visits', 'low', 'Frequent vet visits', `${recentVetVisits} veterinary visits were recorded during the last 90 days. Consider reviewing the pattern with your veterinarian.`, nowIso));
  }

  const recentSymptoms = lifeRows.filter(row => String(row.value_text ?? '').trim().toLowerCase() === 'quick:symptom' && now - new Date(row.occurred_at).getTime() <= 90 * DAY).length;
  if (recentSymptoms >= 3) {
    reasons.push({ text: `${recentSymptoms} symptom logs in 90 days`, penalty: 15, severity: 'medium' });
    alerts.push(makeAlert('intel-recurring-symptoms', recentSymptoms >= 5 ? 'high' : 'medium', 'Recurring symptom pattern', `${recentSymptoms} symptom entries were logged in the last 90 days. PetVitals detected a repeating pattern worth discussing with a veterinarian.`, nowIso));
  }

  if (weights.length >= 2) {
    const first = Number(weights[0].weight);
    const last = Number(weights[weights.length - 1].weight);
    if (first > 0 && Number.isFinite(last)) {
      const change = ((last - first) / first) * 100;
      if (Math.abs(change) >= 10) {
        reasons.push({ text: `Weight changed ${Math.abs(change).toFixed(1)}%`, penalty: 15, severity: 'medium' });
        alerts.push(makeAlert('intel-weight-change', 'medium', 'Weight trend changed', `Recorded weight is ${Math.abs(change).toFixed(1)}% ${change >= 0 ? 'higher' : 'lower'} than the first available measurement.`, nowIso));
      } else if (Math.abs(change) >= 5) {
        reasons.push({ text: `Weight changed ${Math.abs(change).toFixed(1)}%`, penalty: 6, severity: 'low' });
      }
    }
  } else {
    reasons.push({ text: 'More weight measurements will improve trend detection', penalty: 3, severity: 'low' });
  }

  const food = splitLifeWindow(lifeRows, 'food', now);
  const water = splitLifeWindow(lifeRows, 'water', now);
  const activity = splitLifeWindow(lifeRows, 'activity', now);

  const foodChange = food.recentCount >= 2 && food.previousCount >= 2 ? percentageChange(food.previous, food.recent) : null;
  if (foodChange != null && foodChange <= -25) {
    reasons.push({ text: `Food intake trend down ${Math.abs(foodChange).toFixed(0)}%`, penalty: 12, severity: 'medium' });
    alerts.push(makeAlert('intel-food-down', 'medium', 'Food intake is trending down', `Average recorded food intake is about ${Math.abs(foodChange).toFixed(0)}% lower than the previous 7-day period.`, nowIso));
  }

  const waterChange = water.recentCount >= 2 && water.previousCount >= 2 ? percentageChange(water.previous, water.recent) : null;
  if (waterChange != null && Math.abs(waterChange) >= 35) {
    reasons.push({ text: `Water intake changed ${Math.abs(waterChange).toFixed(0)}%`, penalty: 10, severity: 'medium' });
    alerts.push(makeAlert('intel-water-change', 'medium', 'Water intake pattern changed', `Average recorded water intake is about ${Math.abs(waterChange).toFixed(0)}% ${waterChange >= 0 ? 'higher' : 'lower'} than the previous 7-day period.`, nowIso));
  }

  const activityChange = activity.recentCount >= 2 && activity.previousCount >= 2 ? percentageChange(activity.previous, activity.recent) : null;
  if (activityChange != null && activityChange <= -30) {
    reasons.push({ text: `Activity trend down ${Math.abs(activityChange).toFixed(0)}%`, penalty: 10, severity: 'medium' });
    alerts.push(makeAlert('intel-activity-down', 'medium', 'Activity is trending down', `Average recorded activity is about ${Math.abs(activityChange).toFixed(0)}% lower than the previous 7-day period.`, nowIso));
  }

  const score = clamp(100 - reasons.reduce((sum, reason) => sum + reason.penalty, 0));
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs attention';
  const explanation = reasons.length
    ? `Why: ${reasons.slice(0, 4).map(reason => reason.text).join(' • ')}`
    : 'No meaningful negative trend is visible in the available records.';

  const scoreCard = makeAlert(
    'petvitals-intelligence-score',
    severityForScore(score),
    `PetVitals Intelligence · ${score}/100 · ${label}`,
    `${explanation} This score is a wellness tracking signal, not a diagnosis.`,
    nowIso,
    'health_score',
  );

  try {
    const { data, error } = await client.functions.invoke('evaluate-smart-health-alerts', { body: { petId } });
    if (!error && !data?.error && Array.isArray(data?.alerts)) {
      const remoteAlerts = data.alerts.filter((item: any) => item?.id && item?.title && !alerts.some(local => local.id === item.id));
      alerts.push(...remoteAlerts);
    }
  } catch {
    // Local PetVitals Intelligence remains available if remote enrichment is unavailable.
  }

  return [scoreCard, ...alerts];
}

export async function askPetHealthBrain(petId: string, question: string): Promise<HealthBrainAnswer> {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) throw new Error('Question is required.');

  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('pet-health-assistant', { body: { petId, question: trimmedQuestion } });

  if (error) throw error;
  if (data?.code === 'PRO_REQUIRED') throw new Error('PetVitals Pro is required for AI Health Brain.');
  if (data?.code === 'AI_NOT_CONFIGURED') throw new Error('AI Health Brain is not configured yet.');
  if (data?.error) throw new Error(String(data.error));
  if (typeof data?.answer !== 'string' || !data.answer.trim()) throw new Error('AI Health Brain returned an empty response.');

  return { answer: data.answer.trim(), disclaimer: typeof data.disclaimer === 'string' ? data.disclaimer : undefined };
}
