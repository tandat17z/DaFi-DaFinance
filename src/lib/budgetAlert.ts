import { categoryKey } from '../config/categories'
import { effectiveMonth } from './range'
import { isSpending } from './transfers'
import type { Transaction } from './types'

/** Asks for notification permission once; call from a user gesture (the save tap). */
export function askNotifyPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
  } catch {
    // Not supported (e.g. iOS Safari outside the home-screen app).
  }
}

/**
 * Amount over the monthly budget once `tx` is saved, if this save pushes (or keeps) its category over;
 * null when there is no budget or it stays within.
 */
export function overBudget(all: Transaction[], tx: Transaction, budget: number): number | null {
  if (!budget || !isSpending(tx)) return null
  const key = categoryKey(tx.category)
  const month = effectiveMonth(tx)
  const spent = all
    .filter((x) => x.id !== tx.id && isSpending(x) && categoryKey(x.category) === key && effectiveMonth(x) === month)
    .reduce((s, x) => s + x.amount, tx.amount)
  return spent > budget ? spent - budget : null
}

/** Vibrates and shows a system notification (through the service worker when there is one). */
export async function notifyOverBudget(title: string, body: string) {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // No vibration motor / API.
  }
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, tag: 'budget', icon: '/icons/icon-192.png' })
    else new Notification(title, { body, tag: 'budget' })
  } catch {
    // Notification not shown; the in-app message still says it.
  }
}
