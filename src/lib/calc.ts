/**
 * Evaluates a short arithmetic expression typed in the amount field ("149 + 480", "2*35", "(50+20)/2").
 * Supports + - * / (also x × ÷), parentheses and decimals ("1,5" or "1.5"). No eval: a small
 * recursive-descent parser. Returns null when the text is not a complete, finite expression.
 */
export function evaluate(text: string): number | null {
  const src = text.replace(/[x×]/gi, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/\s+/g, '')
  if (!src) return null
  let i = 0

  const number = (): number | null => {
    const m = /^\d+(\.\d+)?|^\.\d+/.exec(src.slice(i))
    if (!m) return null
    i += m[0].length
    return Number(m[0])
  }
  const factor = (): number | null => {
    if (src[i] === '-' || src[i] === '+') {
      const sign = src[i++] === '-' ? -1 : 1
      const v = factor()
      return v === null ? null : sign * v
    }
    if (src[i] === '(') {
      i++
      const v = expr()
      if (v === null || src[i] !== ')') return null
      i++
      return v
    }
    return number()
  }
  const term = (): number | null => {
    let v = factor()
    while (v !== null && (src[i] === '*' || src[i] === '/')) {
      const op = src[i++]
      const r = factor()
      if (r === null) return null
      v = op === '*' ? v * r : v / r
    }
    return v
  }
  const expr = (): number | null => {
    let v = term()
    while (v !== null && (src[i] === '+' || src[i] === '-')) {
      const op = src[i++]
      const r = term()
      if (r === null) return null
      v = op === '+' ? v + r : v - r
    }
    return v
  }

  const v = expr()
  return v !== null && i === src.length && Number.isFinite(v) ? v : null
}
