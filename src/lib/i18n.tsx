import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Language = 'en' | 'zh';

const STORAGE_KEY = 'daycraft-language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'zh';
}

function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (isLanguage(saved)) return saved;

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      toggleLanguage: () => setLanguageState(current => (current === 'en' ? 'zh' : 'en')),
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
}

export function useCopy<T>(copy: { en: T; zh: T }): T {
  const { language } = useLanguage();
  return copy[language];
}

export function formatCount(
  language: Language,
  count: number,
  singular: string,
  plural: string,
  zhUnit: string
) {
  if (language === 'zh') return `${count} ${zhUnit}`;
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatRangeDate(language: Language, date: Date) {
  if (language === 'zh') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
