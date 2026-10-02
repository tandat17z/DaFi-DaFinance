import { useEffect } from 'react'
import { cn } from '../lib/cn'
import { useI18n } from '../locales'

/** Which database the local dev server talks to (`--mode demo|real`, see vite.config.ts). Unset in production builds. */
const MODE = import.meta.env.VITE_DATA_MODE as 'demo' | 'real' | undefined

/** Small chip in the header so nobody edits the real data thinking it is the demo (and vice versa). Renders nothing in production. */
export function DataModeBadge() {
  const { t } = useI18n()
  // Also in the tab title, since the header is not always in view.
  useEffect(() => {
    if (MODE === 'real' && !document.title.startsWith('[REAL]')) document.title = `[REAL] ${document.title}`
  }, [])
  if (!MODE) return null
  const real = MODE === 'real'
  return (
    <span
      title={t(real ? 'mode.realHint' : 'mode.demoHint')}
      aria-label={t(real ? 'mode.real' : 'mode.demo')}
      className={cn(
        // Phones: just a coloured dot (the header row is tight); from sm up the full chip.
        'shrink-0 rounded-full border max-sm:size-2.5 max-sm:p-0 sm:px-2 sm:py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        real ? 'border-expense/60 bg-expense/15 text-expense max-sm:bg-expense' : 'border-border-strong text-subtle max-sm:bg-subtle',
      )}
    >
      <span className="hidden sm:inline">{t(real ? 'mode.real' : 'mode.demo')}</span>
    </span>
  )
}
