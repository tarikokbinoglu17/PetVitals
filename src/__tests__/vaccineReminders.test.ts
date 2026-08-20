import {
  addMonthsToIsoDate,
  buildVaccineReminderPlan,
  getVaccineReminderBody,
  toIsoDate,
  validateVaccineDraft,
} from '../lib/vaccineReminders';

describe('vaccine reminder helpers', () => {
  it('builds the 30/7/1/day-of reminder plan at 09:00', () => {
    const plan = buildVaccineReminderPlan('2026-09-20', new Date(2026, 7, 20, 8));

    expect(plan.map(item => item.offsetDays)).toEqual([30, 7, 1, 0]);
    expect(plan.map(item => toIsoDate(item.triggerDate))).toEqual([
      '2026-08-21',
      '2026-09-13',
      '2026-09-19',
      '2026-09-20',
    ]);
    expect(plan.every(item => item.triggerDate.getHours() === 9)).toBe(true);
  });

  it('does not schedule reminder times that have already passed', () => {
    const plan = buildVaccineReminderPlan('2026-09-20', new Date(2026, 8, 14, 10));
    expect(plan.map(item => item.offsetDays)).toEqual([1, 0]);
  });

  it('calculates month intervals without overflowing short months', () => {
    expect(addMonthsToIsoDate('2027-01-31', 1)).toBe('2027-02-28');
  });

  it('validates vaccine dates and required fields', () => {
    expect(
      validateVaccineDraft({
        petId: 'pet-1',
        vaccineName: 'Karma',
        administeredDate: '2026-08-20',
        nextDueDate: '2026-08-19',
        notificationEnabled: true,
      }),
    ).toBe('Sonraki aşı tarihi uygulama tarihinden önce olamaz.');
  });

  it('creates clear reminder copy', () => {
    expect(getVaccineReminderBody('Moka', 'Karma', 7)).toBe('Moka için Karma aşısına 7 gün kaldı.');
    expect(getVaccineReminderBody('Moka', 'Karma', 0)).toBe('Bugün Moka için Karma aşısı günü.');
  });
});
