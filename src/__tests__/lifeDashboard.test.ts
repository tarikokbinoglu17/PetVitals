import { buildTodayLifeMetrics } from '../lib/lifeDashboard';
import type { PetLifeEntry } from '../lib/platformData';

describe('Life dashboard', () => {
  it('aggregates numeric entries for the current day', () => {
    const now = new Date('2026-08-23T12:00:00+03:00');
    const entries: PetLifeEntry[] = [
      { id: '1', petId: 'p1', entryType: 'water', valueNumeric: 120, unit: 'ml', occurredAt: '2026-08-23T08:00:00+03:00' },
      { id: '2', petId: 'p1', entryType: 'water', valueNumeric: 180, unit: 'ml', occurredAt: '2026-08-23T10:00:00+03:00' },
      { id: '3', petId: 'p1', entryType: 'water', valueNumeric: 999, unit: 'ml', occurredAt: '2026-08-22T10:00:00+03:00' },
    ];

    const water = buildTodayLifeMetrics(entries, now).find(metric => metric.type === 'water');
    expect(water?.total).toBe(300);
    expect(water?.count).toBe(2);
    expect(water?.unit).toBe('ml');
  });

  it('uses latest text for non numeric entries', () => {
    const now = new Date('2026-08-23T12:00:00+03:00');
    const entries: PetLifeEntry[] = [
      { id: '1', petId: 'p1', entryType: 'mood', valueText: 'Mutlu', occurredAt: '2026-08-23T09:00:00+03:00' },
    ];
    const mood = buildTodayLifeMetrics(entries, now).find(metric => metric.type === 'mood');
    expect(mood?.latestText).toBe('Mutlu');
    expect(mood?.count).toBe(1);
  });
});
