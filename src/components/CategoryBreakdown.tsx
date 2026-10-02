import { useState } from 'react'
import { cn } from '../lib/cn'
import { isAssignedAway } from '../lib/range'
import type { Transaction } from '../lib/types'
import { useI18n } from '../locales'
import type { MessageKey } from '../locales/en'
import { CategoryChart, type CatKind } from './CategoryChart'

const TABS: { id: CatKind; label: MessageKey; active: string; empty: MessageKey }[] = [
  { id: 'expense', label: 'tile.expense', active: 'bg-expense/15 text-expense', empty: 'cat.emptyRange' },
  { id: 'income', label: 'tile.income', active: 'bg-income/15 text-income', empty: 'cat.emptyIncome' },
  { id: 'transfer', label: 'list.transfers', active: 'bg-inc-4/15 text-inc-4', empty: 'cat.emptyTransfer' },
]

/** Category split of the selected period: spending, income, or money moved into savings / investments. */
export function CategoryBreakdown({ items, byDate, canAssign, className, stacked }: { items: Transaction[]; byDate: Transaction[]; canAssign: boolean; className?: string; stacked?: boolean }) {
  const { t } = useI18n()
  const [type, setType] = useState<CatKind>('expense')
  const tab = TABS.find((x) => x.id === type)!
  // On: also count the entries assigned to a month (forMonth set). Off: leave them out, only what is booked on its day.
  const [assigned, setAssigned] = useState(true)
  const useAssigned = canAssign && assigned

  const toolbar = (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div role="radiogroup" aria-label={t('form.type')} className="flex w-fit flex-wrap rounded-lg border border-border bg-surface-2 p-0.5">
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={type === x.id}
            onClick={() => setType(x.id)}
            className={cn('rounded-md px-2.5 py-1 text-xs transition-colors', type === x.id ? x.active : 'text-muted hover:text-fg')}
          >
            {t(x.label)}
          </button>
        ))}
      </div>
      {canAssign && (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input type="checkbox" role="switch" checked={assigned} onChange={(e) => setAssigned(e.target.checked)} className="size-3.5 accent-[var(--accent)]" />
          {t('cat.assignedToggle')}
        </label>
      )}
    </div>
  )

  return <CategoryChart className={className} stacked={stacked} items={useAssigned ? items : byDate} aside={canAssign && !useAssigned ? items.filter(isAssignedAway) : undefined} emptyText={t(tab.empty)} toolbar={toolbar} type={type} />
}
