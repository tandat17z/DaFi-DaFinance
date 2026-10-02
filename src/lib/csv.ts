import { categoryKey } from '../config/categories'
import type { Transaction } from './types'

/** Spreadsheets run a cell starting with = + - @ (or tab / CR) as a formula; a leading ' keeps it text. */
const neutralize = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v)

export function downloadCsv(items: Transaction[], filename: string) {
  // Column names and values are English and locale-independent, so exports are the same in every language.
  const rows = [['date', 'time', 'type', 'category', 'amount', 'note']]
  for (const t of items) rows.push([t.date, t.time ?? '', t.type, categoryKey(t.category), String(t.amount), t.note])
  const csv = rows.map((r) => r.map((v) => `"${neutralize(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  // BOM so Excel reads UTF-8 text correctly.
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
