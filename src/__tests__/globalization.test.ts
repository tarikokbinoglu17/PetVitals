import { defaultUnitSystem, formatWeight, normalizeLocale } from '../lib/globalization';

describe('globalization', () => {
  it('normalizes supported locales', () => {
    expect(normalizeLocale('tr-TR')).toBe('tr');
    expect(normalizeLocale('de-DE')).toBe('de');
    expect(normalizeLocale('es-MX')).toBe('es');
    expect(normalizeLocale('fr-FR')).toBe('en');
  });

  it('uses metric outside the English default', () => {
    expect(defaultUnitSystem('tr')).toBe('metric');
    expect(defaultUnitSystem('de')).toBe('metric');
    expect(defaultUnitSystem('en')).toBe('imperial');
  });

  it('formats metric and imperial weights', () => {
    expect(formatWeight(10, 'metric', 'en')).toContain('10');
    expect(formatWeight(10, 'metric', 'en')).toContain('kg');
    expect(formatWeight(10, 'imperial', 'en')).toContain('22');
    expect(formatWeight(10, 'imperial', 'en')).toContain('lb');
  });
});
