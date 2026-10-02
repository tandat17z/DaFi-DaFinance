# iPhone Shortcut — record a payment from a receipt screen

Back Tap (triple tap) on a bank receipt → screenshot (temporary, never saved to Photos) → on-device OCR → filtered fields → confirm → `POST` to the API → one transaction in DaFinance.
The image and the raw OCR text never leave the phone. No AI API is involved.

## What the backend does (already implemented in the companion API)

`POST https://<api-host>/integrations/ios-shortcuts/transactions` — `api/src/apps/finance/shortcut.ts`.

- Auth: `Authorization: Bearer <device token>`. The token only allows creating transactions; it maps to one owner (`IOS_SHORTCUT_OWNER`). No user id is accepted from the client.
- Idempotent on `client_transaction_id` — any unique per-run key of 8–100 chars (iOS Shortcuts has no UUID action, so the Jellycut sends a `yyyyMMddHHmmssSSS` timestamp). The row id is a UUID derived from owner + key: same key + same content → `200 duplicate:true`; same key + different content → `409`.
- `schema_version`, `amount` and `reviewed` may be sent as text (`"1"`, `"8500000"`, `"true"`), because the Shortcuts JSON builder often does that.
- The transaction appears in the normal list/summary. `occurred_at` is split into the date (`YYYY-MM-DD`) and the time of day (`HH:MM`, stored in the `time` column, migration `0005_time.sql`).
- The Shortcut does not classify: `category` is omitted and stored as `none`. On the web these rows are highlighted (amber), and a searchable "Chọn danh mục" dropdown on each row assigns the category; a filter chip shows only the uncategorised ones.
- Not supported (the data model has neither): accounts and internal transfers. Do not send `account_id`; for transfers use the web app.

Body (all keys below are accepted; unknown keys → 400):

```json
{
  "schema_version": 1,
  "client_transaction_id": "<Generate UUID>",
  "type": "expense",
  "amount": 8500000,
  "currency": "VND",
  "note": "TEN NGUOI CHUYEN_dang ki hang b2",
  "occurred_at": "2026-07-01T11:11:00+07:00",
  "time_source": "receipt",
  "source": "ios_shortcut",
  "capture_method": "screenshot_local_ocr",
  "receipt_template": "msb",
  "reviewed": true
}
```

`time_source`: `receipt` | `manual` | `capture`. `category` is optional (defaults to `none`).
Responses: `{"ok":true,"transaction_id":"…","transaction_url":"https://<app-host>/tx/…","duplicate":false,"message":"Saved"}` (201), `duplicate:true` + `"Already saved"` (200, same id and URL), or `{"ok":false,"error":{"code","message","field?"}}` (400/401/409/413/415/503).

### Link to the saved transaction (`transaction_url`)

- Built by the API from the `FINANCE_FRONTEND_ORIGIN` var of the API (production `https://<app-host>`, dev `http://localhost:5174`, staging empty) — never from the request. Only an `https://` origin with no path/credentials is accepted (plain `http://localhost` in dev); otherwise the field is left out and the Shortcut says "saved" without a link. Change the var when the app moves to another host.
- Route: `/tx/<transaction_id>`. The worker's `not_found_handling: single-page-application` serves the app for it (no 404). The app loads the signed-in owner's transactions, switches to that row's month, scrolls to it and outlines it, then replaces the URL with `/`. An unknown, deleted or other-account id shows "transaction not found" — the API only ever returns the owner's own rows.
- Not signed in: Cloudflare Access on the finance host shows its login and returns to the same `/tx/<id>` URL afterwards (Access handles the redirect; the app has no auth code, so no return-URL handling of its own). The link carries no token.

## One-time server setup (you run these; they touch the Cloudflare account)

1. Generate a token and keep it for the Shortcut:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

2. From the API repo:

   ```bash
   npx wrangler secret put IOS_SHORTCUT_TOKEN --env production   # paste the token
   npx wrangler secret put IOS_SHORTCUT_OWNER --env production   # your Access email (same as ADMIN_EMAILS), lower-case
   npx wrangler deploy --env production
   ```

   No D1 migration. Rollback: `npx wrangler rollback --env production`; revoke a token: `npx wrangler secret delete IOS_SHORTCUT_TOKEN --env production`.

3. Cloudflare Access: the Shortcut cannot do a browser login, so the path must not be behind the email policy. Zero Trust → Access → Applications → add a **Self-hosted** app for `<api-host>` path `integrations/ios-shortcuts/*` with a **Bypass** policy (Include: Everyone). The more specific path wins over the existing `api` app. The bearer token is the protection, and the Worker rate-limits the route. (Stricter option: Service Auth policy + a Service Token, then add `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers in step 9.)

4. Check from a terminal (expect `401 Invalid token`, not an HTML login page):

   ```bash
   curl -i -X POST https://<api-host>/integrations/ios-shortcuts/transactions -H "Content-Type: application/json" -H "Authorization: Bearer wrong" -d "{}"
   ```

## The Shortcut (Scriptable in the background, iOS input sheets only)

Scriptable only parses the OCR text and sends the request: both **Run Script** actions have **Run In App off**, so the receipt stays on screen and the review uses only built-in Shortcuts actions (menu, Number / Text / Date and Time sheets). Install **Scriptable**, add `shortcuts/log-payment.scriptable.js` as a script named `Log Payment`, then build:

1. **Take Screenshot** → **Extract Text from Image** (input: Screenshot).
2. Scriptable **Run Script** — Script `Log Payment`, Parameter `Text from Image`, Run In App **off** → **Set Variable** `R`. Keys, always present with a valid value of a fixed type (the script never errors here): `amount` number (`0` when not found or when two amount lines make it ambiguous), `note` text (`""` when none), `time` valid ISO (`2026-04-25T17:26`, now when the receipt has none).
3. **Get Dictionary Value** `amount` from `R` → **Set Variable** `Amount` (always a number; `0` = not found).
4. **Get Dictionary Value** `note` from `R` → **Set Variable** `Note`.
5. **Get Dictionary Value** `time` from `R` → **Get Dates from Input** → **Set Variable** `Time` (a real date, so the picker below opens on it).
6. **Format Number** (`Amount`, 0 decimal places) → **Set Variable** `AmountText` (grouping follows the iPhone Region: Vietnam → `5.000.000`). **Format Date** (`Time`, Custom `HH:mm · dd/MM/yyyy`) → **Set Variable** `TimeText`.
7. **Choose from Menu**, prompt `AmountText đ` / `Note` / `TimeText` on three lines, items **Lưu** and **Sửa**:
   - **Lưu**: empty.
   - **Sửa**:
     - **Calculate** `Amount ÷ 1000` → **Ask for Input** (Number, prompt `Số tiền (nghìn đ) — hiện tại AmountText đ`, default: Calculation Result, Allow Decimal Numbers on) → **Calculate** `× 1000` → **Round Number** (Ones Place) → **Set Variable** `Amount`. Round is required: the script drops every non-digit, so `25500.0` would become 255000.
     - **Ask for Input** (Text, prompt `Ghi chú`, default `Note`) → **Set Variable** `Note`.
     - **Ask for Input** (Date and Time, prompt `Thời gian`, default `Time`) → **Set Variable** `Time`.
8. After **End Menu**: **Format Date** (`Time`, Custom `yyyy-MM-dd HH:mm`) → **Dictionary**: `amount` Number `Amount`; `note` Text `Note`; `time` Text *Formatted Date*.
9. Scriptable **Run Script** — Script `Log Payment`, Parameter `Dictionary`, Run In App **off**.
10. **If** *Script Result* contains `❌` → **Show Alert** (*Script Result*). The script posts the success notification itself (tap → the transaction on the web), so do not add Show Notification; failures only come back as the result line.

When OCR is right, one run is a back tap and one tap on **Lưu**. Amount not found → the menu shows `0 đ`: choose **Sửa** (choosing **Lưu** gives `❌ Amount must be a positive whole number.`).

Step 2 remembers the receipt template and parsed time in the Keychain (`dafinance.lastParse`), so step 8 only passes back the three reviewed values; a changed time is sent as `time_source: manual`.

The script asks for the token once (an Alert, works without the app), posts, and schedules a notification whose tap opens `transaction_url`. A failed send keeps its `client_transaction_id` in the Keychain (`dafinance.pendingTransaction`): running the Shortcut again with the same amount/note/time retries with the same id, so no second expense is created. Cancelling an Ask for Input sheet stops the Shortcut without sending. A 401 clears the stored token so the next run asks again.

Test the parser without a receipt: copy an OCR text, open Scriptable and run `Log Payment` — it shows the parsed result of the clipboard.

Parser (checked against the samples): **MSB** — recognised by `MSB` (logo often read as `2MSB`, `⑥` or nothing) or the labels `Nội dung chuyển khoản` / `Số tài khoản thụ hưởng`; OCR gives either label/value pairs or all labels first, then the values (sender, amount, account, receiver, note…, time) — in that case the note is what lies between the receiver line and the time line; amount `5,000,000 VND`; note = the lines between `Nội dung chuyển khoản` and `Thời gian`, joined; time `17:26 25/04/2026` (the status-bar clock has no date, so it is never used). **Viettel Money** — amount `500.000đ`; OCR reads the label column first, then values in order (name, account, bank, note), so the note is what follows the bank line after the digits-only account number, up to `Xem chi tiết`; no time on the receipt → now. Two or more amount lines → amount left empty. Unknown receipt → amount only.

## Alternative: Jellycuts (not maintained — its Viettel note rule targets an older layout)

`shortcuts/log-payment.jelly` is the Jellycuts source (token placeholder, safe to commit). `shortcuts/log-payment.jelly.local` is the same file with the real token and is git-ignored — never commit or share it. In the Jellycuts app: new Jellycut → paste the `.local` content → Build → Open in Shortcuts. It pre-fills Amount and Note in two input prompts (edit there), finds the time or asks, then confirms before sending.

## By hand: build the Shortcut on the iPhone (Shortcuts app → + → name: `Log Payment`)

Action names are in English; search for them. Variables use "Set Variable".

1. **Take Screenshot**
2. **Extract Text from Image** (input: Screenshot) → **Set Variable** `VanBanOCR`
3. **If** `VanBanOCR` *contains* `msb` → **Set Variable** `Mau` = `msb`. **Otherwise If** contains `viettel money` → `Mau` = `viettel`. **Otherwise** → go to manual input (step 6 asks for everything) — keep it simple: **Stop** with an alert the first time.
4. Amount — **Match Text** on `VanBanOCR`, pattern `(?im)^[ \t]*\d+(?:[.,]\d{3})*[ \t]*(?:VND|VNĐ|đ|₫)[ \t]*$`.
   - **Count** items; **If** Count = 1: **Get Item from List** (First) → **Replace Text** (Regular Expression on) find `\D` replace with *empty* → **Get Numbers from Input** → `SoTien`.
   - **Otherwise**: **Ask for Input** (Number) → `SoTien`.
5. Note — **If** `Mau` = `msb`: **Match Text** `(?ims)^Nội dung chuyển khoản[ \t]*\r?\n.*?(?=^Thời gian[ \t]*$)`; if `Mau` = `viettel`: **Match Text** `(?ims)^[^\r\n]*MBBank[ \t]*\r?\n.*?(?=^Xem chi tiết)` (only valid for the observed MBBank layout).
   If exactly one match: **Replace Text** `^[^\r\n]*\r?\n` → *empty* (regex), then `\s+` → one space, **Trim** → `NoiDung`. Otherwise **Ask for Input** (Text) → `NoiDung`.
6. Time — **Match Text** `\b\d{2}:\d{2}[ \t]+\d{2}/\d{2}/\d{4}\b`. If exactly one: **Replace Text** (regex) find `(\d{2}):(\d{2})[ \t]+(\d{2})/(\d{2})/(\d{4})` replace `$5-$4-$3T$1:$2:00+07:00` → `NgayGio`, `NguonGio` = `receipt`. Otherwise **Choose from Menu**: *Enter date and time* (Ask for Input → Date and Time → **Format Date** ISO 8601, `manual`), *Use current time* (**Current Date** → ISO 8601, `capture`), *Cancel* (Stop). Never use the status-bar clock.
7. Confirm — **Choose from Menu** with prompt text `Amount: SoTien / Note: NoiDung / Time: NgayGio (NguonGio)`: *Send* continues; *Edit* → **Choose from List** (Amount / Note / Time) then re-ask that value and show the menu again (use **Repeat** or a second pass); *Cancel* → **Stop**. Also let the user flip `Loai` (`expense` default, `income`) here.
8. **Generate UUID** → `Uuid`. **Get Contents of URL**:
   - URL `https://<api-host>/integrations/ios-shortcuts/transactions`, Method **POST**
   - Headers: `Authorization` = `Bearer <your token>`, `Content-Type` = `application/json`
   - Request Body **JSON**, one key per row with the right type: `schema_version` Number 1, `client_transaction_id` Text `Uuid`, `type` Text `Loai`, `amount` **Number** `SoTien`, `currency` Text `VND`, `note` Text `NoiDung`, `occurred_at` Text `NgayGio`, `time_source` Text `NguonGio`, `source` Text `ios_shortcut`, `capture_method` Text `screenshot_local_ocr`, `receipt_template` Text `Mau`, `reviewed` **Boolean** true.
9. **Get Dictionary from Input** → read `ok`. **If** `ok` is true: check `duplicate` → show `Already saved` or `Saved`; otherwise show the `error.message` (or "Could not save") — an HTML response or a missing `ok` is a failure.

Do not add *Save to Photo Album*. Keep the token only in your own copy; never share this Shortcut without removing it. There is no offline retry in this version: if the request fails, nothing is saved — run it again (the same receipt with a new UUID is a new transaction, so check the web list first).

### Back Tap

Settings → Accessibility → Touch → Back Tap → Triple Tap → Shortcuts → `Log Payment`. Open the receipt, then tap the back of the phone. Do not run it from the Shortcuts editor (it would screenshot the editor).

## Verification status

Server side is tested locally (create, duplicate, conflict, bad token, invalid date, extra keys, wrong content type; `transaction_url` returned on 201 and 200; three concurrent sends of one key → one row). The `/tx/<id>` page is checked in a desktop and a 375 px browser (row found and outlined, no horizontal scroll; foreign id → "not found"). The notification tap is not verified on a real iPhone. Not verified on a real iPhone: the regexes, action names and Back Tap behaviour depend on iOS and the exact OCR output — test with the MSB and Viettel Money receipts and adjust.
