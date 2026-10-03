import { useMemo } from 'react'
import { categoryKey } from '../config/categories'
import { useI18n } from '../locales'
import { useCategories } from './settings'

/** Local date as YYYY-MM-DD (not UTC, so late-evening entries land on the right day). */
export function todayIso(): string {
  return localDateIso(new Date())
}

/** YYYY-MM-DD of `d` in local time (e.g. for an API timestamp, which is UTC). */
export function localDateIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Adds `delta` months to a YYYY-MM string. */
export function shiftMonth(month: string, delta: number): string {
  const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Locale-aware formatters; call `useFormat()` in a component and destructure what you need. */
export function useFormat() {
  const { intl, t, tOr } = useI18n()
  const { customName } = useCategories()
  return useMemo(() => {
    const vnd = new Intl.NumberFormat(intl)
    const monthParams = (month: string, style: 'long' | 'short') => ({
      monthName: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString(intl, { month: style }),
      monthNumber: Number(month.slice(5, 7)),
      year: month.slice(0, 4),
    })
    return {
      formatVnd: (n: number) => `${vnd.format(n)} ₫`,
      formatDate: (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(intl),
      /** "2026-09" → "Tháng 9, 2026" / "September 2026" */
      formatMonth: (month: string) => t('format.month', monthParams(month, 'long')),
      /** "2026-09" → "T9" / "Sep" */
      formatMonthShort: (month: string) => t('format.monthShort', monthParams(month, 'short')),
      /** "2026-09-30" → "Thứ Tư, 30/09" / "Wednesday, 09/30" */
      formatDayHeader: (iso: string) =>
        new Date(`${iso}T00:00:00`).toLocaleDateString(intl, { weekday: 'long', day: '2-digit', month: '2-digit' }).replace(/^./, (c) => c.toUpperCase()),
      /** Compact amount for chips: 50000 → "50k", 1500000 → "1,5tr" / "1.5M" */
      formatShortVnd: (n: number) => {
        if (n >= 1e6) return `${(n / 1e6).toLocaleString(intl, { maximumFractionDigits: 1 })}${intl.startsWith('vi') ? 'tr' : 'M'}`
        if (n >= 1e3) return `${Math.round(n / 1e3)}k`
        return String(n)
      },
      /** Display name of a stored category key (legacy Vietnamese names are mapped; user categories and unknown values show as typed). */
      categoryName: (raw: string) => customName(raw) ?? tOr(`category.${categoryKey(raw)}`, raw),
    }
  }, [intl, t, tOr, customName])
}
