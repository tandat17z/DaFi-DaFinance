import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'
import { evaluate } from '../lib/calc'
import { useI18n } from '../locales'

type Key = { label: string; insert?: string; action?: 'clear' | 'back' | 'equals'; kind?: 'op' | 'fn' | 'eq' }

const KEYS: Key[] = [
  { label: 'C', action: 'clear', kind: 'fn' },
  { label: '(', insert: '(', kind: 'fn' },
  { label: ')', insert: ')', kind: 'fn' },
  { label: '÷', insert: ' ÷ ', kind: 'op' },
  { label: '7', insert: '7' },
  { label: '8', insert: '8' },
  { label: '9', insert: '9' },
  { label: '×', insert: ' × ', kind: 'op' },
  { label: '4', insert: '4' },
  { label: '5', insert: '5' },
  { label: '6', insert: '6' },
  { label: '−', insert: ' - ', kind: 'op' },
  { label: '1', insert: '1' },
  { label: '2', insert: '2' },
  { label: '3', insert: '3' },
  { label: '+', insert: ' + ', kind: 'op' },
  { label: '0', insert: '0' },
  { label: ',', insert: ',' },
  { label: '⌫', action: 'back', kind: 'fn' },
  { label: '=', action: 'equals', kind: 'eq' },
]

/**
 * The app's own calculator keys for the quick-math amount field, in a floating bubble under `anchor`
 * (the field uses inputMode="none", so the device keyboard stays closed). Keys keep the field focused
 * (pointer / mouse down cancelled); "=" replaces the expression with its result. Follows the field
 * when the page scrolls; closes on a tap outside the field and the bubble, or Escape.
 */
export function CalcPad({ anchor, value, onChange, onClose }: { anchor: RefObject<HTMLElement | null>; value: string; onChange: (next: string) => void; onClose: () => void }) {
  const { t } = useI18n()
  const bubble = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const place = () => {
    const el = anchor.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.min(Math.max(r.width, 260), window.innerWidth - 16)
    const height = bubble.current?.offsetHeight ?? 280
    // Under the field, or above it when there is no room below.
    const top = window.innerHeight - r.bottom < height + 12 && r.top > height + 12 ? r.top - height - 6 : r.bottom + 6
    setPos({ top, left: Math.min(Math.max(8, r.left), window.innerWidth - width - 8), width })
  }

  // First placement before paint, then again once the bubble has its real height.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(place, [])
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!bubble.current?.contains(target) && !anchor.current?.contains(target)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
    // place / onClose only read refs and props of this open bubble.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const press = (k: Key) => {
    if (k.action === 'clear') return onChange('')
    if (k.action === 'back') return onChange(value.replace(/\s*\S\s*$/, ''))
    if (k.action === 'equals') {
      const v = evaluate(value)
      if (v !== null) onChange(String(Math.round(v * 1000) / 1000).replace('.', ','))
      return
    }
    // An operator replaces a trailing operator instead of stacking ("5 + ×" → "5 ×").
    const base = k.kind === 'op' ? value.replace(/\s*[+\-×÷*/]\s*$/, '') : value
    onChange(base + k.insert)
  }

  return createPortal(
    <div
      ref={bubble}
      role="group"
      aria-label={t('form.calcPad')}
      style={pos ?? { visibility: 'hidden', top: 0, left: 0 }}
      className="fixed z-50 grid grid-cols-4 gap-1.5 rounded-xl border border-border-strong bg-surface p-2 shadow-xl shadow-black/30 select-none"
    >
      {KEYS.map((k) => (
        <button
          key={k.label}
          type="button"
          tabIndex={-1}
          aria-label={k.action === 'back' ? t('form.calcBack') : k.action === 'clear' ? t('form.calcClear') : undefined}
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => press(k)}
          className={cn(
            'h-11 rounded-lg font-mono text-lg transition-colors active:scale-[0.97]',
            k.kind === 'eq' ? 'bg-accent text-accent-fg hover:opacity-90' : k.kind === 'op' ? 'bg-accent/10 text-accent hover:bg-accent/20' : k.kind === 'fn' ? 'bg-surface-2 text-muted hover:text-fg' : 'bg-surface-2 text-fg hover:bg-border',
          )}
        >
          {k.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
