# Changelog

All notable changes to DaFinance. Newest first. The in-app version dialog reads the same list from
`src/config/changelog.ts` (English and Vietnamese) — update both on every release.

## 1.0.0 — 2026-10-03

First public release.

### Added
- Income and spending by category: quick add form (amount, category, date, time, note, optional
  "for month"), searchable list grouped by day, inline edit / delete, CSV export.
- Monthly view and statistics: savings rate, spending by weekday / week / month, heat-map
  calendar, category breakdown (ranked bars + donut).
- Savings and investments, with total assets and profit.
- Runs without an account: `npm run dev` / `npm run build:standalone` keep everything in the
  browser. Hosted with the companion API, approved users store data on the server; others keep it
  in the browser and can ask for server storage from the banner or the account menu.
- iPhone Shortcut to log a payment from a bank receipt screen (on-device OCR). See
  [docs/iphone-shortcut.md](docs/iphone-shortcut.md).
- Vietnamese and English, dark theme, phone and desktop layouts.
