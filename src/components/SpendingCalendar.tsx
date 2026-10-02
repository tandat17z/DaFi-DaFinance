import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { todayIso, useFormat } from '../lib/format'
import { effectiveMonth, isAssignedAway, rangeOf, type Unit } from '../lib/range'
import { isSpending, isTransfer } from '../lib/transfers'
import { useI18n } from '../locales'
import type { Transaction } from '../lib/types'
import { inSheet } from '../lib/sheet'
import { Bubble } from './Bubble'
import { Card } from './ui'

const WEEKDAYS = ['weekday.1', 'weekday.2', 'weekday.3', 'weekday.4', 'weekday.5', 'weekday.6', 'weekday.7'] as const
/** Heat steps for a day's expense relative to the month's biggest day. */
const HEAT = ['bg-expense/10', 'bg-expense/20', 'bg-expense/35', 'bg-expense/55']

const iso = (month: string, day: number) => `${month}-${String(day).padStart(2, '0')}`

/** Month grid shaded by daily expense; clicking a day opens a bubble listing that day's entries. Shows the month of the page period. */
export function SpendingCalendar({ all, anchor, unit }: { all: Transaction[]; anchor: string; unit: Unit }) {
  const month = anchor.slice(0, 7)
  const label = `${Number(month.slice(5, 7))}/${month.slice(0, 4)}` // numeric, e.g. 10/2026
  const [from, to] = rangeOf(unit, anchor)
  // For a day or a week, the days outside it are dimmed so the selected span stands out.
  const { t } = useI18n()
  const { formatDayHeader, formatMonth, formatShortVnd, formatVnd } = useFormat()
  const items = useMemo(() => all.filter((x) => x.date.startsWith(month)), [all, month])
  // Totals of everything assigned to this month (forMonth), wherever its date falls.
  const assigned = useMemo(() => {
    const income: Transaction[] = []
    const expense: Transaction[] = []
    for (const x of all) {
      if (isTransfer(x) || effectiveMonth(x) !== month) continue
      ;(x.type === 'income' ? income : expense).push(x)
    }
    const byDate = (a: Transaction, b: Transaction) => a.date.localeCompare(b.date)
    return { income: income.sort(byDate), expense: expense.sort(byDate) }
  }, [all, month])
  const sum = (list: Transaction[]) => list.reduce((s, x) => s + x.amount, 0)
  // Which month total is open (its entries listed in a bubble, like a day).
  const [panel, setPanel] = useState<'income' | 'expense' | null>(null)
  const tiles = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!panel) return
    const onDown = (e: PointerEvent) => {
      if (!tiles.current?.contains(e.target as Node) && !inSheet(e.target)) setPanel(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [panel])
  const [selected, setSelected] = useState<string | null>(null)
  // Open the day bubble above the cell when there is not enough room below it in the window.
  const [flipUp, setFlipUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const today = todayIso()

  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  const daysInMonth = new Date(y, m, 0).getDate()
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7

  const byDay = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const x of items) map.set(x.date, [...(map.get(x.date) ?? []), x])
    return map
  }, [items])
  // Entries booked for another month are counted in the month totals above, not in the day cells.
  const expenseOf = (d: string) => (byDay.get(d) ?? []).reduce((s, x) => s + (isSpending(x) && !isAssignedAway(x) ? x.amount : 0), 0)
  const incomeOf = (d: string) => (byDay.get(d) ?? []).reduce((s, x) => s + (x.type === 'income' && !isAssignedAway(x) ? x.amount : 0), 0)
  const max = Math.max(1, ...Array.from({ length: daysInMonth }, (_, i) => expenseOf(iso(month, i + 1))))
  // Width of one colour level: a quarter of the biggest day, rounded up to a multiple of 100k so the limits are round numbers.
  const step = Math.max(100_000, Math.ceil(max / HEAT.length / 100_000) * 100_000)

  useEffect(() => {
    if (!selected) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !inSheet(e.target)) setSelected(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [selected])

  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  return (
    <Card
      className="flex flex-col lg:min-h-0"
      title={t('cal.title')}
      action={<span className="font-mono text-xs text-muted">{formatMonth(month)}</span>}
    >
      <div ref={tiles} className="relative mb-3">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 text-xs">
          {(['income', 'expense'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-expanded={panel === kind}
              onClick={() => {
                setSelected(null)
                setPanel(panel === kind ? null : kind)
              }}
              className={cn('grid gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-bg/40', panel === kind && 'bg-bg/60')}
            >
              <span className="text-subtle">{t(kind === 'income' ? 'cal.assignedIncome' : 'cal.assignedExpense', { month: label })}</span>
              <span className={cn('font-mono tabular-nums', kind === 'income' ? 'text-income' : 'text-expense')}>{formatVnd(sum(assigned[kind]))}</span>
            </button>
          ))}
        </div>
        {panel && <MonthBubble kind={panel} title={t(panel === 'income' ? 'cal.assignedIncome' : 'cal.assignedExpense', { month: label })} items={assigned[panel]} onClose={() => setPanel(null)} />}
      </div>
      {/* Each shade is one `step` of daily spending (round multiples of 100k); days booked for a whole month are not in these amounts. */}
      <div className="mb-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10px] text-subtle" aria-label={t('cal.heatLegend')}>
        {HEAT.map((h, i) => {
          const lo = step * i
          const hi = step * (i + 1)
          const range = i === 0 ? `< ${formatShortVnd(hi)}` : i === HEAT.length - 1 ? `≥ ${formatShortVnd(lo)}` : `${formatShortVnd(lo)} – ${formatShortVnd(hi)}`
          return (
            <span key={h} className="flex items-center gap-1">
              <span aria-hidden="true" className={cn('size-3 rounded-sm', h)} />
              <span className="font-mono tabular-nums">{range}</span>
            </span>
          )
        })}
      </div>
      <div ref={ref} className="relative lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] font-medium tracking-wide text-subtle">
          {WEEKDAYS.map((w) => (
            <span key={w}>{t(w)}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 lg:min-h-0 lg:flex-1 lg:auto-rows-fr">
          {cells.map((day, i) => {
            if (day === null) return <span key={`e${i}`} />
            const d = iso(month, day)
            const spent = expenseOf(d)
            const earned = incomeOf(d)
            const list = byDay.get(d) ?? []
            // Entries booked for another month: a green tick for income, a red one for spending.
            const awayIncome = list.some((x) => isAssignedAway(x) && x.type === 'income')
            const awayExpense = list.some((x) => isAssignedAway(x) && isSpending(x))
            const saved = list.some(isTransfer) // money moved into savings / investments that day: a blue tick
            const hasAway = awayIncome || awayExpense || saved
            const heat = spent > 0 ? HEAT[Math.min(HEAT.length - 1, Math.floor(spent / step))] : ''
            const col = i % 7
            const open = selected === d
            return (
              <div key={d} className="relative lg:min-h-0">
                <button
                  type="button"
                  aria-label={`${t('cal.dayAria', { day: formatDayHeader(d), amount: formatVnd(spent), count: list.length })}${earned > 0 ? `, +${formatVnd(earned)}` : ''}${hasAway ? `, ${t('cal.hasAway')}` : ''}`}
                  aria-expanded={open}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    setFlipUp(window.innerHeight - r.bottom < 380 && r.top > 380)
                    setPanel(null)
                    setSelected(open ? null : d)
                  }}
                  className={cn(
                    'flex aspect-square w-full flex-col lg:aspect-auto lg:h-full items-start justify-between rounded-lg border p-1 text-left transition-colors sm:p-1.5',
                    heat || 'bg-surface-2/40',
                    (unit === 'day' || unit === 'week') && (d < from || d > to) && 'opacity-40',
                    open ? 'border-accent' : d === today ? 'border-accent/50' : 'border-transparent hover:border-border-strong',
                  )}
                >
                  <span className="flex w-full items-start justify-between gap-1">
                    <span className={cn('flex items-center gap-0.5 text-[11px] leading-none', d === today ? 'font-semibold text-accent' : 'text-muted')}>
                      {day}
                      {hasAway && (
                        <span title={t('cal.hasAway')} aria-hidden="true" className="flex text-[10px] leading-none font-bold">
                          {awayIncome && <span className="text-income">✓</span>}
                          {awayExpense && <span className="text-expense">✓</span>}
                          {saved && <span className="text-inc-4">✓</span>}
                        </span>
                      )}
                    </span>
                    {earned > 0 && <span className="truncate font-mono text-[9px] leading-none text-income tabular-nums sm:text-[10px]">+{formatShortVnd(earned)}</span>}
                  </span>
                  <span className="w-full truncate text-right font-mono text-[9px] leading-none text-fg tabular-nums sm:text-[10px]">{spent > 0 ? formatShortVnd(spent) : ''}</span>
                </button>
                {open && <DayBubble date={d} items={list} align={col <= 1 ? 'left' : col >= 5 ? 'right' : 'center'} above={flipUp} onClose={() => setSelected(null)} />}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

/** Entries counted for the whole month (income or spending), listed like a day bubble, each with its own date. */
function MonthBubble({ kind, title, items, onClose }: { kind: 'income' | 'expense'; title: string; items: Transaction[]; onClose: () => void }) {
  const { t } = useI18n()
  const { formatVnd, categoryName } = useFormat()
  const total = items.reduce((s, x) => s + x.amount, 0)
  return (
    <Bubble title={title} onClose={onClose} className="inset-x-0 top-full mt-2">
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-subtle max-sm:text-sm">{t('cal.none')}</p>
      ) : (
        <>
          <ul className="grid max-h-56 gap-1 overflow-auto max-sm:max-h-none">
            {items.map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs max-sm:text-sm">
                <span className="w-10 shrink-0 font-mono text-subtle">
                  {x.date.slice(8, 10)}/{x.date.slice(5, 7)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{categoryName(x.category)}</span>
                  {x.note && <span className="block truncate text-[11px] text-muted max-sm:text-xs">{x.note}</span>}
                </span>
                <span className={cn('font-mono whitespace-nowrap tabular-nums', kind === 'income' ? 'text-income' : 'text-fg')}>
                  {kind === 'income' ? '+' : '−'}
                  {formatVnd(x.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-xs text-muted max-sm:text-sm">
            {t(kind === 'income' ? 'cal.totalIncome' : 'cal.totalSpent')}
            <span className={cn('font-mono tabular-nums', kind === 'income' ? 'text-income' : 'text-expense')}>{formatVnd(total)}</span>
          </div>
        </>
      )}
    </Bubble>
  )
}

function DayBubble({ date, items, align, above, onClose }: { date: string; items: Transaction[]; align: 'left' | 'center' | 'right'; above: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const { formatDayHeader, formatVnd, categoryName } = useFormat()
  const expense = items.filter((x) => isSpending(x) && !isAssignedAway(x)).reduce((s, x) => s + x.amount, 0)
  const away = items.filter((x) => isAssignedAway(x) && !isTransfer(x))
  const moved = items.filter(isTransfer).reduce((s, x) => s + x.amount, 0)
  const income = items.filter((x) => x.type === 'income' && !isAssignedAway(x)).reduce((s, x) => s + x.amount, 0)
  const pos = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
  const arrow = align === 'left' ? 'left-4' : align === 'right' ? 'right-4' : 'left-1/2 -translate-x-1/2'
  return (
    <Bubble
      title={formatDayHeader(date)}
      onClose={onClose}
      className={cn('w-64 max-w-[80vw]', pos, above ? 'bottom-full mb-2' : 'top-full mt-2')}
      arrow={<span aria-hidden="true" className={cn('absolute size-3 rotate-45 border-border-strong bg-surface-2', arrow, above ? '-bottom-1.5 border-r border-b' : '-top-1.5 border-t border-l')} />}
    >
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-subtle max-sm:text-sm">{t('cal.none')}</p>
      ) : (
        <>
          <ul className="grid max-h-56 gap-1 overflow-auto max-sm:max-h-none">
            {items.map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs max-sm:text-sm">
                <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', x.type === 'income' ? 'bg-income' : isTransfer(x) ? 'bg-inc-4' : 'bg-expense')} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{categoryName(x.category)}</span>
                  {x.note && <span className="block truncate text-[11px] text-muted max-sm:text-xs">{x.note}</span>}
                  {x.forMonth && (
                    <span className="block truncate text-[10px] text-subtle max-sm:text-xs">{t('list.forMonth', { month: `${Number(x.forMonth.slice(5, 7))}/${x.forMonth.slice(0, 4)}` })}</span>
                  )}
                </span>
                <span className={cn('font-mono whitespace-nowrap tabular-nums', x.type === 'income' ? 'text-income' : isTransfer(x) ? 'text-inc-4' : 'text-fg')}>
                  {x.type === 'income' ? '+' : '−'}
                  {formatVnd(x.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid gap-0.5 border-t border-border pt-2 text-xs max-sm:text-sm">
            <div className="flex justify-between text-muted">
              {t('cal.totalSpent')} <span className="font-mono text-expense tabular-nums">{formatVnd(expense)}</span>
            </div>
            {moved > 0 && (
              <div className="flex justify-between text-muted">
                {t('tile.moved')} <span className="font-mono text-inc-4 tabular-nums">{formatVnd(moved)}</span>
              </div>
            )}
            {income > 0 && (
              <div className="flex justify-between text-muted">
                {t('cal.totalIncome')} <span className="font-mono text-income tabular-nums">{formatVnd(income)}</span>
              </div>
            )}
            {away.length > 0 && (
              <div className="flex justify-between text-subtle">
                {t('cal.away')} <span className="font-mono tabular-nums">{formatVnd(away.reduce((s, x) => s + (x.type === 'income' ? x.amount : -x.amount), 0))}</span>
              </div>
            )}
          </div>
        </>
      )}
    </Bubble>
  )
}
