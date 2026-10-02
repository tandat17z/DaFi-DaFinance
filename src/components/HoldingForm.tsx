import { useState, type FormEvent } from 'react'
import { cn } from '../lib/cn'
import { todayIso, useFormat } from '../lib/format'
import { valueOf } from '../lib/holdings'
import type { Holding, HoldingKind } from '../lib/types'
import { useI18n } from '../locales'
import { Button, Card, Label } from './ui'

const KINDS: HoldingKind[] = ['savings', 'investment']

type Draft = { kind: HoldingKind; name: string; principal: string; currentValue: string; annualRate: string; startDate: string; note: string; deduct: boolean }
const empty = (): Draft => ({ kind: 'savings', name: '', principal: '', currentValue: '', annualRate: '', startDate: todayIso(), note: '', deduct: true })
const fromHolding = (h: Holding): Draft => ({
  kind: h.kind,
  name: h.name,
  principal: String(h.principal),
  currentValue: String(h.currentValue),
  annualRate: h.annualRate === null ? '' : String(h.annualRate),
  startDate: h.startDate,
  note: h.note,
  deduct: false,
})

/** Add / edit a savings deposit or investment. Remount with a new `key` to load a different holding. */
export function HoldingForm({ editing, onSave, onCancel }: { editing: Holding | null; onSave: (h: Holding, deduct: boolean) => Promise<boolean>; onCancel: () => void }) {
  const { t } = useI18n()
  const { formatVnd, categoryName } = useFormat()
  const [d, setD] = useState<Draft>(() => (editing ? fromHolding(editing) : empty()))
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }))
  const principal = Math.round(Number(d.principal))
  // A rate makes the value automatic (simple interest since the start date).
  const auto = d.annualRate !== ''
  const autoValue = auto && principal >= 0 ? valueOf({ id: '', kind: d.kind, name: '', principal, currentValue: principal, annualRate: Number(d.annualRate), startDate: d.startDate, note: '' }) : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const rate = d.annualRate === '' ? null : Number(d.annualRate)
    const base = { id: editing?.id ?? crypto.randomUUID(), kind: d.kind, name: d.name.trim(), principal, annualRate: rate, startDate: d.startDate, note: d.note.trim() }
    // With a rate the value is computed from it (stored as a snapshot); otherwise use what was typed.
    const currentValue = rate !== null ? valueOf({ ...base, currentValue: principal }) : d.currentValue === '' ? principal : Math.round(Number(d.currentValue))
    if (!d.name.trim() || !(principal >= 0) || !(currentValue >= 0) || saving) return
    setSaving(true)
    const ok = await onSave(
      { ...base, currentValue },
      !editing && d.deduct && principal > 0,
    )
    setSaving(false)
    // Keep the draft when saving failed so nothing typed is lost.
    if (ok) setD(empty())
  }

  return (
    <Card title={editing ? t('pf.edit') : t('pf.add')}>
      <form onSubmit={submit} className="grid gap-3.5">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-1" role="radiogroup" aria-label={t('pf.kind')}>
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={d.kind === k}
              onClick={() => set({ kind: k })}
              className={cn('rounded-md py-1.5 text-sm font-medium transition-colors', d.kind === k ? 'bg-accent/15 text-accent' : 'text-muted hover:text-fg')}
            >
              {t(k === 'savings' ? 'pf.savings' : 'pf.investment')}
            </button>
          ))}
        </div>

        <Label text={t('pf.name')}>
          <input className="field" required maxLength={100} value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('pf.namePlaceholder')} />
        </Label>

        <div className="grid grid-cols-2 gap-3">
          <Label text={t('pf.principal')}>
            <input className="field font-mono" type="number" inputMode="numeric" min={0} step={1} required value={d.principal} onChange={(e) => set({ principal: e.target.value })} placeholder="0" />
          </Label>
          <Label text={t('pf.currentValue')}>
            <input className="field font-mono disabled:opacity-60" type="number" inputMode="numeric" min={0} step={1} disabled={auto} value={auto ? (autoValue ?? '') : d.currentValue} onChange={(e) => set({ currentValue: e.target.value })} placeholder={d.principal || '0'} />
            {auto && <span className="text-xs text-subtle">{t('pf.autoValue')}</span>}
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Label text={t('pf.rate')}>
            <input className="field font-mono" type="number" inputMode="decimal" min={0} max={1000} step="0.01" value={d.annualRate} onChange={(e) => set({ annualRate: e.target.value })} placeholder={t('form.optional')} />
          </Label>
          <Label text={t('pf.startDate')}>
            <input className="field" type="date" required value={d.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </Label>
        </div>

        <Label text={t('form.note')}>
          <input className="field" maxLength={100} value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder={t('form.optional')} />
        </Label>

        {!editing && principal > 0 && (
          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 p-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" checked={d.deduct} onChange={(e) => set({ deduct: e.target.checked })} />
            <span>
              {t('pf.deduct', { amount: formatVnd(principal) })}
              <span className="mt-0.5 block text-xs text-subtle">{t('pf.deductHint', { category: categoryName(d.kind) })}</span>
            </span>
          </label>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
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
