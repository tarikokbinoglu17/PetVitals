import { calculateHealthScore } from '../lib/healthScore';
import type { HealthRecord, Pet, WeightEntry } from '../types';

const pet: Pet = {
  id: 'pet-1',
  name: 'Luna',
  species: 'Köpek',
  breed: 'Poodle',
  birthDate: '2022-01-01',
  weight: 8,
};

const now = new Date('2026-08-23T12:00:00Z');

describe('calculateHealthScore', () => {
  test('penalizes overdue vaccines and missing wellness checks', () => {
    const records: HealthRecord[] = [{
      id: 'v1',
      petId: pet.id,
      title: 'Rabies',
      category: 'Aşı',
      date: '2026-01-01',
      nextDueDate: '2026-08-01',
    }];

    const result = calculateHealthScore(pet, records, [], now);

    expect(result.score).toBe(70);
    expect(result.label).toBe('Good');
    expect(result.reasons).toContain('1 overdue vaccine');
  });

  test('detects large weight changes from measuredAt history', () => {
    const records: HealthRecord[] = [{
      id: 'c1',
      petId: pet.id,
      title: 'Annual check',
      category: 'Kontrol',
      date: '2026-06-01',
    }];
    const weights: WeightEntry[] = [
      { id: 'w1', petId: pet.id, weight: 8, measuredAt: '2026-01-01' },
      { id: 'w2', petId: pet.id, weight: 9, measuredAt: '2026-08-01' },
    ];

    const result = calculateHealthScore(pet, records, weights, now);

    expect(result.score).toBe(90);
    expect(result.reasons).toContain('Weight changed by 10% or more');
  });
});
