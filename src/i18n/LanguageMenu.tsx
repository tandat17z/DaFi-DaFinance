import { useEffect, useRef } from 'react'
import { Flag } from './flags'
import { LOCALES, type Locale } from './locales'

/** Flag + code dropdown, same look as the public site. Pure: state comes in through props. */
export function LanguageMenu({ locale, locales, onChange, label }: { locale: Locale; locales: Locale[]; onChange: (l: Locale) => void; label: string }) {
  const ref = useRef<HTMLDetailsElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    const close = () => ref.current?.removeAttribute('open')
    const onDown = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <details ref={ref} className="group relative shrink-0">
      <summary
        aria-label={`${label}: ${LOCALES[locale].label}`}
        className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-border-strong px-2 font-mono text-xs font-semibold text-muted transition-colors group-open:border-muted group-open:text-fg hover:border-muted hover:text-fg [&::-webkit-details-marker]:hidden"
      >
        <Flag locale={locale} />
        <span>{LOCALES[locale].code}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="size-3 transition-transform group-open:rotate-180">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <ul className="absolute top-[calc(100%+0.5rem)] right-0 z-30 m-0 grid min-w-44 list-none gap-0.5 rounded-lg border border-border-strong bg-surface p-1.5 shadow-2xl shadow-black/60">
        {locales.map((l) => (
          <li key={l}>
            <button
              type="button"
              lang={l}
              aria-current={l === locale}
              onClick={() => {
                onChange(l)
                ref.current?.removeAttribute('open')
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-muted hover:bg-surface-2 hover:text-fg aria-[current=true]:text-accent"
            >
              <Flag locale={l} />
              {LOCALES[l].label}
              {l === locale && <span className="ml-auto">✓</span>}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
