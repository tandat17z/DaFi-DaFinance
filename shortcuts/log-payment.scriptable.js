// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: green; icon-glyph: receipt;

// Log Payment — DaFinance receipt capture for Scriptable (free). Setup: docs/iphone-shortcut.md
// Called twice by the Shortcut, both times with Run In App OFF (no app switch, no WebView):
//   1. parameter = OCR text      → returns {amount, note, time} for the Shortcut's sheets
//   2. parameter = {amount, note, time} dictionary → POSTs the transaction, returns a status line
// The OCR text is parsed here, on the phone; only amount, note and time are sent.
// The device token lives in the iOS Keychain (asked once), never in this file.

// Set to your API host before installing the script on the phone.
const ENDPOINT = 'https://<api-host>/integrations/ios-shortcuts/transactions'
const TOKEN_KEY = 'dafinance.iosShortcutToken'
const PENDING_KEY = 'dafinance.pendingTransaction'
const LAST_PARSE_KEY = 'dafinance.lastParse'
const OFFSET = '+07:00' // Asia/Ho_Chi_Minh
const NOTE_MAX = 500 // same limit as the API

const pad = n => String(n).padStart(2, '0')
const localStamp = d =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
const money = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

function validTime(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(value)
  if (!m) return false
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  const check = new Date(y, mo - 1, d, h, mi)
  return (
    y >= 1900 && y <= 9999 &&
    check.getFullYear() === y && check.getMonth() === mo - 1 && check.getDate() === d &&
    h < 24 && mi < 60
  )
}

const clean = lines => lines.join(' ').replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX)

/** Lines strictly between the first line matching `start` and the next line matching `end`. */
function between(lines, start, end) {
  const i = lines.findIndex(l => start.test(l))
  if (i === -1) return null
  const j = lines.findIndex((l, k) => k > i && end.test(l))
  return j === -1 ? null : lines.slice(i + 1, j)
}

/**
 * MSB. OCR reads the screen in one of two orders:
 * - pairs: "Nội dung chuyển khoản" / <note, may wrap> / "Thời gian" / <time>
 * - columns: every label first, then the values in the same order:
 *   sender, amount, account number, receiver name (one line), <note…>, <time>.
 *   Then the note is what lies between the line after the digits-only account number and
 *   the receipt time line.
 */
function msbNote(lines) {
  const block = between(lines, /^Nội dung chuyển khoản\s*$/i, /^Thời gian\s*$/i)
  if (block && block.length) return clean(block)

  const label = lines.findIndex(l => /^Thời gian\s*$/i.test(l))
  if (label === -1) return ''
  const values = lines.slice(label + 1)
  const time = values.findIndex(l => /\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}/.test(l))
  const account = values.findIndex(l => /^\d{6,}$/.test(l.replace(/\s/g, '')))
  if (time === -1 || account === -1 || account + 2 > time) return ''
  return clean(values.slice(account + 2, time))
}

/**
 * Viettel Money: OCR reads the label column first, then the values in the same order:
 * receiver name, account number, bank, note. So the note is whatever follows the bank line
 * (the line after the digits-only account number), up to "Xem chi tiết".
 * If OCR keeps label/value pairs together instead, the block holds only the note.
 */
function viettelNote(lines) {
  const block = between(lines, /^Nội dung giao dịch\s*$/i, /^Xem chi tiết/i)
  if (!block || !block.length) return ''
  const account = block.findIndex(l => /^\d{6,}$/.test(l.replace(/\s/g, '')))
  return clean(account === -1 ? block : block.slice(account + 2))
}

/** Pulls amount / note / time out of the OCR text. Missing or ambiguous fields stay empty. */
function parse(ocr) {
  const text = String(ocr || '').replace(/\r\n?/g, '\n')
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // "2MSB" is how OCR reads the logo, so no word boundary before MSB.
  const template = /viettel\s*money/i.test(text)
    ? 'viettel'
    : /msb|Nội dung chuyển khoản|Số tài khoản thụ hưởng/i.test(text) // the logo is often read as "⑥" or not at all
      ? 'msb'
      : 'manual'

  // Amount: exactly one line that is only a VND amount ("5,000,000 VND", "500.000đ").
  const amounts = lines.filter(l => /^\d{1,3}(?:[.,]\d{3})*\s*(?:VND|VNĐ|đ|₫)$/i.test(l))
  const amount = amounts.length === 1 ? amounts[0].replace(/\D/g, '') : ''

  const note = template === 'msb' ? msbNote(lines) : template === 'viettel' ? viettelNote(lines) : ''

  // Time: "17:26 25/04/2026" on the receipt — never the status-bar clock (time only, no date).
  const times = [...text.matchAll(/\b(\d{2}):(\d{2})[ \t]+(\d{2})\/(\d{2})\/(\d{4})\b/g)]
  const candidate = times.length === 1
    ? `${times[0][5]}-${times[0][4]}-${times[0][3]} ${times[0][1]}:${times[0][2]}`
    : ''

  return { template, amount, note, time: validTime(candidate) ? candidate : '' }
}

/**
 * Step 1: OCR text → dictionary for the Shortcut's own input sheets. Never throws, and every key
 * always has a valid value of a fixed type, so Format Number / Get Dates never fail:
 * amount = number (0 when not found or ambiguous), note = text ('' when none), time = valid ISO.
 */
function parseForShortcut(ocr) {
  let p
  try {
    p = parse(ocr)
  } catch {
    p = { template: 'manual', amount: '', note: '', time: '' }
  }
  const time = p.time || localStamp(new Date())
  // Remembered for step 2 so the Shortcut only has to pass back what the user reviewed.
  try {
    Keychain.set(LAST_PARSE_KEY, JSON.stringify({ time, fromReceipt: Boolean(p.time), template: p.template }))
  } catch {
    // Step 2 then reports the time as manual and the template as manual; nothing else changes.
  }

  const amount = Number(p.amount)
  return {
    amount: Number.isSafeInteger(amount) && amount > 0 ? amount : 0,
    note: typeof p.note === 'string' ? p.note : '',
    // ISO local date-time: "Ask for Input → Date and Time" accepts it as the default.
    time: time.replace(' ', 'T'),
  }
}

async function getToken() {
  if (Keychain.contains(TOKEN_KEY)) return Keychain.get(TOKEN_KEY)
  const a = new Alert()
  a.title = 'Connect DaFinance'
  a.message = 'Enter your device token (IOS_SHORTCUT_TOKEN). It is stored securely on your iPhone.'
  a.addSecureTextField('Device token')
  a.addAction('Save')
  a.addCancelAction('Cancel')
  if (await a.present() === -1) return null
  const token = a.textFieldValue(0).trim()
  if (!token) return null
  Keychain.set(TOKEN_KEY, token)
  return token
}

function transactionURL(value) {
  if (typeof value !== 'string') return null
  const url = value.trim()
  return /^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::443)?(?:[/?#][^\s\\]*)?$/i.test(url) ? url : null
}

/** Banner "Saved 500.000 VND"; tapping it opens the transaction on the web. Never throws. */
async function notifySaved(amount, note, id, url, duplicate) {
  try {
    const n = new Notification()
    n.identifier = 'dafinance.saved.' + id
    n.threadIdentifier = 'dafinance.transactions'
    n.title = duplicate ? 'DaFinance · Already saved' : 'DaFinance · Saved'
    n.subtitle = money(amount) + ' VND'
    n.body = (note ? note.slice(0, 120) + '\n' : '') + (url ? 'Tap to view it on the web.' : '')
    if (url) n.openURL = url
    await n.schedule()
  } catch {
    // The payment is saved; a notification failure must not cause another POST.
  }
}

async function send(token, payload) {
  const req = new Request(ENDPOINT)
  req.method = 'POST'
  req.timeoutInterval = 20
  req.headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  req.body = JSON.stringify(payload)

  try {
    const raw = await req.loadString()
    const status = req.response ? req.response.statusCode : 0

    if (status === 401) {
      Keychain.remove(TOKEN_KEY)
      return { ok: false, message: 'Invalid device token. Run again to enter a new one.' }
    }

    let body
    try {
      body = JSON.parse(raw)
    } catch {
      // Network failure or an HTML page (e.g. the Cloudflare Access login): never treated as saved.
      return { ok: false, message: 'Unexpected server response. Check the Access bypass.' }
    }

    if (status >= 200 && status < 300 && body && body.ok === true) {
      return { ok: true, duplicate: body.duplicate === true, transactionUrl: transactionURL(body.transaction_url) }
    }

    const detail = body && body.error && typeof body.error.message === 'string' ? body.error.message : ''
    return { ok: false, message: `${detail || 'Could not save'} (HTTP ${status}).` }
  } catch {
    return { ok: false, message: 'No connection, or the save could not be confirmed.' }
  }
}

/**
 * "YYYY-MM-DD HH:mm" from whatever the Shortcut passed as `time`: a Date, "2026-04-25 17:26",
 * ISO "2026-04-25T17:26:00+07:00", "25/04/2026 17:26", "17:26 25/04/2026", "25/04/2026, 5:26 PM"
 * (AM/PM or SA/CH), or a date text the JS engine can read ("Apr 25, 2026 at 5:26 PM").
 * '' when nothing usable is found.
 */
function toTime(value) {
  if (value instanceof Date) return isNaN(value) ? '' : localStamp(value)
  const s = String(value == null ? '' : value).trim()
  if (!s) return ''

  let y, mo, d
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (m) [y, mo, d] = [m[1], m[2], m[3]]
  else if ((m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s))) [y, mo, d] = [m[3], m[2], m[1]]

  if (y) {
    const rest = s.replace(m[0], ' ')
    const h = /(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|SA|CH)?/i.exec(rest)
    let hour = h ? Number(h[1]) : 0
    const ampm = h && h[3] ? h[3].toUpperCase() : ''
    if ((ampm === 'PM' || ampm === 'CH') && hour < 12) hour += 12
    if ((ampm === 'AM' || ampm === 'SA') && hour === 12) hour = 0
    const t = `${y}-${pad(mo)}-${pad(d)} ${pad(hour)}:${h ? h[2] : '00'}`
    return validTime(t) ? t : ''
  }

  const parsed = new Date(s.replace(/\s+at\s+/i, ' '))
  return isNaN(parsed) ? '' : localStamp(parsed)
}

/**
 * Step 2:{amount, note, time: 'YYYY-MM-DD HH:mm' or ISO} → POST + notification.
 * A failed send is remembered in the Keychain, so running again with the same amount/note/time
 * reuses its client_transaction_id (no double expense).
 */
async function saveFromShortcut(d) {
  const amount = Number(String(d.amount == null ? '' : d.amount).replace(/\D/g, ''))
  const note = String(d.note == null ? '' : d.note).replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX)
  let last = {}
  try {
    last = JSON.parse(Keychain.get(LAST_PARSE_KEY)) || {}
  } catch {
    last = {}
  }
  // Unreadable time → the receipt's time from step 1 → now. Never an error.
  const time = toTime(d.time) || (validTime(last.time) ? last.time : localStamp(new Date()))

  if (!Number.isSafeInteger(amount) || amount <= 0) return '❌ Amount must be a positive whole number.'

  const token = await getToken()
  if (!token) return '❌ No device token entered.'

  let pending = null
  try {
    pending = Keychain.contains(PENDING_KEY) ? JSON.parse(Keychain.get(PENDING_KEY)) : null
  } catch {
    pending = null
  }

  const signature = JSON.stringify([amount, note, time])
  const id = pending && pending.signature === signature ? pending.id : UUID.string()
  Keychain.set(PENDING_KEY, JSON.stringify({ signature, id }))

  const res = await send(token, {
    schema_version: 1,
    client_transaction_id: id,
    type: 'expense',
    amount,
    note,
    occurred_at: time.replace(' ', 'T') + ':00' + OFFSET,
    time_source: time !== last.time ? 'manual' : last.fromReceipt ? 'receipt' : 'capture',
    receipt_template: ['msb', 'viettel'].includes(last.template) ? last.template : 'manual',
    reviewed: true
  })

  if (!res.ok) return '❌ ' + res.message + ' Run again with the same details to retry safely.'

  Keychain.remove(PENDING_KEY)
  await notifySaved(amount, note, id, res.transactionUrl, res.duplicate)
  return `${res.duplicate ? '✅ Already saved' : '✅ Saved'} ${money(amount)} VND${note ? ' · ' + note : ''}`
}

async function main() {
  const input = args.shortcutParameter
  if (input && typeof input === 'object') return saveFromShortcut(input)
  if (input != null) return parseForShortcut(String(input))

  // Run inside the Scriptable app: parse the clipboard, so a copied OCR text can be tested.
  const result = JSON.stringify(parse(Pasteboard.paste() || ''), null, 2)
  const a = new Alert()
  a.title = 'Parsed clipboard'
  a.message = result
  a.addAction('OK')
  await a.present()
  return result
}

let output
try {
  output = await main()
} catch (e) {
  // Last resort: the Shortcut always gets a usable value instead of a Scriptable error.
  const input = args.shortcutParameter
  output = input && typeof input === 'object'
    ? `❌ Unexpected error, nothing confirmed as saved: ${e && e.message ? e.message : e}`
    : { amount: 0, note: '', time: localStamp(new Date()).replace(' ', 'T') }
}
Script.setShortcutOutput(output)
Script.complete()
