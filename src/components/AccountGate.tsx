import { AccountGate as KitAccountGate } from '@tada/kit/account'
import type { ReactNode } from 'react'
import { fetchAccount } from '../lib/account'
import { STANDALONE } from '../lib/api'
import { localStore, pullServerToLocal, serverStore, StoreContext } from '../lib/storage'

// Standalone build: no API and no account, one browser store for whoever uses this browser.
const standaloneStore = STANDALONE ? localStore('local') : null

/** Picks where data lives (server or this browser) from the account; see @tada/kit/account. */
export function AccountGate({ children }: { children: ReactNode }) {
  if (standaloneStore) return <StoreContext value={standaloneStore}>{children}</StoreContext>
  return (
    <KitAccountGate
      fetchAccount={fetchAccount}
      // Revoked: the server keeps the data read-only; copy it here once and carry on locally.
      onReadonly={(account) => pullServerToLocal(account.email)}
      // Stable per (mode, email): a new store object makes the data hooks refetch.
      storeFor={(onServer, email) => (onServer ? serverStore : localStore(email))}
      provide={(store, subtree) => <StoreContext value={store}>{subtree}</StoreContext>}
    >
      {children}
    </KitAccountGate>
  )
}
