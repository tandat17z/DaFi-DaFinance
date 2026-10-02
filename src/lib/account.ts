// The caller's account in this app (`/v1/finance/account`, shared by every app of the central API):
// who they are and where their data lives. The API decides; the app only follows it.
import { createContext, useContext } from 'react'
import { apiFetch } from './api'

/** cloud = data on the server · readonly = grant revoked, server data can only be read · local = this browser only. */
export type StorageMode = 'cloud' | 'readonly' | 'local'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'revoked'

export interface Account {
  email: string
  role: 'owner' | 'user'
  access: 'private' | 'shared' | 'public'
  storage: StorageMode
  request: { status: RequestStatus; message: string | null; requestedAt: string; decidedAt: string | null } | null
}

export const fetchAccount = () => apiFetch<Account>('/account')

/** Asks the owner for server storage (idempotent while pending). */
export async function requestStorage(message: string) {
  await apiFetch('/account/request', { method: 'POST', body: JSON.stringify(message ? { message } : {}) })
  // Tell the shared account menu (public/account.js) to refresh its storage line.
  window.dispatchEvent(new Event('tdz-account:refresh'))
}

/** Fired by the account menu after it sent a request itself. */
export const ACCOUNT_CHANGED_EVENT = 'tdz-account:change'

export interface AccountState {
  /** Null when the API could not tell (older API, signed out, network): the app then uses the server as before. */
  account: Account | null
  /** Re-reads the account (after a request, or when the owner may have decided). */
  refresh: () => void
}

export const AccountContext = createContext<AccountState>({ account: null, refresh: () => {} })
export const useAccount = () => useContext(AccountContext)
