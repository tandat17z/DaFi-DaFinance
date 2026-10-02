import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { categoryKey } from '../config/categories'
import { ApiError, apiFetch, toApiError } from './api'
import type { Holding, Transaction } from './types'

/**
 * Where the signed-in user's data lives. The account (lib/account.ts) picks one:
 * the server (owner / approved users) or this browser (everyone else, see `localStore`).
 * Every method throws ApiError so the caller can show it.
 */
export interface FinanceStore {
  kind: 'server' | 'browser'
  listTransactions(): Promise<Transaction[]>
  saveTransaction(tx: Transaction): Promise<void>
  deleteTransaction(id: string): Promise<void>
  listHoldings(): Promise<Holding[]>
  saveHolding(h: Holding): Promise<void>
  deleteHolding(id: string): Promise<void>
}

// --- Server (central API) -------------------------------------------------------------------------

export const serverStore: FinanceStore = {
  kind: 'server',
  listTransactions: async () => (await apiFetch<{ transactions: Transaction[] }>('/transactions')).transactions,
  async saveTransaction(tx) {
    const { id, ...body } = tx
    await apiFetch(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  },
  async deleteTransaction(id) {
    await apiFetch(`/transactions/${id}`, { method: 'DELETE' })
  },
  listHoldings: async () => (await apiFetch<{ holdings: Holding[] }>('/holdings')).holdings,
  async saveHolding(h) {
    const { id, ...body } = h
    await apiFetch(`/holdings/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  },
  async deleteHolding(id) {
    await apiFetch(`/holdings/${id}`, { method: 'DELETE' })
  },
}

/** Uploads transactions in chunks the import endpoint accepts (upsert by id, so retrying is safe). */
async function importTransactions(list: Transaction[]) {
  const CHUNK = 1000
  for (let i = 0; i < list.length; i += CHUNK) {
    await apiFetch('/transactions/import', {
      method: 'POST',
      body: JSON.stringify({ transactions: list.slice(i, i + CHUNK).map((t) => ({ ...t, category: categoryKey(t.category) })) }),
    })
  }
}

// --- This browser (users without server storage) --------------------------------------------------

// Keyed by email so two accounts signed in on one browser never see each other's data.
const localKey = (email: string, what: 'transactions' | 'holdings' | 'pulled') => `dafinance.u.${email.toLowerCase()}.${what}`

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    throw new ApiError(0, 'local_storage', 'This browser refused to save the data (storage full or blocked)')
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Blocked storage: nothing to clear.
  }
}

/** Newest first, like the API: date, then time (unknown last). */
const byDateDesc = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '')

function upsert<T extends { id: string }>(key: string, item: T) {
  const list = readList<T>(key)
  const i = list.findIndex((x) => x.id === item.id)
  if (i >= 0) list[i] = item
  else list.push(item)
  writeList(key, list)
}

export function localStore(email: string): FinanceStore {
  const tx = localKey(email, 'transactions')
  const hd = localKey(email, 'holdings')
  return {
    kind: 'browser',
    listTransactions: async () => readList<Transaction>(tx).sort(byDateDesc),
    saveTransaction: async (t) => upsert(tx, t),
    deleteTransaction: async (id) => writeList(tx, readList<Transaction>(tx).filter((x) => x.id !== id)),
    listHoldings: async () => readList<Holding>(hd),
    saveHolding: async (h) => upsert(hd, h),
    deleteHolding: async (id) => writeList(hd, readList<Holding>(hd).filter((x) => x.id !== id)),
  }
}

/** What this browser holds for `email` (shown before moving it to the server). */
export function localCounts(email: string) {
  return { transactions: readList(localKey(email, 'transactions')).length, holdings: readList(localKey(email, 'holdings')).length }
}

/** Server storage was granted: upload this browser's data, then clear it (only after every write succeeded). */
export async function pushLocalToServer(email: string) {
  const transactions = readList<Transaction>(localKey(email, 'transactions'))
  const holdings = readList<Holding>(localKey(email, 'holdings'))
  if (transactions.length) await importTransactions(transactions)
  for (const h of holdings) await serverStore.saveHolding(h)
  remove(localKey(email, 'transactions'))
  remove(localKey(email, 'holdings'))
  remove(localKey(email, 'pulled'))
}

/**
 * Server storage was revoked (the server keeps the data, read-only): copy it into this browser once,
 * so the user carries on locally. Returns false when it was already copied.
 */
export async function pullServerToLocal(email: string) {
  const flag = localKey(email, 'pulled')
  try {
    if (localStorage.getItem(flag)) return false
  } catch {
    return false
  }
  const [transactions, holdings] = await Promise.all([serverStore.listTransactions(), serverStore.listHoldings()])
  const local = localStore(email)
  for (const t of transactions) await local.saveTransaction(t)
  for (const h of holdings) await local.saveHolding(h)
  try {
    localStorage.setItem(flag, new Date().toISOString())
  } catch {
    // Not remembered: the next visit copies again (upsert, so nothing is duplicated).
  }
  return true
}

// --- React --------------------------------------------------------------------------------------

export const StoreContext = createContext<FinanceStore>(serverStore)
export const useStore = () => useContext(StoreContext)

/** Loads a list from the current store; `reload()` refetches. */
function useList<T>(load: (s: FinanceStore) => Promise<T[]>) {
  const store = useStore()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    load(store).then(
      (list) => {
        if (!alive) return
        setItems(list)
        setError(null)
        setLoading(false)
      },
      (e: unknown) => {
        if (!alive) return
        setError(toApiError(e))
        setLoading(false)
      },
    )
    return () => {
      alive = false
    }
    // `load` is a module-level picker; the store and version decide when to refetch.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [store, version])

  const reload = useCallback(() => {
    setLoading(true)
    setVersion((v) => v + 1)
  }, [])

  return { items, loading, error, reload }
}

const pickTransactions = (s: FinanceStore) => s.listTransactions()
const pickHoldings = (s: FinanceStore) => s.listHoldings()

/** Every transaction of the signed-in user, for the dashboard (ranges and buckets are computed here). */
export const useAllTransactions = () => useList(pickTransactions)

/** Savings and investments of the signed-in user. */
export const useHoldings = () => useList(pickHoldings)

// --- One-off migration of data kept in this browser before the API existed -----------------------

const LEGACY_KEY = 'dafinance.transactions'

/** Transactions still under the old key, and a function that uploads them, then clears the key. */
export function useLegacyImport(onDone: () => void) {
  const [pending, setPending] = useState<Transaction[]>(() => readList<Transaction>(LEGACY_KEY))

  const importAll = async () => {
    await importTransactions(pending)
    remove(LEGACY_KEY)
    setPending([])
    onDone()
  }

  return { pending, importAll }
}
