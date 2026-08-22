import type { PetLifeEntry, PetLifeEntryType } from './platformData';

export type LifeMetric = {
  type: PetLifeEntryType;
  label: string;
  icon: string;
  total?: number;
  latestText?: string;
  unit?: string;
  count: number;
};

const META: Record<PetLifeEntryType, { label: string; icon: string }> = {
  food: { label: 'Mama', icon: '🍽️' },
  water: { label: 'Su', icon: '💧' },
  activity: { label: 'Aktivite', icon: '🐾' },
  sleep: { label: 'Uyku', icon: '☾' },
  grooming: { label: 'Bakım', icon: '✂️' },
  parasite: { label: 'Parazit', icon: '🛡️' },
  mood: { label: 'Ruh hali', icon: '♡' },
  custom: { label: 'Diğer', icon: '＋' },
};

export function isSameLocalDay(iso: string, now = new Date()) {
  const value = new Date(iso);
  return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth() && value.getDate() === now.getDate();
}

export function buildTodayLifeMetrics(entries: PetLifeEntry[], now = new Date()): LifeMetric[] {
  const today = entries.filter(entry => isSameLocalDay(entry.occurredAt, now));
  return (Object.keys(META) as PetLifeEntryType[]).map(type => {
    const matches = today.filter(entry => entry.entryType === type);
    const numeric = matches.filter(entry => typeof entry.valueNumeric === 'number');
    const total = numeric.length ? numeric.reduce((sum, entry) => sum + (entry.valueNumeric ?? 0), 0) : undefined;
    const latest = matches[0];
    return {
      type,
      label: META[type].label,
      icon: META[type].icon,
      total,
      latestText: latest?.valueText ?? latest?.notes,
      unit: numeric.find(entry => entry.unit)?.unit,
      count: matches.length,
    };
  });
}
