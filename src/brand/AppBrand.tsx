import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { BrandLabels, ChangeKind, ChangelogEntry, Localized } from './types'

const LABELS: Record<string, BrandLabels> = {
  en: { changelog: 'Changelog', current: 'Current', close: 'Close', added: 'Added', changed: 'Changed', fixed: 'Fixed', openChangelog: 'Version {version}: open changelog' },
  vi: { changelog: 'Lịch sử thay đổi', current: 'Hiện tại', close: 'Đóng', added: 'Thêm mới', changed: 'Thay đổi', fixed: 'Sửa lỗi', openChangelog: 'Phiên bản {version}: xem lịch sử thay đổi' },
}

// Literal class names so Tailwind can see them.
const KIND_STYLE: Record<ChangeKind, string> = {
  added: 'bg-income/15 text-income',
  changed: 'bg-inc-4/15 text-inc-4',
  fixed: 'bg-expense/15 text-expense',
}

const pick = (text: Localized, locale: string) => (typeof text === 'string' ? text : (text[locale] ?? text.en ?? Object.values(text)[0] ?? ''))

/** `2026-10-02` → `02/10/2026` (no Intl: the format must not depend on the browser locale). */
const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

export interface AppBrandProps {
  /** App name next to the logo; hidden below `sm` to save room. */
  name: string
  /** Any node: an `<img>`, an inline SVG, a text badge… */
  logo: ReactNode
  /** Newest first. */
  changelog: ChangelogEntry[]
  /** Defaults to the first changelog entry, so the list is the single source of truth. */
  version?: string
  /** `en` / `vi` (default `en`). Entry text may be a string or `{ en, vi }`. */
  locale?: string
  /** Override any built-in label. */
  labels?: Partial<BrandLabels>
  /** Responsive visibility of the name (default: from `sm` up); logo and version are always shown. */
  nameClassName?: string
  className?: string
}

/**
 * Logo + name + version. The version is a button that opens the changelog in a dialog.
 * Self-contained (React + Tailwind with the shared colour tokens, no other imports): copy this folder to reuse it.
 */
export function AppBrand({ name, logo, changelog, version, locale = 'en', labels, nameClassName = 'hidden sm:inline', className = '' }: AppBrandProps) {
  const l = { ...(LABELS[locale] ?? LABELS.en), ...labels }
  const current = version ?? changelog[0]?.version
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <span className="shrink-0">{logo}</span>
      <span className={`font-semibold tracking-tight ${nameClassName}`}>{name}</span>
      {current && (
        <button
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={l.openChangelog.replace('{version}', current)}
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          v{current}
        </button>
      )}
      {open &&
        createPortal(
          <ChangelogDialog
            entries={changelog}
            locale={locale}
            labels={l}
            onClose={() => {
              setOpen(false)
              trigger.current?.focus()
            }}
          />,
          document.body,
        )}
    </div>
  )
}

function ChangelogDialog({ entries, locale, labels, onClose }: { entries: ChangelogEntry[]; locale: string; labels: BrandLabels; onClose: () => void }) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    // Lock the page behind the dialog (iOS otherwise scrolls it under the sheet).
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-2xl border border-b-0 border-border-strong bg-surface shadow-2xl shadow-black/60 sm:max-h-[80dvh] sm:rounded-xl sm:border-b">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-sm font-semibold">
            {labels.changelog}
          </h2>
          <button ref={closeRef} type="button" aria-label={labels.close} onClick={onClose} className="grid size-9 place-items-center rounded-md text-xl text-muted hover:bg-surface-2 hover:text-fg sm:size-7 sm:text-base">
            ×
          </button>
        </div>
        <ol className="grid gap-5 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {entries.map((entry, i) => (
            <li key={entry.version}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-sm font-semibold">v{entry.version}</span>
                {i === 0 && <span className="rounded-full bg-accent/15 px-2 py-px text-[10px] text-accent">{labels.current}</span>}
                <span className="ml-auto font-mono text-xs text-subtle">{shortDate(entry.date)}</span>
              </div>
              <ul className="mt-2 grid gap-1.5 text-sm">
                {entry.changes.map((c, j) => (
                  <li key={j} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                    {c.kind ? <span className={`w-fit shrink-0 rounded px-1.5 py-px text-center text-[10px] sm:w-20 ${KIND_STYLE[c.kind]}`}>{labels[c.kind]}</span> : <span aria-hidden="true" className="hidden w-20 shrink-0 sm:block" />}
                    <span className="min-w-0 text-muted">{pick(c.text, locale)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
