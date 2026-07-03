import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

import en from "@/locales/en.json";
import vi from "@/locales/vi.json";

export type Lang = "vi" | "en";

const STORAGE_KEY = "rentaplace.lang";

const i18n = new I18n({ vi, en });
i18n.defaultLocale = "vi";
i18n.enableFallback = true;

function deviceLang(): Lang {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

type LangContextValue = {
  lang: Lang;
  /** Translate a key, e.g. t("landing.hero.cta"). */
  t: (key: string, options?: Record<string, unknown>) => string;
  /** Translate to a raw value (arrays/objects), e.g. handbook item lists. */
  tr: <T>(key: string) => T;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      setLangState(stored === "en" || stored === "vi" ? stored : deviceLang());
    });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<LangContextValue>(() => {
    i18n.locale = lang;
    return {
      lang,
      t: (key, options) => i18n.t(key, { ...options, locale: lang }),
      tr: <T,>(key: string) => i18n.t(key, { locale: lang }) as T,
      setLang,
      toggleLang: () => setLang(lang === "vi" ? "en" : "vi"),
    };
  }, [lang, setLang]);

  return <LangContext value={value}>{children}</LangContext>;
}

export function useLang(): LangContextValue {
  const ctx = use(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
