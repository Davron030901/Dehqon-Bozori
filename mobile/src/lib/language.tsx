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
  setLang: (lang: Lang) => void;
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
    void readJson<Lang | null>(KEYS.language, null).then((saved) => {
      setLangState(saved === 'ru' ? 'ru' : 'uz');
      setChosen(saved === 'ru' || saved === 'uz');
      setReady(true);
    });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setChosen(true);
    void writeJson(KEYS.language, next);
  }, []);

  const value = useMemo(
    () => ({ lang, t: dictionary(lang), setLang, chosen, ready }),
    [lang, setLang, chosen, ready],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageState {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage outside LanguageProvider');
  return value;
}
