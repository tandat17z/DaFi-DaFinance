import { AccountGate as KitAccountGate } from '@tada/kit/account'
import { type ReactNode, useState } from 'react'
import { fetchAccount } from '../lib/account'
import { ApiError, STANDALONE } from '../lib/api'
import { SettingsSync } from './SettingsSync'
import { localStore, pullServerToLocal, serverStore, StoreContext } from '../lib/storage'

// Standalone build: no API and no account, one browser store for whoever uses this browser.
const standaloneStore = STANDALONE ? localStore('local') : null

/** Picks where data lives (server or this browser) from the account; see @tada/kit/account. */
export function AccountGate({ children }: { children: ReactNode }) {
  // Private app and no grant: the API answers 403 `forbidden`; show nothing at all.
  const [denied, setDenied] = useState(false)
  if (standaloneStore) return <StoreContext value={standaloneStore}>{children}</StoreContext>
  if (denied) return null
  return (
    <KitAccountGate
      fetchAccount={() =>
        fetchAccount().then(
          (account) => (setDenied(false), account),
          (e: unknown) => {
            if (e instanceof ApiError && e.status === 403 && e.code === 'forbidden') setDenied(true)
            throw e
          },
        )
      }
      // Revoked: the server keeps the data read-only; copy it here once and carry on locally.
      onReadonly={(account) => pullServerToLocal(account.email)}
      // Stable per (mode, email): a new store object makes the data hooks refetch.
      storeFor={(onServer, email) => (onServer ? serverStore : localStore(email))}
      provide={(store, subtree) => (
        <StoreContext value={store}>
          <SettingsSync />
          {subtree}
        </StoreContext>
      )}
    >
      {children}
    </KitAccountGate>
  )
}
