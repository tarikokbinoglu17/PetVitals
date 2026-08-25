import type { HealthRecord } from '../types';

export type PetRecordSummary = {
  recordCount: number;
  vaccineCount: number;
  allergyCount: number;
  upcomingRecord?: HealthRecord;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

export function getPetAgeLabel(birthDate: string, today = new Date()) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return 'Yaş belirtilmedi';

  let months = (today.getFullYear() - birth.year) * 12 + today.getMonth() - (birth.month - 1);
  if (today.getDate() < birth.day) months -= 1;
  if (months < 0) return 'Yaş belirtilmedi';
  if (months === 0) return '1 aydan küçük';
  if (months < 12) return `${months} aylık`;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0 ? `${years} yaş ${remainingMonths} ay` : `${years} yaş`;
}

export function getPetRecords(petId: string, records: HealthRecord[]) {
  return records
    .filter(record => record.petId === petId)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function getPetRecordSummary(
  petId: string,
  records: HealthRecord[],
  today = new Date(),
): PetRecordSummary {
  const petRecords = records.filter(record => record.petId === petId);
  const todayKey = toDateKey(today);
  const upcomingRecord = petRecords
    .filter(record => record.date >= todayKey)
    .sort((left, right) => left.date.localeCompare(right.date))[0];

  return {
    recordCount: petRecords.length,
    vaccineCount: petRecords.filter(record => record.category === 'Aşı').length,
    allergyCount: petRecords.filter(record => record.category === 'Alerji').length,
    upcomingRecord,
  };
}
