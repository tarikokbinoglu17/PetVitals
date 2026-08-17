import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '@/constants/config';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import tr from './locales/tr.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  de: { translation: de },
  es: { translation: es },
};

function isSupportedLocale(tag: string): tag is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(tag);
}

function detectDeviceLocale(): SupportedLocale {
  const deviceLocale = Localization.getLocales()[0]?.languageCode;
  if (deviceLocale && isSupportedLocale(deviceLocale)) {
    return deviceLocale;
  }
  return DEFAULT_LOCALE;
}

// eslint-disable-next-line import/no-named-as-default-member -- i18next's documented .use() API, not the named `use` export
void i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
