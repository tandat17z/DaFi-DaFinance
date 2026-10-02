import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { todayIso } from '../lib/format'
import { rangeOf, shiftAnchor, type Unit } from '../lib/range'
import { usePeriodLabel } from '../lib/usePeriodLabel'
import { useI18n } from '../locales'
import { inSheet } from '../lib/sheet'
import { PeriodPicker } from './PeriodPicker'

/**
 * The one place to choose the month for the whole page: totals, charts, calendar, category split
 * and the transaction list all follow it. Clicking the month opens a picker to jump to another one.
 */
export function PeriodBar({
  unit,
  anchor,
  onChange,
  marked,
  className,
}: {
  unit: Unit
  anchor: string
  onChange: (next: { unit: Unit; anchor: string }) => void
  /** Dates (YYYY-MM-DD) that have transactions; shown as dots in the day calendar. */
  marked?: ReadonlySet<string>
  className?: string
}) {
  const { t } = useI18n()
  const label = usePeriodLabel()
  const today = todayIso()
  const [from, to] = rangeOf(unit, anchor)
  const isCurrent = today >= from && today <= to
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const arrow = 'grid size-6 shrink-0 place-items-center sm:size-8 rounded-lg text-muted hover:bg-surface-2 hover:text-fg'

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !inSheet(e.target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative flex items-center gap-x-2 sm:gap-x-3', className)}>
      <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
        <button type="button" aria-label={t('period.prev')} onClick={() => onChange({ unit, anchor: shiftAnchor(unit, anchor, -1) })} className={arrow}>
          ‹
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={t('period.pick')}
          onClick={() => setOpen((o) => !o)}
          className={cn('min-w-0 truncate rounded-lg px-0.5 py-1 text-center text-xs font-medium whitespace-nowrap sm:min-w-36 sm:px-2 sm:py-1.5 sm:text-sm transition-colors hover:bg-surface-2', open && 'bg-surface-2')}
        >
          <span className="sm:hidden">{`${Number(anchor.slice(5, 7))}/${anchor.slice(0, 4)}`}</span>
          <span className="hidden sm:inline">{label(unit, anchor)}</span>
          <span aria-hidden="true" className="ml-1.5 hidden text-xs text-subtle sm:inline">
            ▾
          </span>
        </button>
        <button type="button" aria-label={t('period.next')} onClick={() => onChange({ unit, anchor: shiftAnchor(unit, anchor, 1) })} className={arrow}>
          ›
        </button>
        {!isCurrent && (
          <button type="button" onClick={() => onChange({ unit, anchor: today })} className="ml-1 hidden shrink-0 rounded-lg border border-border px-2 py-0.5 sm:block text-xs text-muted hover:text-fg sm:px-2.5 sm:py-1">
            {t('cal.today')}
          </button>
        )}
      </div>
      {open && (
        <PeriodPicker
          key={unit}
          unit={unit}
          anchor={anchor}
          marked={marked}
          onClose={() => setOpen(false)}
          onPick={(next) => {
            onChange({ unit, anchor: next })
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
