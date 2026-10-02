import { useCallback, useMemo, useState } from 'react'
import { cn } from '../lib/cn'
import { shiftMonth, todayIso, useFormat } from '../lib/format'
import { useI18n } from '../locales'
import type { MessageKey } from '../locales/en'
import { isAssignedAway } from '../lib/range'
import { isTransfer } from '../lib/transfers'
import { addDays, type Bucket, bucketKey, buckets, cycleMonth, cycleRange, type Granularity } from '../lib/period'
import type { Transaction } from '../lib/types'
import { CategoryChart } from './CategoryChart'
import { Card, Label, StatTile } from './ui'

const GRANULARITIES: { id: Granularity; label: MessageKey; unit: MessageKey; units: MessageKey }[] = [
  { id: 'day', label: 'dash.day', unit: 'dash.unitDay', units: 'dash.unitDays' },
  { id: 'week', label: 'dash.week', unit: 'dash.unitWeek', units: 'dash.unitWeeks' },
  { id: 'month', label: 'dash.month', unit: 'dash.unitMonth', units: 'dash.unitMonths' },
]

type Range = { from: string; to: string; g: Granularity }

function presets(items: Transaction[]): { id: string; label: MessageKey; range: () => Range }[] {
  const today = todayIso()
  const cycle = cycleMonth(today)
  return [
    { id: 'cycle', label: 'dash.thisMonth', range: () => ({ ...toRange(cycleRange(cycle)), g: 'day' }) },
    { id: '30d', label: 'dash.d30', range: () => ({ from: addDays(today, -29), to: today, g: 'day' }) },
    { id: '3m', label: 'dash.m3', range: () => ({ from: cycleRange(shiftMonth(cycle, -2))[0], to: today, g: 'week' }) },
    { id: '12m', label: 'dash.m12', range: () => ({ from: cycleRange(shiftMonth(cycle, -11))[0], to: today, g: 'month' }) },
    { id: 'year', label: 'dash.year', range: () => ({ from: cycleRange(`${today.slice(0, 4)}-01`)[0], to: today, g: 'month' }) },
    {
      id: 'all',
      label: 'dash.all',
      range: () => {
        const dates = items.map((t) => t.date).sort()
        return { from: dates[0] ?? today, to: dates.at(-1) ?? today, g: 'month' }
      },
    },
  ]
}
const toRange = ([from, to]: [string, string]) => ({ from, to })

interface Row extends Bucket {
  income: number
  expense: number
}

export function Dashboard({ items, loading }: { items: Transaction[]; loading: boolean }) {
  const { t, intl } = useI18n()
  const { formatShortVnd, formatVnd } = useFormat()
  const [range, setRange] = useState<Range>(() => presets([])[0].range())
  const [preset, setPreset] = useState<string | null>('cycle')
  const [active, setActive] = useState<number | null>(null)
  const { from, to, g } = range
  const gran = GRANULARITIES.find((x) => x.id === g)!
  const unit = t(gran.unit)
  const units = t(gran.units)

  // Assigned to a month (forMonth set, even when it equals the month of its date): counted for that whole month,
  // so it only shows when grouping by month and never on a single day / week. Everything else counts by its date.
  const keyOf = useCallback((x: Transaction) => (g === 'month' && x.forMonth ? x.forMonth : bucketKey(x.date, g)), [g])
  const { inRange, rows } = useMemo(() => {
    const list: Row[] = buckets(from, to, g, { intl, t }).map((b) => ({ ...b, income: 0, expense: 0 }))
    const byKey = new Map(list.map((r) => [r.key, r]))
    const inRange = items.filter((x) => !isTransfer(x) && (g === 'month' ? byKey.has(keyOf(x)) : !isAssignedAway(x) && x.date >= from && x.date <= to))
    for (const x of inRange) {
      const r = byKey.get(keyOf(x))
      if (r) r[x.type] += x.amount
    }
    return { inRange, rows: list }
  }, [items, keyOf, from, to, g, intl, t])

  const income = rows.reduce((s, r) => s + r.income, 0)
  const expense = rows.reduce((s, r) => s + r.expense, 0)
  const peak = rows.reduce<Row | null>((best, r) => (r.expense > (best?.expense ?? 0) ? r : best), null)
  const max = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expense)))
  const shown = active === null ? null : rows[active]
  const labelStep = Math.ceil(rows.length / 10)

  const update = (next: Partial<Range>) => {
    setPreset(null)
    setActive(null)
    setRange((r) => {
      const merged = { ...r, ...next }
      // Keep from ≤ to by moving the other end.
      if (merged.from > merged.to) return next.from ? { ...merged, to: merged.from } : { ...merged, from: merged.to }
      return merged
    })
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border border-border bg-surface p-4">
        <div role="group" aria-label={t('dash.quick')} className="flex w-full flex-wrap gap-1.5">
          {presets(items).map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => {
                setRange(p.range())
                setPreset(p.id)
                setActive(null)
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                preset === p.id ? 'border-accent/60 bg-accent/10 text-fg' : 'border-border text-muted hover:text-fg',
              )}
            >
              {t(p.label)}
            </button>
          ))}
        </div>
        <Label text={t('dash.from')}>
          <input type="date" className="field" value={from} max={to} onChange={(e) => e.target.value && update({ from: e.target.value })} />
        </Label>
        <Label text={t('dash.to')}>
          <input type="date" className="field" value={to} min={from} onChange={(e) => e.target.value && update({ to: e.target.value })} />
        </Label>
        <div className="grid gap-1.5 text-xs text-muted">
          {t('dash.groupBy')}
          <div role="radiogroup" aria-label={t('dash.groupBy')} className="flex rounded-lg border border-border bg-surface-2 p-0.5">
            {GRANULARITIES.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={g === x.id}
                onClick={() => update({ g: x.id })}
                className={cn('rounded-md px-3 py-1.5 text-sm transition-colors', g === x.id ? 'bg-border-strong text-fg' : 'text-muted hover:text-fg')}
              >
                {t(x.label)}
              </button>
            ))}
          </div>
        </div>
        {g === 'month' && <p className="text-xs text-subtle sm:ml-auto sm:max-w-56">{t('dash.cycleNote')}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t('tile.income')} dot="bg-income" loading={loading} value={formatVnd(income)} valueClass="text-income" sub={t('tile.count', { count: inRange.filter((x) => x.type === 'income').length })} />
        <StatTile label={t('tile.expense')} dot="bg-expense" loading={loading} value={formatVnd(expense)} valueClass="text-expense" sub={t('tile.count', { count: inRange.filter((x) => x.type === 'expense').length })} />
        <StatTile label={t('tile.balance')} loading={loading} value={formatVnd(income - expense)} valueClass={income - expense < 0 ? 'text-expense' : 'text-fg'} sub={`${rows.length} ${units}`} />
        <StatTile
          label={t('dash.avg', { unit })}
          loading={loading}
          value={formatVnd(Math.round(expense / Math.max(1, rows.length)))}
          sub={peak ? t('dash.peak', { label: peak.short, amount: formatShortVnd(peak.expense) }) : t('dash.noSpending')}
        />
      </div>

      <Card
        title={t('dash.byUnit', { unit })}
        action={
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-sm bg-income" />
              {t('dash.income')}
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-sm bg-expense" />
              {t('dash.expense')}
            </span>
          </div>
        }
      >
        {/* Readout: details of the hovered / tapped bucket, so nothing floats over the bars. */}
        <div aria-live="polite" className="mb-3 flex min-h-10 flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg bg-surface-2 px-3 py-2 text-xs">
          {shown ? (
            <>
              <span className="font-medium text-fg">{shown.label}</span>
              <span className="text-muted">
                {t('dash.income')} <span className="font-mono text-fg tabular-nums">{formatVnd(shown.income)}</span>
              </span>
              <span className="text-muted">
                {t('dash.expense')} <span className="font-mono text-fg tabular-nums">{formatVnd(shown.expense)}</span>
              </span>
              <span className="text-muted">
                {t('dash.balance')} <span className="font-mono text-fg tabular-nums">{formatVnd(shown.income - shown.expense)}</span>
              </span>
            </>
          ) : (
            <span className="text-subtle">{t('dash.readout')}</span>
          )}
        </div>

        <div className="flex gap-2">
          <div aria-hidden="true" className="flex h-48 flex-col justify-between py-0 text-right font-mono text-[10px] leading-none text-subtle">
            <span>{formatShortVnd(max)}</span>
            <span>{formatShortVnd(Math.round(max / 2))}</span>
            <span>0</span>
          </div>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="relative flex h-48 items-end" style={{ minWidth: rows.length * 8 }} onMouseLeave={() => setActive(null)}>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                <span className="border-t border-border" />
                <span className="border-t border-dashed border-border" />
                <span className="border-t border-border-strong" />
              </div>
              {rows.map((r, i) => (
                <button
                  key={r.key}
                  type="button"
                  aria-label={t('dash.barAria', { label: r.label, income: formatVnd(r.income), expense: formatVnd(r.expense) })}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className={cn('relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-t-sm px-px', active === i && 'bg-surface-2')}
                >
                  <span className="w-[38%] max-w-4 rounded-t bg-income" style={{ height: `${(r.income / max) * 100}%` }} />
                  <span className="w-[38%] max-w-4 rounded-t bg-expense" style={{ height: `${(r.expense / max) * 100}%` }} />
                </button>
              ))}
            </div>
            <div aria-hidden="true" className="mt-1.5 flex font-mono text-[10px] text-subtle" style={{ minWidth: rows.length * 8 }}>
              {rows.map((r, i) => (
                <span key={r.key} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
                  {i % labelStep === 0 ? r.short : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-xs text-muted hover:text-fg">{t('dash.table')}</summary>
          <div className="mt-3 max-h-80 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface text-subtle">
                <tr>
                  <th className="py-1.5 font-normal">{t('dash.period')}</th>
                  <th className="py-1.5 text-right font-normal">{t('dash.income')}</th>
                  <th className="py-1.5 text-right font-normal">{t('dash.expense')}</th>
                  <th className="py-1.5 text-right font-normal">{t('dash.balance')}</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {[...rows].reverse().map((r) => (
                  <tr key={r.key} className="border-t border-border">
                    <td className="py-1.5 font-sans">{r.label}</td>
                    <td className="py-1.5 text-right">{formatVnd(r.income)}</td>
                    <td className="py-1.5 text-right">{formatVnd(r.expense)}</td>
                    <td className={cn('py-1.5 text-right', r.income - r.expense < 0 && 'text-expense')}>{formatVnd(r.income - r.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      <CategoryChart items={inRange} emptyText={t('cat.emptyRange')} />
    </div>
  )
}
