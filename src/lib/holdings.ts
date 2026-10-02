import { todayIso } from './format'
import type { Holding } from './types'

const DAY_MS = 86_400_000

/** Whole days from `from` to `to` (ISO dates), never negative. */
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS))

/**
 * What a holding is worth today. With an interest rate it grows by itself — simple interest on the
 * principal, `principal × rate × days / 365`, which is how Vietnamese deposits accrue. Without a
 * rate (stocks, funds, gold…) the value is the one you last entered.
 */
export function valueOf(h: Holding, today = todayIso()): number {
  if (h.annualRate === null) return h.currentValue
  return Math.round(h.principal * (1 + (h.annualRate / 100) * (daysBetween(h.startDate, today) / 365)))
}

export const profitOf = (h: Holding, today = todayIso()) => valueOf(h, today) - h.principal
