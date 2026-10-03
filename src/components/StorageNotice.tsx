import { useState } from 'react'
import { type ApiError, STANDALONE, toApiError } from '../lib/api'
import { openStorageRequest, useAccount } from '../lib/account'
import { cn } from '../lib/cn'
import { localDateIso, useFormat } from '../lib/format'
import { localCounts, pushLocalToServer } from '../lib/storage'
import { useI18n } from '../locales'
import { ApiNotice } from './ApiNotice'
import { Button } from './ui'

const hiddenKey = (email: string, state: string) => `dafinance.notice.${email}.${state}`

function isHidden(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

/**
 * Where the data lives, when it is not simply the server: this browser only (with a request for
 * server storage), a pending / rejected / revoked request, or browser data to move up after approval.
 */
export function StorageNotice({ onMoved }: { onMoved: () => void }) {
  const { account } = useAccount()
  if (STANDALONE) return <StandaloneNotice />
  if (!account) return null
  // Keyed by state so a hidden notice comes back once something changes.
  const state = account.storage === 'cloud' ? 'cloud' : `${account.storage}.${account.request?.status ?? 'none'}`
  return account.storage === 'cloud' ? <MoveToServer key={state} email={account.email} onMoved={onMoved} /> : <BrowserOnly key={state} state={state} />
}

/** Standalone build: no server at all, so only the "back it up" reminder. */
function StandaloneNotice() {
  const { t } = useI18n()
  const key = hiddenKey('local', 'standalone')
  const [hidden, setHidden] = useState(() => isHidden(key))
  if (hidden) return null
  const hide = () => {
    setHidden(true)
    try {
      localStorage.setItem(key, '1')
    } catch {
      // Hidden for this visit only.
    }
  }
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-inc-4/40 bg-inc-4/5 p-4 text-sm">
      <p className="min-w-0 flex-1 basis-72 text-muted">
        <span className="font-medium text-fg">{t('storage.title')}</span> {t('storage.standalone')}
      </p>
      <Button onClick={hide}>{t('storage.hide')}</Button>
    </div>
  )
}

function MoveToServer({ email, onMoved }: { email: string; onMoved: () => void }) {
  const { t } = useI18n()
  const [counts, setCounts] = useState(() => localCounts(email))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  if (counts.transactions + counts.holdings === 0) return null

  const move = async () => {
    setBusy(true)
    setError(null)
    try {
      await pushLocalToServer(email)
      setCounts({ transactions: 0, holdings: 0 })
      onMoved()
    } catch (e) {
      setError(toApiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div role="status" className="grid gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>{t('storage.granted', { tx: counts.transactions, holdings: counts.holdings })}</p>
        <Button variant="primary" disabled={busy} onClick={move}>
          {busy ? t('legacy.moving') : t('legacy.move')}
        </Button>
      </div>
      {error && <ApiNotice error={error} />}
    </div>
  )
}

function BrowserOnly({ state }: { state: string }) {
  const { t } = useI18n()
  const { formatDate } = useFormat()
  const { account } = useAccount()
  const key = hiddenKey(account?.email ?? '', state)
  const [hidden, setHidden] = useState(() => isHidden(key))
  if (!account || hidden) return null

  const status = account.request?.status
  const pending = status === 'pending'
  const text =
    account.storage === 'readonly'
      ? t('storage.revoked')
      : pending
        ? t('storage.pending', { date: formatDate(localDateIso(new Date(account.request!.requestedAt))) })
        : status === 'rejected'
          ? t('storage.rejected')
          : t('storage.local')

  const hide = () => {
    setHidden(true)
    try {
      localStorage.setItem(key, '1')
    } catch {
      // Hidden for this visit only.
    }
  }

  return (
    <div role="status" className={cn('grid gap-3 rounded-xl border p-4 text-sm', pending ? 'border-border-strong bg-surface' : 'border-inc-4/40 bg-inc-4/5')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 basis-72 text-muted">
          <span className="font-medium text-fg">{t(pending ? 'storage.pendingTitle' : 'storage.title')}</span> {text}
        </p>
        <div className="flex shrink-0 gap-2">
          {/* The request form lives in the account menu (with the rating & feedback form). */}
          {!pending && (
            <Button variant="primary" onClick={openStorageRequest}>
              {t('storage.request')}
            </Button>
          )}
          <Button onClick={hide}>{t('storage.hide')}</Button>
        </div>
      </div>
    </div>
  )
}
