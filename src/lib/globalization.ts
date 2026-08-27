export type SupportedLocale = 'tr' | 'en' | 'de' | 'es' | 'ja';
export type UnitSystem = 'metric' | 'imperial';

export function normalizeLocale(locale?: string | null): SupportedLocale {
  const base = String(locale ?? '').toLowerCase().split(/[-_]/)[0];
  if (base === 'tr' || base === 'de' || base === 'es' || base === 'ja') return base;
  return 'en';
}

export function defaultUnitSystem(locale: SupportedLocale): UnitSystem {
  return locale === 'en' ? 'imperial' : 'metric';
}

export function formatWeight(kg: number, unitSystem: UnitSystem, locale: SupportedLocale) {
  if (!Number.isFinite(kg)) return '—';
  const value = unitSystem === 'imperial' ? kg * 2.2046226218 : kg;
  const unit = unitSystem === 'imperial' ? 'lb' : 'kg';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

export function formatDateTime(value: string | Date, locale: SupportedLocale, timeZone?: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date);
}

export const coreCopy: Record<SupportedLocale, { today: string; tasks: string; passport: string; vetSummary: string; offline: string }> = {
  tr: { today: 'Bugün', tasks: 'Bugünün görevleri', passport: 'Sağlık Pasaportu', vetSummary: 'Veterinere hazırlan', offline: 'Bağlantı yok' },
  en: { today: 'Today', tasks: "Today's tasks", passport: 'Health Passport', vetSummary: 'Prepare for vet', offline: 'Offline' },
  de: { today: 'Heute', tasks: 'Heutige Aufgaben', passport: 'Gesundheitspass', vetSummary: 'Tierarzt vorbereiten', offline: 'Offline' },
  es: { today: 'Hoy', tasks: 'Tareas de hoy', passport: 'Pasaporte de salud', vetSummary: 'Preparar visita veterinaria', offline: 'Sin conexión' },
  ja: { today: '今日', tasks: '今日のタスク', passport: '健康パスポート', vetSummary: '診察の準備', offline: 'オフライン' },
};
