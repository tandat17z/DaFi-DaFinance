import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { ACCOUNT_CHANGED_EVENT, type Account, AccountContext, fetchAccount } from '../lib/account'
import { STANDALONE } from '../lib/api'
import { localStore, pullServerToLocal, serverStore, StoreContext } from '../lib/storage'

type State = { loading: true } | { loading: false; account: Account | null }

const RECHECK_MS = 15_000

// Standalone build: no API and no account, one browser store for whoever uses this browser.
const standaloneStore = STANDALONE ? localStore('local') : null

export function AccountGate({ children }: { children: ReactNode }) {
  if (standaloneStore) return <StoreContext value={standaloneStore}>{children}</StoreContext>
  return <ApiAccountGate>{children}</ApiAccountGate>
}

/**
 * Reads the account once, then picks where data lives: the server (owner / approved) or this
 * browser (everyone else). The app renders only after that, so it never flashes a 403.
 * The account is read again when the tab or window comes back, so an approval shows up without a reload.
 */
function ApiAccountGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ loading: true })
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let alive = true
    fetchAccount().then(
      async (account) => {
        // Revoked: the server keeps the data read-only; copy it here once and carry on locally.
        if (account.storage === 'readonly') await pullServerToLocal(account.email).catch(() => false)
        if (alive) setState({ loading: false, account })
      },
      // Older API, signed out or offline: behave as before (server; its errors are shown by the views).
      // A failed re-check keeps what is already known, so a local user never lands on the server.
      () => alive && setState((s) => (s.loading ? { loading: false, account: null } : s)),
    )
    return () => {
      alive = false
    }
  }, [version])

  useEffect(() => {
    // Coming back to the tab or the window: re-check, at most every RECHECK_MS.
    let last = Date.now()
    const onReturn = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < RECHECK_MS) return
      last = Date.now()
      refresh()
      window.dispatchEvent(new Event('tdz-account:refresh')) // the account menu re-reads too
    }
    window.addEventListener(ACCOUNT_CHANGED_EVENT, refresh)
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, refresh)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [refresh])

  const account = state.loading ? null : state.account
  const email = account?.email ?? ''
  const onServer = !account || account.storage === 'cloud'
  // Stable per (mode, email): a new store object makes the data hooks refetch.
  const store = useMemo(() => (onServer ? serverStore : localStore(email)), [onServer, email])
  const accountState = useMemo(() => ({ account, refresh }), [account, refresh])

  if (state.loading) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <span className="h-6 w-12 animate-pulse rounded-md bg-accent/15" />
      </div>
    )
  }

  return (
    <AccountContext value={accountState}>
      <StoreContext value={store}>{children}</StoreContext>
    </AccountContext>
  )
}
