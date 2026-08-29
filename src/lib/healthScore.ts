import type { HealthRecord, Pet, WeightEntry } from '../types';
import type { SupportedLocale } from './globalization';

export type HealthScore = {
  score: number;
  label: 'Excellent' | 'Good' | 'Needs attention';
  reasons: string[];
};

const displayCopy = {
  tr: {
    excellent: 'Mükemmel',
    good: 'İyi',
    attention: 'Dikkat gerekli',
    overdue: (count: number) => `${count} gecikmiş aşı`,
    upcoming: (count: number) => `${count} aşının tarihi yaklaşıyor`,
    noCheck: 'Son 12 ayda rutin kontrol kaydı yok',
    weightChecks: 'Düzenli kilo ölçümleri ekleyin',
    weightChange: 'Kilo %10 veya daha fazla değişti',
  },
  en: {
    excellent: 'Excellent',
    good: 'Good',
    attention: 'Needs attention',
    overdue: (count: number) => `${count} overdue vaccine${count === 1 ? '' : 's'}`,
    upcoming: (count: number) => `${count} vaccine${count === 1 ? '' : 's'} due soon`,
    noCheck: 'No recent wellness check recorded',
    weightChecks: 'Add regular weight checks',
    weightChange: 'Weight changed by 10% or more',
  },
  de: {
    excellent: 'Ausgezeichnet',
    good: 'Gut',
    attention: 'Aufmerksamkeit nötig',
    overdue: (count: number) => `${count} überfällige Impfung${count === 1 ? '' : 'en'}`,
    upcoming: (count: number) => `${count} Impfung${count === 1 ? '' : 'en'} bald fällig`,
    noCheck: 'Keine aktuelle Routineuntersuchung erfasst',
    weightChecks: 'Regelmäßige Gewichtsmessungen hinzufügen',
    weightChange: 'Gewicht hat sich um mindestens 10 % verändert',
  },
  es: {
    excellent: 'Excelente',
    good: 'Bien',
    attention: 'Necesita atención',
    overdue: (count: number) => `${count} vacuna${count === 1 ? '' : 's'} atrasada${count === 1 ? '' : 's'}`,
    upcoming: (count: number) => `${count} vacuna${count === 1 ? '' : 's'} próxima${count === 1 ? '' : 's'}`,
    noCheck: 'No hay una revisión rutinaria reciente',
    weightChecks: 'Añade controles regulares de peso',
    weightChange: 'El peso cambió un 10 % o más',
  },
  ja: {
    excellent: 'とても良好',
    good: '良好',
    attention: '注意が必要',
    overdue: (count: number) => `期限切れのワクチン ${count}件`,
    upcoming: (count: number) => `接種予定が近いワクチン ${count}件`,
    noCheck: '最近の定期健診記録がありません',
    weightChecks: '定期的な体重測定を追加してください',
    weightChange: '体重が10%以上変化しました',
  },
} as const;

export function localizeHealthScoreLabel(
  label: HealthScore['label'],
  language: SupportedLocale,
) {
  const copy = displayCopy[language];
  if (label === 'Excellent') return copy.excellent;
  if (label === 'Good') return copy.good;
  return copy.attention;
}

export function localizeHealthScoreReason(
  reason: string,
  language: SupportedLocale,
) {
  const copy = displayCopy[language];
  const overdue = reason.match(/^(\d+) overdue vaccines?$/);
  if (overdue) return copy.overdue(Number(overdue[1]));
  const upcoming = reason.match(/^(\d+) vaccines? due soon$/);
  if (upcoming) return copy.upcoming(Number(upcoming[1]));
  if (reason === 'No recent wellness check recorded') return copy.noCheck;
  if (reason === 'Add regular weight checks') return copy.weightChecks;
  if (reason === 'Weight changed by 10% or more') return copy.weightChange;
  return reason;
}

const MS_PER_DAY = 86_400_000;

export function calculateHealthScore(
  pet: Pet,
  records: HealthRecord[],
  weights: WeightEntry[] = [],
  now = new Date(),
): HealthScore {
  let score = 100;
  const reasons: string[] = [];
  const petRecords = records.filter(record => record.petId === pet.id);
  const vaccines = petRecords.filter(record => record.category === 'Aşı');

  const overdue = vaccines.filter(record => {
    if (!record.nextDueDate) return false;
    return new Date(`${record.nextDueDate}T23:59:59`).getTime() < now.getTime();
  });
  if (overdue.length) {
    score -= Math.min(35, overdue.length * 15);
    reasons.push(`${overdue.length} overdue vaccine${overdue.length > 1 ? 's' : ''}`);
  }

  const upcoming = vaccines.filter(record => {
    if (!record.nextDueDate) return false;
    const delta = new Date(`${record.nextDueDate}T12:00:00`).getTime() - now.getTime();
    return delta >= 0 && delta <= 30 * MS_PER_DAY;
  });
  if (upcoming.length) reasons.push(`${upcoming.length} vaccine${upcoming.length > 1 ? 's' : ''} due soon`);

  const recentCheck = petRecords.some(record =>
    record.category === 'Kontrol' && now.getTime() - new Date(`${record.date}T12:00:00`).getTime() <= 365 * MS_PER_DAY,
  );
  if (!recentCheck) {
    score -= 10;
    reasons.push('No recent wellness check recorded');
  }

  const petWeights = weights
    .filter(entry => entry.petId === pet.id)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  if (petWeights.length < 2) {
    score -= 5;
    reasons.push('Add regular weight checks');
  } else {
    const first = petWeights[0].weight;
    const last = petWeights[petWeights.length - 1].weight;
    if (first > 0 && Math.abs(last - first) / first >= 0.1) {
      score -= 10;
      reasons.push('Weight changed by 10% or more');
    }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    label: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs attention',
    reasons,
  };
}
