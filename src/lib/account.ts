// The caller's account in this app (`/v1/finance/account`). Types, context and the gate live in
// @tada/kit/account; this file only binds them to the finance API.
import { type Account, refreshAccountMenu } from '@tada/kit/account'
import { apiFetch } from './api'

export { ACCOUNT_CHANGED_EVENT, type Account, type StorageMode, useAccount } from '@tada/kit/account'

export const fetchAccount = () => apiFetch<Account>('/account')

/** Asks the owner for server storage (idempotent while pending). */
export async function requestStorage(message: string) {
  await apiFetch('/account/request', { method: 'POST', body: JSON.stringify(message ? { message } : {}) })
  refreshAccountMenu() // the account menu (<tdz-account>) re-reads its storage line
}
