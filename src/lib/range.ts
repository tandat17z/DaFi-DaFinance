import { addDays } from './period'
import type { Transaction } from './types'

/** Granularity of the period the whole page is looking at. */
export type Unit = 'day' | 'week' | 'month' | 'year'

const pad = (n: number) => String(n).padStart(2, '0')
const daysIn = (year: number, month0: number) => new Date(year, month0 + 1, 0).getDate()

/** Inclusive ISO range of the day / week (Mon–Sun) / month / year containing `anchor`. */
export function rangeOf(unit: Unit, anchor: string): [string, string] {
  if (unit === 'day') return [anchor, anchor]
  if (unit === 'week') {
    const monday = addDays(anchor, -((new Date(`${anchor}T00:00:00`).getDay() + 6) % 7))
    return [monday, addDays(monday, 6)]
  }
  const y = Number(anchor.slice(0, 4))
  if (unit === 'month') {
    const m = anchor.slice(0, 7)
    return [`${m}-01`, `${m}-${pad(daysIn(y, Number(anchor.slice(5, 7)) - 1))}`]
  }
  return [`${y}-01-01`, `${y}-12-31`]
}

/** Moves `anchor` by whole periods, keeping the day of month where it exists (31 Jan → 28 Feb). */
export function shiftAnchor(unit: Unit, anchor: string, delta: number): string {
  if (unit === 'day') return addDays(anchor, delta)
  if (unit === 'week') return addDays(anchor, delta * 7)
  const y = Number(anchor.slice(0, 4))
  const m0 = Number(anchor.slice(5, 7)) - 1
  const d = Number(anchor.slice(8, 10))
  const target = new Date(y + (unit === 'year' ? delta : 0), m0 + (unit === 'month' ? delta : 0), 1)
  const ty = target.getFullYear()
  const tm = target.getMonth()
  return `${ty}-${pad(tm + 1)}-${pad(Math.min(d, daysIn(ty, tm)))}`
}

/** Assigned to a month (forMonth set, default none): counted for that whole month, not on its day. */
export const isAssignedAway = (tx: Transaction) => !!tx.forMonth

/** Month (YYYY-MM) a transaction counts for: its forMonth, else the month of its date. */
export const effectiveMonth = (tx: Transaction) => tx.forMonth ?? tx.date.slice(0, 7)

/**
 * Whether a transaction belongs to the period. A transaction counts toward the month it is *for*
 * (forMonth) when the period is a month or a year; everything else counts by its date.
 */
export function inPeriod(tx: Transaction, unit: Unit, [from, to]: [string, string]): boolean {
  if ((unit === 'month' || unit === 'year')) {
    const m = effectiveMonth(tx)
    return m >= from.slice(0, 7) && m <= to.slice(0, 7)
  }
  return tx.date >= from && tx.date <= to
}
