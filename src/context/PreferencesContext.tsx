import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaultUnitSystem, normalizeLocale } from "../lib/globalization";
import type { SupportedLocale, UnitSystem } from "../lib/globalization";

const STORAGE_KEY = "@pawly/preferences";

type PreferencesContextValue = {
  language: SupportedLocale;
  unitSystem: UnitSystem;
  setLanguage: (language: SupportedLocale) => Promise<void>;
  setUnitSystem: (unitSystem: UnitSystem) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined,
);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [deviceLanguage] = useState(() =>
    normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale),
  );
  const [language, setLanguageState] =
    useState<SupportedLocale>(deviceLanguage);
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() =>
    defaultUnitSystem(deviceLanguage),
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) return;
        const saved = JSON.parse(value) as Partial<{
          language: SupportedLocale;
          unitSystem: UnitSystem;
        }>;
        if (
          saved.language &&
          ["tr", "en", "de", "es", "ja"].includes(saved.language)
        )
          setLanguageState(saved.language);
        if (
          saved.unitSystem &&
          ["metric", "imperial"].includes(saved.unitSystem)
        )
          setUnitSystemState(saved.unitSystem);
      })
      .catch(() => undefined);
  }, []);

  async function save(
    nextLanguage: SupportedLocale,
    nextUnitSystem: UnitSystem,
  ) {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ language: nextLanguage, unitSystem: nextUnitSystem }),
    );
  }

  const value = useMemo<PreferencesContextValue>(
    () => ({
      language,
      unitSystem,
      setLanguage: async (nextLanguage) => {
        setLanguageState(nextLanguage);
        await save(nextLanguage, unitSystem).catch(() => undefined);
      },
      setUnitSystem: async (nextUnitSystem) => {
        setUnitSystemState(nextUnitSystem);
        await save(language, nextUnitSystem).catch(() => undefined);
      },
    }),
    [language, unitSystem],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value)
    throw new Error(
      "usePreferences, PreferencesProvider içinde kullanılmalıdır.",
    );
  return value;
}
