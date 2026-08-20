import type { VaccineDraft } from '../types';

export const VACCINE_REMINDER_OFFSETS = [30, 7, 1, 0] as const;

export type VaccineReminderOffset = (typeof VACCINE_REMINDER_OFFSETS)[number];

export type VaccineReminderPlan = {
  offsetDays: VaccineReminderOffset;
  triggerDate: Date;
};

export function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonthsToIsoDate(value: string, months: number) {
  const source = parseIsoDate(value);
  if (!source || !Number.isInteger(months) || months < 1) return '';

  const originalDay = source.getDate();
  const target = new Date(source.getFullYear(), source.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastDay));
  return toIsoDate(target);
}

export function validateVaccineDraft(draft: VaccineDraft) {
  if (!draft.petId) return 'Lütfen bir dost seçin.';
  if (draft.vaccineName.trim().length < 2) return 'Aşı adı en az 2 karakter olmalı.';

  const administeredDate = parseIsoDate(draft.administeredDate);
  if (!administeredDate) return 'Uygulama tarihini YYYY-AA-GG biçiminde girin.';

  const nextDueDate = parseIsoDate(draft.nextDueDate);
  if (!nextDueDate) return 'Sonraki tarihi YYYY-AA-GG biçiminde girin.';
  if (nextDueDate.getTime() < administeredDate.getTime()) {
    return 'Sonraki aşı tarihi uygulama tarihinden önce olamaz.';
  }

  if (
    draft.repeatIntervalMonths !== undefined &&
    (!Number.isInteger(draft.repeatIntervalMonths) || draft.repeatIntervalMonths < 1 || draft.repeatIntervalMonths > 120)
  ) {
    return 'Tekrar aralığı 1 ile 120 ay arasında olmalı.';
  }

  return null;
}

export function buildVaccineReminderPlan(nextDueDate: string, now = new Date()) {
  const dueDate = parseIsoDate(nextDueDate);
  if (!dueDate) return [];

  dueDate.setHours(9, 0, 0, 0);

  return VACCINE_REMINDER_OFFSETS.map(offsetDays => {
    const triggerDate = new Date(dueDate);
    triggerDate.setDate(triggerDate.getDate() - offsetDays);
    return { offsetDays, triggerDate };
  }).filter(item => item.triggerDate.getTime() > now.getTime());
}

export function getVaccineReminderBody(petName: string, vaccineName: string, offsetDays: VaccineReminderOffset) {
  if (offsetDays === 0) return `Bugün ${petName} için ${vaccineName} aşısı günü.`;
  if (offsetDays === 1) return `${petName} için ${vaccineName} aşısına 1 gün kaldı.`;
  return `${petName} için ${vaccineName} aşısına ${offsetDays} gün kaldı.`;
}
