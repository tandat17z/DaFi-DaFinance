// Time buckets for the dashboard. A "month" is a spending cycle, not a calendar month: month M
// runs from the last day of M-1 to the second-to-last day of M (e.g. 31/08 → 29/09 is tháng 9).

export type Granularity = 'day' | 'week' | 'month'

/** What bucket labels need from the i18n layer (structural, so this file stays UI-agnostic). */
export interface LabelCtx {
  intl: string
  t: (key: 'dash.weekRange' | 'dash.monthRange' | 'format.monthShort', params: Record<string, string | number>) => string
}

export interface Bucket {
  key: string
  /** Inclusive ISO date range. */
  from: string
  to: string
  label: string
  /** Short axis label. */
  short: string
}

const pad = (n: number) => String(n).padStart(2, '0')
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
export const addDays = (iso: string, n: number) => {
  const d = parse(iso)
  d.setDate(d.getDate() + n)
  return toIso(d)
}
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Cycle month (YYYY-MM) a date belongs to: the last day of a month already counts for the next one. */
export function cycleMonth(iso: string): string {
  const d = parse(iso)
  const isLastDay = parse(addDays(iso, 1)).getDate() === 1
  if (isLastDay) d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** [last day of the previous month, second-to-last day of this month] for a YYYY-MM cycle. */
export function cycleRange(month: string): [string, string] {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7)) - 1
  return [toIso(new Date(y, m, 0)), toIso(new Date(y, m + 1, -1))]
}

/** Monday of the week containing `iso`. */
const weekStart = (iso: string) => addDays(iso, -((parse(iso).getDay() + 6) % 7))

function bucketOf(iso: string, g: Granularity, ctx: LabelCtx): Bucket {
  if (g === 'day') {
    const label = parse(iso).toLocaleDateString(ctx.intl, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    return { key: iso, from: iso, to: iso, label, short: dm(iso) }
  }
  if (g === 'week') {
    const from = weekStart(iso)
    const to = addDays(from, 6)
    return { key: from, from, to, label: ctx.t('dash.weekRange', { from: dm(from), to: dm(to), year: to.slice(0, 4) }), short: dm(from) }
  }
  const month = cycleMonth(iso)
  const [from, to] = cycleRange(month)
  const n = Number(month.slice(5, 7))
  const monthName = new Date(Number(month.slice(0, 4)), n - 1, 1).toLocaleDateString(ctx.intl, { month: 'short' })
  return {
    key: month,
    from,
    to,
    label: ctx.t('dash.monthRange', { n, year: month.slice(0, 4), from: dm(from), to: dm(to) }),
    short: ctx.t('format.monthShort', { monthName, monthNumber: n, year: month.slice(0, 4) }),
  }
}

/** Every bucket touching [from, to], in order, including empty ones. */
export function buckets(from: string, to: string, g: Granularity, ctx: LabelCtx): Bucket[] {
  const out: Bucket[] = []
  let cursor = from
  while (cursor <= to) {
    const b = bucketOf(cursor, g, ctx)
    out.push(b)
    cursor = addDays(b.to, 1)
  }
  return out
}

export const bucketKey = (iso: string, g: Granularity) => (g === 'day' ? iso : g === 'week' ? weekStart(iso) : cycleMonth(iso))
