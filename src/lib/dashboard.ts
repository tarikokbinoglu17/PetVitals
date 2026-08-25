import type { HealthRecord } from '../types';
import type { SupportedLocale } from './globalization';

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDashboardDate(date: Date, locale: SupportedLocale = 'tr') {
  const formattedDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' })
    .format(date)
    .toLocaleUpperCase(locale);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' })
    .format(date)
    .toLocaleUpperCase(locale);
  return `${formattedDate}, ${weekday}`;
}

export function formatRecordDate(value: string, locale: SupportedLocale = 'tr') {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(parseLocalDate(value));
}

export function getUpcomingRecords(records: HealthRecord[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return records.filter(record => parseLocalDate(record.date).getTime() >= today).sort((left, right) => parseLocalDate(left.date).getTime() - parseLocalDate(right.date).getTime());
}
