import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-border bg-surface p-5', className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatTile({ label, value, valueClass, dot, sub, children, loading }: { label: string; value: ReactNode; valueClass?: string; dot?: string; sub?: ReactNode; children?: ReactNode; loading?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-subtle uppercase">
        {dot && <span aria-hidden="true" className={cn('size-1.5 rounded-full', dot)} />}
        {label}
      </div>
      {loading ? (
        <div aria-hidden="true" className="mt-2.5 h-7 w-36 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <div className={cn('mt-1.5 truncate text-2xl font-semibold tracking-tight tabular-nums', valueClass)}>{value}</div>
      )}
      {sub && <div className="mt-1 text-xs text-subtle">{sub}</div>}
      {children}
    </div>
  )
}

/** The headline number: what you have right now. Larger and brighter than the period tiles. */
export function HeroTile({ label, value, negative, sub, loading, action, children }: { label: string; value: ReactNode; negative?: boolean; sub?: ReactNode; loading?: boolean; action?: ReactNode; children?: ReactNode }) {
  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col justify-between gap-5 overflow-hidden rounded-2xl border p-6',
        negative ? 'border-expense/40 bg-gradient-to-br from-expense/15 via-surface to-surface' : 'border-accent/40 bg-gradient-to-br from-accent/15 via-surface to-surface',
      )}
    >
      <div aria-hidden="true" className={cn('pointer-events-none absolute -top-20 -right-20 size-64 rounded-full blur-3xl', negative ? 'bg-expense/15' : 'bg-accent/15')} />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted uppercase">
            <span aria-hidden="true" className={cn('size-2 rounded-full', negative ? 'bg-expense' : 'bg-accent')} />
            {label}
          </div>
          {action}
        </div>
        {loading ? (
          <div aria-hidden="true" className="mt-3 h-12 w-56 animate-pulse rounded-md bg-surface-2" />
        ) : (
          <div className={cn('mt-2 truncate text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl', negative ? 'text-expense' : 'text-accent')}>{value}</div>
        )}
        {sub && <div className="mt-1.5 text-xs text-subtle">{sub}</div>}
      </div>
      {children && <div className="relative grid gap-1.5 border-t border-border pt-4 text-sm">{children}</div>}
    </div>
  )
}

type Variant = 'primary' | 'ghost'
export function Button({ variant = 'ghost', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50',
        variant === 'primary' ? 'bg-accent text-accent-fg hover:opacity-90' : 'border border-border-strong text-fg hover:bg-surface-2',
        className,
      )}
    />
  )
}

export function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs text-muted">
      {text}
      {children}
    </label>
  )
}
