/** Languages the module knows about. Add an entry here (and a flag) to support another one. */
export const LOCALES = {
  en: { label: 'English', code: 'EN', intl: 'en-US' },
  vi: { label: 'Tiếng Việt', code: 'VI', intl: 'vi-VN' },
} as const

export type Locale = keyof typeof LOCALES
