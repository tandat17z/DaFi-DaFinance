// The caller's account in this app (`/v1/finance/account`). Types, context and the gate live in
// @tada/kit/account; this file only binds them to the finance API.
import { ACCOUNT_CHANGED_EVENT, type Account, refreshAccountMenu } from '@tada/kit/account'
import { apiFetch } from './api'

export { ACCOUNT_CHANGED_EVENT, type Account, openStorageRequest, type StorageMode, useAccount } from '@tada/kit/account'

export const fetchAccount = () => apiFetch<Account>('/account')

/** Account link fields of `/account` (alias sign-in email → primary email, every app). */
export interface AccountLinks {
  /** The email actually signed in; differs from `email` when linked. */
  signedInAs?: string
  link?: { primary: string; status: 'pending' | 'approved' | 'rejected' | 'revoked'; primaryConfirmed: boolean } | null
  /** Pending links that name this email as primary and wait for it to confirm. */
  incomingLinks?: { alias: string; message: string | null; requestedAt: string }[]
}

const changed = () => window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT))

/** The signed-in email asks to act as `primary` (the owner approves). */
export async function requestLink(primary: string, message: string) {
  await apiFetch('/account/link', { method: 'POST', body: JSON.stringify(message ? { primary, message } : { primary }) })
  changed()
}

/** Withdraws the request, or unlinks this email (its own data comes back). */
export async function removeLink() {
  await apiFetch('/account/link', { method: 'DELETE' })
  changed()
  refreshAccountMenu()
}

/** The primary confirms or declines a link that names it. */
export async function answerLink(alias: string, decision: 'confirm' | 'decline') {
  await apiFetch(`/account/links/${encodeURIComponent(alias)}/${decision}`, { method: 'POST' })
  changed()
}
