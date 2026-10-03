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

/**
 * Ids of spending that took its category over the monthly budget: walking each category-month in date
 * order, every row from the one that crossed the limit on.
 */
export function overBudgetIds(all: Transaction[], budgetOf: (category: string) => number): Set<string> {
  const groups = new Map<string, Transaction[]>()
  for (const tx of all) {
    if (!isSpending(tx) || !budgetOf(tx.category)) continue
    const k = `${categoryKey(tx.category)}|${effectiveMonth(tx)}`
    groups.set(k, [...(groups.get(k) ?? []), tx])
  }
  const ids = new Set<string>()
  for (const list of groups.values()) {
    const budget = budgetOf(list[0].category)
    let spent = 0
    for (const tx of list.sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`))) {
      spent += tx.amount
      if (spent > budget) ids.add(tx.id)
    }
  }
  return ids
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
    // renotify: a new alert with the same tag otherwise replaces the old one silently (no pop-up, no buzz).
    const options = { body, tag: 'budget', renotify: true, vibrate: [200, 100, 200], icon: '/icons/alert-192.png' } as NotificationOptions
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    // Notification not shown; the in-app message still says it.
  }
}
