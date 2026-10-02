import { useState, type FormEvent } from 'react'
import { categories, categoryKey } from '../config/categories'
import { cn } from '../lib/cn'
import { todayIso, useFormat } from '../lib/format'
import { useI18n } from '../locales'
import type { Transaction, TxType } from '../lib/types'
import { Button, Card, Label } from './ui'

/** Common amounts, one tap to fill the field. */
const QUICK: Record<TxType, number[]> = {
  expense: [20000, 50000, 100000, 200000, 500000],
  income: [1000000, 5000000, 10000000, 20000000],
}

type Draft = { type: TxType; amount: string; category: string; date: string; note: string; forMonth: string; time: string }

const empty = (): Draft => ({ type: 'expense', amount: '', category: categories.expense[0], date: todayIso(), note: '', forMonth: '', time: '' })
const fromTx = (t: Transaction): Draft => ({ ...t, category: categoryKey(t.category), amount: String(t.amount), forMonth: t.forMonth ?? '', time: t.time ?? '' })

/** Add/edit form. Remount with a new `key` to load a different transaction. */
export function TxForm({ editing, onSave, onCancel }: { editing: Transaction | null; onSave: (tx: Transaction) => Promise<boolean>; onCancel: () => void }) {
  const { t } = useI18n()
  const { formatShortVnd, categoryName } = useFormat()
  const [d, setD] = useState<Draft>(() => (editing ? fromTx(editing) : empty()))
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Math.round(Number(d.amount))
    if (!amount || amount <= 0 || saving) return
    setSaving(true)
    const ok = await onSave({ id: editing?.id ?? crypto.randomUUID(), type: d.type, amount, category: d.category, date: d.date, time: d.time || null, note: d.note.trim(), forMonth: d.forMonth || null })
    setSaving(false)
    // Keep the draft when saving failed so nothing typed is lost.
    if (ok) setD(empty())
  }

  // Time and "for month" are rarely needed: tucked into a disclosure that opens by itself when they have a value.
  const moreOpen = !!(d.time || d.forMonth)

  return (
    <Card title={editing ? t('form.edit') : t('form.add')} className="p-4 sm:p-5">
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label={t('form.type')}>
          {(['expense', 'income'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={d.type === type}
              onClick={() => set({ type, category: categories[type][0] })}
              className={cn(
                'rounded-md py-1.5 text-sm font-medium transition-colors',
                d.type === type ? (type === 'expense' ? 'bg-expense/15 text-expense' : 'bg-income/15 text-income') : 'text-muted hover:text-fg',
              )}
            >
              {type === 'expense' ? t('tile.expense') : t('tile.income')}
            </button>
          ))}
        </div>

        <Label text={t('form.amount')}>
          <div className="relative">
            <input className="field pr-28 font-mono text-lg" type="number" inputMode="numeric" min={1} step={1} required value={d.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="0" />
            <span className={cn('pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs', d.type === 'income' ? 'text-income' : 'text-expense')} aria-live="polite">
              {Number(d.amount) > 0 ? formatShortVnd(Math.round(Number(d.amount))) : ''}
            </span>
          </div>
        </Label>
        <div className="-mx-4 -mt-1 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden" aria-label={t('form.quick')}>
          {QUICK[d.type].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set({ amount: String(n) })}
              className={cn(
                'shrink-0 rounded-md border px-2.5 py-1 font-mono text-xs transition-colors',
                Number(d.amount) === n ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border text-muted hover:border-border-strong hover:text-fg',
              )}
            >
              {formatShortVnd(n)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
          <Label text={t('form.category')}>
            <select className="field" value={d.category} onChange={(e) => set({ category: e.target.value })}>
              {(categories[d.type].includes(d.category) ? categories[d.type] : [d.category, ...categories[d.type]]).map((c) => (
                <option key={c} value={c}>
                  {categoryName(c)}
                </option>
              ))}
            </select>
          </Label>
          <Label text={t('form.date')}>
            <input className="field min-w-0 appearance-none" type="date" required value={d.date} onChange={(e) => set({ date: e.target.value })} />
          </Label>
        </div>

        <Label text={t('form.note')}>
          <input className="field" maxLength={100} value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder={t('form.optional')} />
        </Label>

        <details open={moreOpen} className="group rounded-lg border border-border bg-surface-2/40 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-muted select-none hover:text-fg [&::-webkit-details-marker]:hidden">
            {t('form.more')}
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-2.5 grid gap-2.5">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
              <Label text={t('form.time')}>
                <input className="field min-w-0 appearance-none" type="time" value={d.time} onChange={(e) => set({ time: e.target.value })} />
              </Label>
              <Label text={t('form.forMonth')}>
                <input className="field min-w-0 appearance-none" type="month" value={d.forMonth} onChange={(e) => set({ forMonth: e.target.value })} />
              </Label>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] leading-snug text-subtle">{t('form.forMonthHint')}</span>
              {d.forMonth && (
                <Button type="button" onClick={() => set({ forMonth: '' })}>
                  {t('form.reset')}
                </Button>
              )}
            </div>
          </div>
        </details>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" className="flex-1 py-2.5" disabled={saving}>
            {saving ? t('form.saving') : editing ? t('form.update') : t('form.save')}
          </Button>
          {editing && (
            <Button type="button" onClick={onCancel}>
              {t('form.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
