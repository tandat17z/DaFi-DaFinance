import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageMenu } from './LanguageMenu'
import { LOCALES, type Locale } from './locales'

export type Params = Record<string, string | number>

export interface I18nOptions<K extends string> {
  /** One dictionary per supported language; every dictionary must have the same keys. */
  messages: Partial<Record<Locale, Record<K, string>>>
  defaultLocale: Locale
  /** localStorage key that remembers the visitor's choice. */
  storageKey: string
}

export interface I18nValue<K extends string> {
  locale: Locale
  setLocale: (l: Locale) => void
  /** BCP-47 tag for Intl (e.g. "vi-VN"). */
  intl: string
  t: (key: K, params?: Params) => string
  /** Translate a key built at runtime, or return `fallback` when the dictionary has none. */
  tOr: (key: string, fallback: string, params?: Params) => string
}

const fill = (text: string, params?: Params) => (params ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : text)

/**
 * Small, dependency-free i18n for React sites. Flat dictionaries with `{param}` placeholders,
 * a persisted locale, `<html lang>` kept in sync, and a ready-made language dropdown.
 * Nothing here knows about the host app: copy `src/i18n/` into another site and call createI18n().
 */
export function createI18n<K extends string>({ messages, defaultLocale, storageKey }: I18nOptions<K>) {
  const locales = Object.keys(messages) as Locale[]
  const Ctx = createContext<I18nValue<K> | null>(null)

  const initial = (): Locale => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && locales.includes(saved as Locale)) return saved as Locale
    } catch {
      // Blocked storage: use the default.
    }
    return defaultLocale
  }

  function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(initial)

    useEffect(() => {
      document.documentElement.lang = locale
    }, [locale])

    const setLocale = useCallback((l: Locale) => {
      setLocaleState(l)
      try {
        localStorage.setItem(storageKey, l)
      } catch {
        // Not persisted; the choice still applies for this visit.
      }
    }, [])

    const value = useMemo<I18nValue<K>>(() => {
      const dict = messages[locale] as Record<string, string>
      return {
        locale,
        setLocale,
        intl: LOCALES[locale].intl,
        // `key.one` is used when params.count === 1 (for languages that inflect).
        t: (key, params) => fill((params?.count === 1 ? dict[`${key}.one`] : undefined) ?? dict[key] ?? key, params),
        tOr: (key, fallback, params) => (key in dict ? fill(dict[key], params) : fallback),
      }
    }, [locale, setLocale])

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  }

  function useI18n(): I18nValue<K> {
    const v = useContext(Ctx)
    if (!v) throw new Error('useI18n must be used inside <I18nProvider>')
    return v
  }

  /** Language dropdown bound to this instance. `label` is its accessible name ("Language"). */
  function LanguageSwitch({ label }: { label: string }) {
    const { locale, setLocale } = useI18n()
    return <LanguageMenu locale={locale} locales={locales} onChange={setLocale} label={label} />
  }

  return { I18nProvider, useI18n, LanguageSwitch }
}
