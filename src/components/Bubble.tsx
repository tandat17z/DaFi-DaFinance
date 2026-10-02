import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'
import { SHEET_ATTR, useIsPhone } from '../lib/sheet'
import { useI18n } from '../locales'

/**
 * A small popup with a title and a close button.
 * - sm and up: rendered in place (the parent must be `relative`); `className` positions it, `arrow` is an optional pointer,
 *   `bare` drops the title row (phones always get it).
 * - phones: a bottom sheet in a portal with a dimmed backdrop, safe-area padding, its own scroll and a locked page behind it,
 *   so it is never clipped by the screen edge, the keyboard-less iPhone toolbar or a scrolling parent.
 */
export function Bubble({ title, onClose, className, arrow, bare, children }: { title: string; onClose: () => void; className?: string; arrow?: ReactNode; bare?: boolean; children: ReactNode }) {
  const { t } = useI18n()
  const phone = useIsPhone()
  const box = useRef<HTMLDivElement>(null)

  // An anchored bubble near the edge of the screen scrolls just enough to be fully visible.
  useEffect(() => {
    if (!phone) box.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [phone])

  // Lock the page behind a sheet (iOS otherwise scrolls the page under it).
  useEffect(() => {
    if (!phone) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phone])

  const header = (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-xs font-semibold sm:text-xs max-sm:text-sm">{title}</span>
      <button type="button" aria-label={t('cal.close')} onClick={onClose} className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-bg hover:text-fg max-sm:size-9 max-sm:text-xl">
        ×
      </button>
    </div>
  )

  if (phone) {
    return createPortal(
      <div {...{ [SHEET_ATTR]: '' }} className="fixed inset-0 z-50">
        <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
        <div role="dialog" aria-modal="true" aria-label={title} className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-border-strong bg-surface-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/60">
          {header}
          {children}
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div ref={box} role="dialog" aria-label={title} className={cn('absolute z-20', className)}>
      {arrow}
      <div className="relative rounded-xl border border-border-strong bg-surface-2 p-3 shadow-2xl shadow-black/60">
        {!bare && header}
        {children}
      </div>
    </div>
  )
}
