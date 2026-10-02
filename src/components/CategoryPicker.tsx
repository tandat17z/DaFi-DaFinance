import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { categories, TRANSFER_CATEGORIES } from '../config/categories'
import { useFormat } from '../lib/format'
import { useIsPhone } from '../lib/sheet'
import { useI18n } from '../locales'
import { Bubble } from './Bubble'
import type { Transaction } from '../lib/types'

/** Searchable dropdown that assigns a category to a transaction (used for uncategorised rows). */
export function CategoryPicker({ tx, onPick }: { tx: Transaction; onPick: (category: string) => void }) {
  const { t } = useI18n()
  const { categoryName } = useFormat()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const phone = useIsPhone()

  useEffect(() => {
    if (!open) return
    if (phone) {
      // Bottom sheet: the backdrop closes it, and the on-screen keyboard must not (it scrolls / resizes the page).
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node) && !panel.current?.contains(e.target as Node)) setOpen(false)
    }
    // The list scrolls, which would clip an absolutely positioned popover: it is fixed to the viewport and closed on scroll.
    const hide = (e: Event) => !(e.target instanceof Node && panel.current?.contains(e.target)) && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [open, phone])

  const q = query.trim().toLowerCase()
  const options = (tx.type === 'expense' ? [...categories.expense, ...TRANSFER_CATEGORIES] : categories.income).filter(
    (c) => !q || categoryName(c).toLowerCase().includes(q) || c.includes(q),
  )
  const pick = (c: string) => {
    setOpen(false)
    setQuery('')
    onPick(c)
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          // Open below the button, or above when there is no room.
          setPos({ top: window.innerHeight - r.bottom < 300 ? Math.max(8, r.top - 290) : r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) })
          setOpen((o) => !o)
        }}
        className="rounded-md border border-cat-2/50 bg-cat-2/10 px-2 py-1 text-xs text-cat-2 transition-colors hover:bg-cat-2/20"
      >
        {t('list.pickCategory')} ▾
      </button>
      {open && phone && (
        <Bubble title={t('list.pickCategory')} onClose={() => setOpen(false)}>
          <input className="field mb-2" placeholder={t('list.searchCategory')} aria-label={t('list.searchCategory')} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && options[0] && pick(options[0])} />
          <ul role="listbox" className="grid gap-0.5">
            {options.map((c) => (
              <li key={c} role="option" aria-selected={false}>
                <button type="button" onClick={() => pick(c)} className="w-full rounded-lg px-3 py-3 text-left text-base text-fg active:bg-bg">
                  {categoryName(c)}
                </button>
              </li>
            ))}
            {options.length === 0 && <li className="px-2 py-2 text-sm text-subtle">{t('list.noCategoryMatch')}</li>}
          </ul>
        </Bubble>
      )}
      {open &&
        !phone &&
        createPortal(
        <div ref={panel} style={{ top: pos.top, right: pos.right }} className="fixed z-50 w-56 rounded-lg border border-border-strong bg-surface p-1.5 shadow-lg shadow-black/40">
          <input
            autoFocus
            className="field mb-1 py-1.5 text-xs"
            placeholder={t('list.searchCategory')}
            aria-label={t('list.searchCategory')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && options[0] && pick(options[0])}
          />
          <ul role="listbox" className="max-h-56 overflow-y-auto">
            {options.map((c) => (
              <li key={c} role="option" aria-selected={false}>
                <button type="button" onClick={() => pick(c)} className="w-full rounded px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-2">
                  {categoryName(c)}
                </button>
              </li>
            ))}
            {options.length === 0 && <li className="px-2 py-2 text-xs text-subtle">{t('list.noCategoryMatch')}</li>}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}
