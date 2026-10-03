import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { categoryKey } from '../config/categories'
import { useCategories } from '../lib/settings'
import { useFormat } from '../lib/format'
import { useI18n } from '../locales'
import type { Transaction } from '../lib/types'
import { Button } from './ui'

const WIDTH = 304
/** Below this width the form is a bottom sheet: a floating bubble gets lost behind the phone keyboard. */
const SHEET_MAX = 640

/** Edit button that opens a small bubble next to it to change a transaction in place. */
export function EditBubble({ tx, label, children, onSave }: { tx: Transaction; label: string; children: ReactNode; onSave: (tx: Transaction) => Promise<boolean> }) {
  const { t } = useI18n()
  const { categoryName } = useFormat()
  const cats = useCategories()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [sheet, setSheet] = useState(false)
  const [d, setD] = useState({ amount: '', category: '', date: '', time: '', note: '', forMonth: '' })
  const root = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLFormElement>(null)
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }))

  useEffect(() => {
    if (!open) return
    const inside = (e: Event) => e.target instanceof Node && (root.current?.contains(e.target) || panel.current?.contains(e.target))
    const onDown = (e: Event) => !inside(e) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    // Sheet: the backdrop closes it; opening the keyboard scrolls / resizes the page and must not.
    if (sheet) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
    // Fixed to the viewport (the list scrolls and would clip it), so close when something else scrolls.
    const onScroll = (e: Event) => !inside(e) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    const onResize = () => setOpen(false)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, sheet])

  const openBubble = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (open) return setOpen(false)
    const r = e.currentTarget.getBoundingClientRect()
    setSheet(window.innerWidth < SHEET_MAX)
    setPos({
      top: window.innerHeight - r.bottom < 420 ? Math.max(8, r.top - 410) : r.bottom + 4,
      left: Math.max(8, Math.min(r.right - WIDTH, window.innerWidth - WIDTH - 8)),
    })
    setD({ amount: String(tx.amount), category: categoryKey(tx.category), date: tx.date, time: tx.time ?? '', note: tx.note, forMonth: tx.forMonth ?? '' })
    setOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Math.round(Number(d.amount))
    if (!amount || amount <= 0 || saving) return
    setSaving(true)
    const ok = await onSave({ ...tx, amount, category: d.category, date: d.date, time: d.time || null, note: d.note.trim(), forMonth: d.forMonth || null })
    setSaving(false)
    if (ok) setOpen(false)
  }

  const base = tx.type === 'expense' ? cats.expenseWithTransfers : cats.income
  const options = base.includes(d.category) ? base : [d.category, ...base]

  return (
    <span ref={root}>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={openBubble} className="rounded-md px-2.5 py-1.5 text-muted hover:bg-bg hover:text-fg active:bg-bg [@media(pointer:coarse)]:min-h-10 [@media(pointer:coarse)]:px-3.5">
        {children}
      </button>
      {open &&
        createPortal(
          <>
            {sheet && <div aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/60" />}
          <form
            ref={panel}
            role="dialog"
            aria-label={t('form.edit')}
            onSubmit={submit}
            style={sheet ? undefined : { top: pos.top, left: pos.left, width: WIDTH }}
            className={
              sheet
                ? 'edit-sheet fixed inset-x-0 bottom-0 z-50 grid max-h-[85dvh] gap-3 overflow-y-auto rounded-t-2xl border border-border-strong bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg shadow-black/60'
                : 'fixed z-50 grid gap-2.5 rounded-xl border border-border-strong bg-surface p-3 shadow-lg shadow-black/40'
            }
          >
            <label className="grid gap-1 text-xs text-muted">
              {t('form.amount')}
              <input autoFocus={!sheet} className="field font-mono" type="number" inputMode="numeric" min={1} step={1} required value={d.amount} onChange={(e) => set({ amount: e.target.value })} />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              {t('form.category')}
              <select className="field" value={d.category} onChange={(e) => set({ category: e.target.value })}>
                {options.map((c) => (
                  <option key={c} value={c}>
                    {cats.iconOf(c)} {categoryName(c)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs text-muted">
                {t('form.date')}
                <input className="field" type="date" required value={d.date} onChange={(e) => set({ date: e.target.value })} />
              </label>
              <label className="grid gap-1 text-xs text-muted">
                {t('form.time')}
                <input className="field" type="time" value={d.time} onChange={(e) => set({ time: e.target.value })} />
              </label>
            </div>
            <label className="grid gap-1 text-xs text-muted">
              {t('form.forMonth')}
              <span className="flex gap-2">
                <input className="field min-w-0 flex-1" type="month" value={d.forMonth} onChange={(e) => set({ forMonth: e.target.value })} />
                {d.forMonth && (
                  <Button type="button" onClick={() => set({ forMonth: '' })}>
                    {t('form.reset')}
                  </Button>
                )}
              </span>
            </label>
            <label className="grid gap-1 text-xs text-muted">
              {t('form.note')}
              <input className="field" maxLength={100} value={d.note} onChange={(e) => set({ note: e.target.value })} />
            </label>
            <div className="flex gap-2 pt-0.5">
              <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
                {saving ? t('form.saving') : t('form.update')}
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>
                {t('form.cancel')}
              </Button>
            </div>
          </form>
          </>,
          document.body,
        )}
    </span>
  )
}
