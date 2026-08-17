export const SUPPORTED_LOCALES = ['en', 'tr', 'de', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Default reminder offsets (days before `nextDueDate`) for a vaccine notification schedule. */
export const DEFAULT_VACCINE_REMINDER_OFFSETS_DAYS = [30, 7, 1, 0] as const;

export const STORAGE_KEYS = {
  LOCALE: 'petvitals.locale',
} as const;
