import type { HealthRecord } from '../types';

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDashboardDate(date: Date) {
  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
  })
    .format(date)
    .toLocaleUpperCase('tr-TR');
  const weekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' })
    .format(date)
    .toLocaleUpperCase('tr-TR');

  return `${formattedDate}, ${weekday}`;
}

export function formatRecordDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(
    parseLocalDate(value),
  );
}

export function getUpcomingRecords(records: HealthRecord[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return records
    .filter(record => parseLocalDate(record.date).getTime() >= today)
    .sort((left, right) => parseLocalDate(left.date).getTime() - parseLocalDate(right.date).getTime());
}
