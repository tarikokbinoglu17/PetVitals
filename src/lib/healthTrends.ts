import type { WeightEntry } from '../types';
import type { PetLifeEntry } from './platformData';

export type HealthTrendKind = 'recurring_symptom' | 'frequent_vet_visits' | 'weight_change';
export type HealthTrend = {
  id: string;
  kind: HealthTrendKind;
  severity: 'low' | 'medium';
  count?: number;
  percent?: number;
  direction?: 'up' | 'down';
};

function sinceDays(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function quickToken(entry: PetLifeEntry) {
  return String(entry.valueText ?? '').trim().toLowerCase();
}

export function detectLocalHealthTrends(lifeEntries: PetLifeEntry[], weights: WeightEntry[]): HealthTrend[] {
  const trends: HealthTrend[] = [];
  const recent90 = lifeEntries.filter(entry => new Date(entry.occurredAt).getTime() >= sinceDays(90));

  const symptomCount = recent90.filter(entry => quickToken(entry) === 'quick:symptom').length;
  if (symptomCount >= 3) {
    trends.push({ id: 'recurring-symptom', kind: 'recurring_symptom', severity: 'medium', count: symptomCount });
  }

  const vetVisitCount = recent90.filter(entry => quickToken(entry) === 'quick:vet_visit').length;
  if (vetVisitCount >= 3) {
    trends.push({ id: 'frequent-vet-visits', kind: 'frequent_vet_visits', severity: 'low', count: vetVisitCount });
  }

  const recentWeights = weights
    .filter(entry => new Date(`${entry.measuredAt}T00:00:00`).getTime() >= sinceDays(180))
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  if (recentWeights.length >= 2) {
    const first = recentWeights[0].weight;
    const last = recentWeights[recentWeights.length - 1].weight;
    if (first > 0) {
      const change = ((last - first) / first) * 100;
      if (Math.abs(change) >= 10) {
        trends.push({
          id: 'weight-change',
          kind: 'weight_change',
          severity: 'medium',
          percent: Math.abs(change),
          direction: change >= 0 ? 'up' : 'down',
        });
      }
    }
  }

  return trends;
}
