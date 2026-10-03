import { type FormEvent, useState } from 'react'
import { type AccountLinks, answerLink, removeLink, requestLink, useAccount } from '../lib/account'
import { toApiError } from '../lib/api'
import { useI18n } from '../locales'
import { Button } from './ui'

/**
 * Settings section: link this sign-in email to a main email (alias → primary, every app), or, as the
 * main email, confirm an alias that asked. The API enforces everything; hidden when it has no links.
 */
export function LinkSection() {
  const { t } = useI18n()
  const { account } = useAccount()
  const [primary, setPrimary] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const info = account as (typeof account & AccountLinks) | null
  if (!info?.signedInAs) return null
  const alias = info.signedInAs
  const link = info.link
  const incoming = info.incomingLinks ?? []

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (e) {
      setError(toApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run(() => requestLink(primary.trim(), message.trim()))
  }

  return (
    <section className="grid gap-3">
      <h3 className="font-mono text-[11px] tracking-wider text-subtle uppercase">{t('link.title')}</h3>

      {incoming.map((l) => (
        <div key={l.alias} className="grid gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3 text-sm">
          <p>{t('link.incoming', { alias: l.alias })}</p>
          {l.message && <p className="text-xs whitespace-pre-wrap text-muted">“{l.message}”</p>}
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => run(() => answerLink(l.alias, 'confirm'))}>{t('link.confirm')}</Button>
            <Button disabled={busy} onClick={() => run(() => answerLink(l.alias, 'decline'))}>{t('link.decline')}</Button>
          </div>
        </div>
      ))}

      {link?.status === 'approved' ? (
        <div className="grid gap-2 text-sm">
          <p className="text-muted">{t('link.linked', { alias, primary: link.primary })}</p>
          <Button disabled={busy} onClick={() => window.confirm(t('link.confirmUnlink')) && run(removeLink)}>{t('link.unlink')}</Button>
        </div>
      ) : link?.status === 'pending' ? (
        <div className="grid gap-2 text-sm">
          <p className="text-muted">{t('link.pending', { primary: link.primary })}</p>
          {!link.primaryConfirmed && <p className="text-xs text-subtle">{t('link.waitingPrimary', { primary: link.primary })}</p>}
          <Button disabled={busy} onClick={() => run(removeLink)}>{t('link.cancel')}</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-2">
          <p className="text-xs text-subtle">{t('link.hint')}</p>
          {link?.status === 'rejected' && <p className="text-xs text-expense">{t('link.rejected', { primary: link.primary })}</p>}
          <input type="email" required className="field" placeholder={t('link.primary')} aria-label={t('link.primary')} value={primary} onChange={(e) => setPrimary(e.target.value)} />
          <input className="field" maxLength={500} placeholder={t('link.message')} aria-label={t('link.message')} value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button type="submit" variant="primary" disabled={busy || !primary.trim()}>{t('link.send')}</Button>
        </form>
      )}

      {error && <p role="alert" className="text-xs text-expense">{error}</p>}
    </section>
  )
}
