/**
 * Uzbek or Russian, chosen on first launch and remembered.
 *
 * Signed-in sellers also get it saved to their account, so the bot speaks to
 * them in the same language the app does.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { dictionary, type Dictionary } from './i18n';
import { KEYS, readJson, writeJson } from './storage';
import type { Lang } from './types';

interface LanguageState {
  lang: Lang;
  t: Dictionary;
  /** The person picked a language: it wins over any account's from now on. */
  setLang: (lang: Lang) => void;
  /**
   * Follow a signed-in account's language without counting it as a choice —
   * otherwise the next account on a shared phone would get it pushed onto them.
   */
  adoptLang: (lang: Lang) => void;
  /** True once the person picked a language on this phone themselves. */
  chosen: boolean;
  ready: boolean;
}

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('uz');
  const [chosen, setChosen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([
      readJson<Lang | null>(KEYS.language, null),
      readJson<boolean>(KEYS.languageChosen, false),
    ]).then(([saved, picked]) => {
      setLangState(saved === 'ru' ? 'ru' : 'uz');
      setChosen(picked === true);
      setReady(true);
    });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setChosen(true);
    void writeJson(KEYS.language, next);
    void writeJson(KEYS.languageChosen, true);
  }, []);

  const adoptLang = useCallback((next: Lang) => {
    setLangState(next);
    void writeJson(KEYS.language, next);
  }, []);

  const value = useMemo(
    () => ({ lang, t: dictionary(lang), setLang, adoptLang, chosen, ready }),
    [lang, setLang, adoptLang, chosen, ready],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageState {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage outside LanguageProvider');
  return value;
}
