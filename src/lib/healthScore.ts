import type { HealthRecord, Pet, WeightEntry } from '../types';

export type HealthScore = {
  score: number;
  label: 'Excellent' | 'Good' | 'Needs attention';
  reasons: string[];
};

const MS_PER_DAY = 86_400_000;

export function calculateHealthScore(
  pet: Pet,
  records: HealthRecord[],
  weights: WeightEntry[] = [],
  now = new Date(),
): HealthScore {
  let score = 100;
  const reasons: string[] = [];
  const petRecords = records.filter(record => record.petId === pet.id);
  const vaccines = petRecords.filter(record => record.category === 'Aşı');

  const overdue = vaccines.filter(record => {
    if (!record.nextDueDate) return false;
    return new Date(`${record.nextDueDate}T23:59:59`).getTime() < now.getTime();
  });
  if (overdue.length) {
    score -= Math.min(35, overdue.length * 15);
    reasons.push(`${overdue.length} overdue vaccine${overdue.length > 1 ? 's' : ''}`);
  }

  const upcoming = vaccines.filter(record => {
    if (!record.nextDueDate) return false;
    const delta = new Date(`${record.nextDueDate}T12:00:00`).getTime() - now.getTime();
    return delta >= 0 && delta <= 30 * MS_PER_DAY;
  });
  if (upcoming.length) reasons.push(`${upcoming.length} vaccine${upcoming.length > 1 ? 's' : ''} due soon`);

  const recentCheck = petRecords.some(record =>
    record.category === 'Kontrol' && now.getTime() - new Date(`${record.date}T12:00:00`).getTime() <= 365 * MS_PER_DAY,
  );
  if (!recentCheck) {
    score -= 10;
    reasons.push('No recent wellness check recorded');
  }

  const petWeights = weights.filter(entry => entry.petId === pet.id).sort((a, b) => a.date.localeCompare(b.date));
  if (petWeights.length < 2) {
    score -= 5;
    reasons.push('Add regular weight checks');
  } else {
    const first = petWeights[0].weight;
    const last = petWeights[petWeights.length - 1].weight;
    if (first > 0 && Math.abs(last - first) / first >= 0.1) {
      score -= 10;
      reasons.push('Weight changed by 10% or more');
    }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    label: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs attention',
    reasons,
  };
}
