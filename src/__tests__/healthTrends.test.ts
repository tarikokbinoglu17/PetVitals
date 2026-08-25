import { detectLocalHealthTrends } from '../lib/healthTrends';
import type { PetLifeEntry } from '../lib/platformData';
import type { WeightEntry } from '../types';

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function dateDaysAgo(days: number) {
  return isoDaysAgo(days).slice(0, 10);
}

describe('Local health trend detection', () => {
  it('detects recurring symptom and frequent vet visit logs', () => {
    const entries: PetLifeEntry[] = [
      ...[1, 10, 20].map((days, index) => ({ id: `s${index}`, petId: 'p1', entryType: 'custom' as const, valueText: 'quick:symptom', occurredAt: isoDaysAgo(days) })),
      ...[2, 12, 25].map((days, index) => ({ id: `v${index}`, petId: 'p1', entryType: 'custom' as const, valueText: 'quick:vet_visit', occurredAt: isoDaysAgo(days) })),
    ];
    const trends = detectLocalHealthTrends(entries, []);
    expect(trends.some(trend => trend.kind === 'recurring_symptom' && trend.count === 3)).toBe(true);
    expect(trends.some(trend => trend.kind === 'frequent_vet_visits' && trend.count === 3)).toBe(true);
  });

  it('detects a notable six month weight change', () => {
    const weights: WeightEntry[] = [
      { id: 'w1', petId: 'p1', weight: 10, measuredAt: dateDaysAgo(120) },
      { id: 'w2', petId: 'p1', weight: 11.2, measuredAt: dateDaysAgo(2) },
    ];
    const trends = detectLocalHealthTrends([], weights);
    const weight = trends.find(trend => trend.kind === 'weight_change');
    expect(weight?.direction).toBe('up');
    expect(Math.round(weight?.percent ?? 0)).toBe(12);
  });
});
