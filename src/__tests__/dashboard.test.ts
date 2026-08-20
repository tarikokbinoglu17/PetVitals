import { formatDashboardDate, getUpcomingRecords } from '../lib/dashboard';
import { HealthRecord } from '../types';

const records: HealthRecord[] = [
  { id: 'past', petId: '1', title: 'Geçmiş', category: 'Kontrol', date: '2026-08-19' },
  { id: 'later', petId: '1', title: 'Daha sonra', category: 'Aşı', date: '2026-09-18' },
  { id: 'next', petId: '1', title: 'Sıradaki', category: 'Aşı', date: '2026-09-02' },
];

describe('dashboard helpers', () => {
  it('filters expired records and sorts upcoming reminders', () => {
    expect(getUpcomingRecords(records, new Date(2026, 7, 20)).map(record => record.id)).toEqual([
      'next',
      'later',
    ]);
  });

  it('formats the heading from the supplied date', () => {
    expect(formatDashboardDate(new Date(2026, 7, 20))).toBe('20 AĞUSTOS, PERŞEMBE');
  });
});
