import { categoryKey, TRANSFER_CATEGORIES } from '../config/categories'
import type { Transaction } from './types'

/** Money moved into savings / investments: leaves the cash balance, but is not spending. */
export const isTransfer = (tx: Transaction) => tx.type === 'expense' && TRANSFER_CATEGORIES.includes(categoryKey(tx.category))

/** Real spending: expenses that are not transfers. */
export const isSpending = (tx: Transaction) => tx.type === 'expense' && !isTransfer(tx)
