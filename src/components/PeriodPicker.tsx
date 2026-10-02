import { useState } from 'react'
import { cn } from '../lib/cn'
import { todayIso, useFormat } from '../lib/format'
import { addDays } from '../lib/period'
import { rangeOf, type Unit } from '../lib/range'
import { useI18n } from '../locales'
import { Bubble } from './Bubble'

type View = 'days' | 'months' | 'years'

const WEEKDAYS = ['weekday.1', 'weekday.2', 'weekday.3', 'weekday.4', 'weekday.5', 'weekday.6', 'weekday.7'] as const
const pad = (n: number) => String(n).padStart(2, '0')
const mondayOf = (iso: string) => addDays(iso, -((new Date(`${iso}T00:00:00`).getDay() + 6) % 7))

/**
 * Calendar popover for choosing a specific day / week / month / year. Click the title to zoom out
 * (days → months → years); picking a month or year while choosing days just navigates.
 */
export function PeriodPicker({ unit, anchor, onPick, onClose, marked }: { unit: Unit; anchor: string; onPick: (anchor: string) => void; onClose: () => void; marked?: ReadonlySet<string> }) {
  const { t, intl } = useI18n()
  const { formatMonth } = useFormat()
  const [view, setView] = useState<View>(unit === 'year' ? 'years' : unit === 'month' ? 'months' : 'days')
  const [year, setYear] = useState(Number(anchor.slice(0, 4)))
  const [month0, setMonth0] = useState(Number(anchor.slice(5, 7)) - 1)
  const today = todayIso()
  const [from] = rangeOf(unit, anchor)

  const step = (dir: 1 | -1) => {
    if (view === 'years') setYear((y) => y + dir * 12)
    else if (view === 'months') setYear((y) => y + dir)
    else {
      const d = new Date(year, month0 + dir, 1)
      setYear(d.getFullYear())
      setMonth0(d.getMonth())
    }
  }

  const yearStart = Math.floor(year / 12) * 12
  const title = view === 'days' ? formatMonth(`${year}-${pad(month0 + 1)}`) : view === 'months' ? String(year) : `${yearStart} – ${yearStart + 11}`
  const zoomOut = () => {
    if (view === 'days') setView('months')
    else if (view === 'months' && unit !== 'year') setView('years')
  }

  const cell = 'rounded-lg py-2 text-sm transition-colors'
  const idle = 'text-fg hover:bg-surface-2'
  const selected = 'bg-accent font-semibold text-accent-fg'

  // Days view: whole weeks from the Monday on/before the 1st until the last day is covered.
  const first = `${year}-${pad(month0 + 1)}-01`
  const monthEnd = new Date(year, month0 + 1, 0).getDate()
  const last = `${year}-${pad(month0 + 1)}-${pad(monthEnd)}`
  const weeks: string[][] = []
  for (let start = mondayOf(first); start <= last; start = addDays(start, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)))

  return (
    <Bubble title={t('period.pick')} bare onClose={onClose} className="top-full right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)]">
      <div className="mb-2 flex items-center gap-1">
        <button type="button" aria-label={t('period.prev')} onClick={() => step(-1)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bg hover:text-fg">
          ‹
        </button>
        <button type="button" onClick={zoomOut} disabled={view === 'years' || (view === 'months' && unit === 'year')} className="flex-1 rounded-lg py-1.5 text-sm font-semibold hover:bg-bg disabled:pointer-events-none">
          {title}
        </button>
        <button type="button" aria-label={t('period.next')} onClick={() => step(1)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bg hover:text-fg">
          ›
        </button>
      </div>

      {view === 'days' && (
        <div>
          <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-subtle">
            {WEEKDAYS.map((w) => (
              <span key={w}>{t(w)}</span>
            ))}
          </div>
          <div className="grid gap-y-0.5">
            {weeks.map((week) => (
              <div key={week[0]} className={cn('grid grid-cols-7 rounded-lg', unit === 'week' && (week[0] === from ? 'bg-accent/15' : 'hover:bg-bg'))}>
                {week.map((d) => {
                  const inMonth = d >= first && d <= last
                  const isSel = unit === 'day' && d === anchor
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-label={d}
                      aria-pressed={isSel}
                      onClick={() => onPick(d)}
                      className={cn('relative grid h-9 place-items-center rounded-lg text-sm transition-colors', isSel ? selected : unit === 'week' ? 'text-fg' : idle, !inMonth && !isSel && 'opacity-35', d === today && !isSel && 'font-semibold text-accent')}
                    >
                      {Number(d.slice(8, 10))}
                      {marked?.has(d) && <span aria-hidden="true" className={cn('absolute bottom-1 size-1 rounded-full', isSel ? 'bg-accent-fg' : 'bg-expense')} />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'months' && (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => {
            const label = new Date(year, i, 1).toLocaleDateString(intl, { month: 'short' })
            const isSel = unit === 'month' && `${year}-${pad(i + 1)}` === anchor.slice(0, 7)
            const isNow = `${year}-${pad(i + 1)}` === today.slice(0, 7)
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (unit === 'month') onPick(`${year}-${pad(i + 1)}-01`)
                  else {
                    setMonth0(i)
                    setView('days')
                  }
                }}
                className={cn(cell, isSel ? selected : idle, isNow && !isSel && 'font-semibold text-accent')}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {view === 'years' && (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => {
            const y = yearStart + i
            const isSel = unit === 'year' && y === Number(anchor.slice(0, 4))
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  if (unit === 'year') onPick(`${y}-${anchor.slice(5, 7)}-01`)
                  else {
                    setYear(y)
                    setView('months')
                  }
                }}
                className={cn(cell, isSel ? selected : idle, y === Number(today.slice(0, 4)) && !isSel && 'font-semibold text-accent')}
              >
                {y}
              </button>
            )
          })}
        </div>
      )}

      <button type="button" onClick={() => onPick(today)} className="mt-2 w-full rounded-lg border border-border py-1.5 text-xs text-muted hover:bg-bg hover:text-fg">
        {t('cal.today')}
      </button>
    </Bubble>
  )
}
