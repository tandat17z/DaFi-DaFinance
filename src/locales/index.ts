import { createI18n } from '../i18n'
import { en } from './en'
import { vi } from './vi'

export const { I18nProvider, useI18n, LanguageSwitch } = createI18n({
  messages: { en, vi },
  defaultLocale: 'vi',
  storageKey: 'dafinance.lang',
})
