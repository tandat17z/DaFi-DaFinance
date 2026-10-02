import { useFormat } from './format'
import { rangeOf, type Unit } from './range'

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Human label of the period containing `anchor` ("October 2026", "28/09 – 04/10/2026", …). */
export function usePeriodLabel() {
  const { formatDate, formatMonth } = useFormat()
  return (unit: Unit, anchor: string) => {
    const [from, to] = rangeOf(unit, anchor)
    if (unit === 'day') return formatDate(anchor)
    if (unit === 'week') return `${dm(from)} – ${dm(to)}/${to.slice(0, 4)}`
    if (unit === 'month') return formatMonth(anchor.slice(0, 7))
    return anchor.slice(0, 4)
  }
}
