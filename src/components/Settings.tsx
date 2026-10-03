import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ICON_GROUPS, type IconGroup } from '../config/categories'
import { cn } from '../lib/cn'
import { useFormat } from '../lib/format'
import { useCategories, useSettings, type Theme } from '../lib/settings'
import type { TxType } from '../lib/types'
import { useI18n } from '../locales'
import { Button } from './ui'

/** Gear button for the header; opens the settings drawer. */
export function SettingsButton() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label={t('settings.open')}
        title={t('settings.open')}
        onClick={() => setOpen(true)}
        className="grid size-8 place-items-center rounded-full border border-border-strong bg-surface-2 text-muted transition-colors hover:text-fg"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      </button>
      {open && <SettingsPanel onClose={() => setOpen(false)} />}
    </>
  )
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const { settings, update } = useSettings()
  const { formatVnd } = useFormat()
  const cats = useCategories()
  const [type, setType] = useState<TxType>('expense')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const setTheme = (theme: Theme) => update((s) => ({ ...s, theme }))
  const totalBudget = cats.expense.reduce((sum, k) => sum + cats.budgetOf(k), 0)

  return createPortal(
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-black/50" />
      <aside role="dialog" aria-modal="true" aria-label={t('settings.title')} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border-strong bg-surface shadow-2xl shadow-black/40">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t('settings.title')}</h2>
            <p className="text-xs text-subtle">{t('settings.local')}</p>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label={t('settings.close')} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
            ✕
          </button>
        </header>

        <div className="grid flex-1 content-start gap-7 overflow-y-auto px-5 py-5 [scrollbar-width:thin]">
          <section className="grid gap-3">
            <h3 className="font-mono text-[11px] tracking-wider text-subtle uppercase">{t('settings.appearance')}</h3>
            <div role="radiogroup" aria-label={t('settings.appearance')} className="grid grid-cols-2 gap-2">
              {(['dark', 'light'] as const).map((th) => (
                <button
                  key={th}
                  type="button"
                  role="radio"
                  aria-checked={settings.theme === th}
                  onClick={() => setTheme(th)}
                  className={cn('flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors', settings.theme === th ? 'border-accent bg-accent/10' : 'border-border hover:border-border-strong')}
                >
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-base">
                    {th === 'dark' ? '☾' : '☀'}
                  </span>
                  {t(th === 'dark' ? 'settings.dark' : 'settings.light')}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-mono text-[11px] tracking-wider text-subtle uppercase">{t('settings.categories')}</h3>
              {totalBudget > 0 && <span className="font-mono text-xs text-muted">{t('settings.budgetTotal', { amount: formatVnd(totalBudget) })}</span>}
            </div>
            <div role="radiogroup" className="flex w-fit rounded-lg border border-border bg-surface-2 p-0.5">
              {(['expense', 'income'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={type === k}
                  onClick={() => setType(k)}
                  className={cn('rounded-md px-3 py-1 text-xs transition-colors', type === k ? (k === 'expense' ? 'bg-expense/15 text-expense' : 'bg-income/15 text-income') : 'text-muted hover:text-fg')}
                >
                  {t(k === 'expense' ? 'tile.expense' : 'tile.income')}
                </button>
              ))}
            </div>
            {type === 'expense' && <p className="text-xs text-subtle">{t('settings.budgetHint')}</p>}
            <ul className="grid gap-1.5">
              {cats[type].map((key) => (
                <CategoryRow key={key} catKey={key} type={type} />
              ))}
            </ul>
            <AddCategory type={type} />
            <Removed type={type} />
          </section>
        </div>
      </aside>
    </>,
    document.body,
  )
}

function CategoryRow({ catKey, type }: { catKey: string; type: TxType }) {
  const { t } = useI18n()
  const { update } = useSettings()
  const { categoryName, formatShortVnd } = useFormat()
  const cats = useCategories()
  const [picking, setPicking] = useState(false)
  const isCustom = cats.customName(catKey) !== undefined
  const name = categoryName(catKey)
  const budget = cats.budgetOf(catKey)

  const setIcon = (icon: string) => {
    update((s) => (isCustom ? { ...s, custom: s.custom.map((c) => (c.key === catKey ? { ...c, icon } : c)) } : { ...s, icons: { ...s.icons, [catKey]: icon } }))
    setPicking(false)
  }
  const setBudget = (raw: string) => {
    const n = Math.max(0, Math.round(Number(raw) || 0))
    update((s) => {
      const budgets = { ...s.budgets }
      if (n > 0) budgets[catKey] = n
      else delete budgets[catKey]
      return { ...s, budgets }
    })
  }
  const remove = () =>
    update((s) => {
      const budgets = { ...s.budgets }
      delete budgets[catKey]
      // A user category is deleted; a built-in one is only hidden, so it can be restored.
      return isCustom ? { ...s, budgets, custom: s.custom.filter((c) => c.key !== catKey) } : { ...s, budgets, hidden: [...s.hidden, `${type}:${catKey}`] }
    })

  return (
    <li className="rounded-lg border border-border bg-surface-2/40">
      <div className="flex items-center gap-2.5 p-2">
        <button type="button" aria-expanded={picking} aria-label={t('settings.pickIcon', { name })} onClick={() => setPicking((v) => !v)} className={cn('grid size-9 shrink-0 place-items-center rounded-lg border text-lg transition-colors', picking ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-border-strong')}>
          {cats.iconOf(catKey)}
        </button>
        <span className="min-w-0 flex-1 truncate text-sm">
          {name}
          {isCustom && <span className="ml-1.5 rounded-full border border-border-strong px-1.5 py-px text-[10px] text-subtle">{t('settings.custom')}</span>}
        </span>
        {type === 'expense' && (
          <label className="relative w-32 shrink-0">
            <span className="sr-only">{t('settings.budget')}</span>
            <input
              className="field py-1.5 pr-10 text-right font-mono text-xs"
              type="number"
              inputMode="numeric"
              min={0}
              step={100000}
              placeholder="—"
              title={budget ? undefined : t('settings.noLimit')}
              defaultValue={budget || ''}
              onBlur={(e) => setBudget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[10px] text-subtle">{budget > 0 ? formatShortVnd(budget) : '₫'}</span>
          </label>
        )}
        <button type="button" onClick={remove} aria-label={t('settings.delete', { name })} title={t(isCustom ? 'settings.deleteHint' : 'settings.hideHint')} className="grid size-8 shrink-0 place-items-center rounded-lg text-subtle hover:bg-expense/10 hover:text-expense">
          ✕
        </button>
      </div>
      {picking && <IconGrid value={cats.iconOf(catKey)} onPick={setIcon} />}
    </li>
  )
}

/** Built-in categories the user removed, one tap to bring each back. */
function Removed({ type }: { type: TxType }) {
  const { t } = useI18n()
  const { update } = useSettings()
  const { categoryName } = useFormat()
  const cats = useCategories()
  const removed = cats.removed(type)
  if (removed.length === 0) return null
  return (
    <div className="grid gap-2">
      <p className="text-xs text-subtle">{t('settings.removed')}</p>
      <div className="flex flex-wrap gap-1.5">
        {removed.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => update((s) => ({ ...s, hidden: s.hidden.filter((h) => h !== `${type}:${key}`) }))}
            aria-label={t('settings.restore', { name: categoryName(key) })}
            className="flex items-center gap-1.5 rounded-full border border-border-strong px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/60 hover:text-fg"
          >
            <span aria-hidden="true">{cats.iconOf(key)}</span>
            {categoryName(key)}
            <span aria-hidden="true" className="text-accent">↺</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Icon picker: every group of ICON_GROUPS, with chips to jump between groups. */
function IconGrid({ value, onPick }: { value: string; onPick: (icon: string) => void }) {
  const { t } = useI18n()
  const [group, setGroup] = useState<IconGroup>('food')
  return (
    <div className="grid gap-2 border-t border-border p-2">
      <div role="tablist" className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(Object.keys(ICON_GROUPS) as IconGroup[]).map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={group === g}
            onClick={() => setGroup(g)}
            className={cn('flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors', group === g ? 'border-accent/60 bg-accent/10 text-fg' : 'border-border text-muted hover:text-fg')}
          >
            <span aria-hidden="true">{ICON_GROUPS[g][0]}</span>
            {t(`icons.${g}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
        {ICON_GROUPS[group].map((icon) => (
          <button key={icon} type="button" onClick={() => onPick(icon)} className={cn('grid aspect-square place-items-center rounded-md text-xl transition-colors hover:bg-surface', icon === value && 'bg-accent/15 ring-1 ring-accent/50')}>
            {icon}
          </button>
        ))}
      </div>
    </div>
  )
}

function AddCategory({ type }: { type: TxType }) {
  const { t } = useI18n()
  const { update } = useSettings()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [picking, setPicking] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    update((s) => ({ ...s, custom: [...s.custom, { key: `c-${crypto.randomUUID().slice(0, 8)}`, type, name: trimmed, icon }] }))
    setName('')
    setPicking(false)
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-dashed border-border-strong">
      <div className="flex items-center gap-2.5 p-2">
        <button type="button" aria-expanded={picking} aria-label={t('settings.pickIcon', { name: name || t('settings.newName') })} onClick={() => setPicking((v) => !v)} className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-lg hover:border-border-strong">
          {icon}
        </button>
        <input className="field min-w-0 flex-1 py-1.5" maxLength={40} placeholder={t('settings.newName')} aria-label={t('settings.newName')} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="primary" className="shrink-0 px-3 py-1.5" disabled={!name.trim()}>
          + {t('settings.add')}
        </Button>
      </div>
      {picking && (
        <IconGrid
          value={icon}
          onPick={(i) => {
            setIcon(i)
            setPicking(false)
          }}
        />
      )}
    </form>
  )
}
