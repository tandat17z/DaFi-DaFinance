import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { useI18n } from '../locales'

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function readRatio(key: string, fallback: number, min: number, max: number) {
  try {
    const v = Number(localStorage.getItem(key))
    return v > 0 ? clamp(v, min, max) : fallback
  } catch {
    return fallback
  }
}

/**
 * Two panes side by side from `lg` up with a draggable divider between them (stacked on smaller screens).
 * `defaultRatio` is the share of the width given to the left pane; the choice is remembered per `storageKey`.
 * The divider also works with the arrow keys, and a double click resets it.
 */
export function SplitPane({
  left,
  right,
  storageKey,
  defaultRatio = 0.4,
  min = 0.25,
  max = 0.75,
  className,
}: {
  left: ReactNode
  right: ReactNode
  storageKey: string
  defaultRatio?: number
  min?: number
  max?: number
  className?: string
}) {
  const { t } = useI18n()
  const [ratio, setRatio] = useState(() => readRatio(storageKey, defaultRatio, min, max))
  const [dragging, setDragging] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(ratio))
    } catch {
      // Not remembered (private mode): the split still works for this visit.
    }
  }, [ratio, storageKey])

  const moveTo = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (r && r.width > 0) setRatio(clamp((clientX - r.left) / r.width, min, max))
  }

  return (
    <div ref={box} className={cn('grid gap-5 lg:gap-0 lg:grid-cols-[var(--l)_1.25rem_var(--r)]', className)} style={{ ['--l' as string]: `minmax(0,${ratio}fr)`, ['--r' as string]: `minmax(0,${1 - ratio}fr)` }}>
      <div className="min-w-0 lg:min-h-0">
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('split.label')}
        aria-valuemin={Math.round(min * 100)}
        aria-valuemax={Math.round(max * 100)}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        title={t('split.hint')}
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId) // keep receiving moves outside the handle
          } catch {
            // Pointer already gone: dragging still follows the moves we get.
          }
          setDragging(true)
        }}
        onPointerMove={(e) => dragging && moveTo(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onDoubleClick={() => setRatio(defaultRatio)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setRatio((r) => clamp(r - 0.02, min, max))
          else if (e.key === 'ArrowRight') setRatio((r) => clamp(r + 0.02, min, max))
          else if (e.key === 'Home') setRatio(min)
          else if (e.key === 'End') setRatio(max)
        }}
        className="group hidden cursor-col-resize touch-none place-items-center outline-none select-none lg:grid"
      >
        <span className={cn('h-16 w-1 rounded-full bg-border-strong transition-colors group-hover:bg-muted group-focus-visible:bg-accent', dragging && 'bg-accent')} />
      </div>
      <div className="min-w-0 lg:min-h-0">{right}</div>
    </div>
  )
}
