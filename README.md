# DaFinance

A personal expense tracker: income and spending by category, monthly totals, a spending calendar,
savings and investments, and an iPhone Shortcut that logs a payment straight from a bank receipt.

- **Live app:** [finance.tandat17z.workers.dev](https://finance.tandat17z.workers.dev) — sign in to use it;
  your data stays in your browser until server storage is approved.
- **Author:** [www.tandat17z.workers.dev](https://www.tandat17z.workers.dev)

The app is a static SPA. Clone it and run it on your own machine with no server at all, or host it
with a companion API behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
(the app contains no auth code of its own).

- UI in Vietnamese (default) and English, money / dates formatted per locale
- Dark theme, works on phone and desktop
- No tracking, no third-party services
- Runs fully offline from a clone (`npm run dev`): no server, data stays in your browser

## Features

| | |
|---|---|
| **Add** | Quick add form (amount, category, date, time, note, optional "for month"), searchable list grouped by day, inline edit / delete, CSV export |
| **Dashboard** | Income, spending and savings rate for any period; spending by weekday / week / month; heat-map calendar; category breakdown (ranked bars + donut) |
| **Savings** | Savings and investment holdings |
| **iPhone Shortcut** | Triple-tap the back of the phone on a receipt → on-device OCR → review → saved. See [docs/iphone-shortcut.md](docs/iphone-shortcut.md) |

## iPhone Shortcut (receipt → transaction)

```
Back Tap → Take Screenshot → Extract Text from Image (on-device OCR)
        → Scriptable "Log Payment" (background): amount, note, time
        → Shortcuts menu: Save / Edit (Number, Text, Date and Time sheets)
        → Scriptable: POST to the API → notification (tap opens the transaction)
```

- Parses **MSB** and **Viettel Money** receipts, in both OCR reading orders (label/value pairs or
  all labels first). Other receipts: amount only, the rest is typed.
- The screenshot and the OCR text never leave the phone; only amount, note and time are sent.
- The device token is kept in the iOS Keychain, never in the script or the Shortcut.
- Safe to retry: a failed send reuses its id, so it never creates a second expense.

Files: [`shortcuts/log-payment.scriptable.js`](shortcuts/log-payment.scriptable.js) (Scriptable
script), [`shortcuts/log-payment.jelly`](shortcuts/log-payment.jelly) (older Jellycuts variant).
Setup, the server side and every Shortcut action: [docs/iphone-shortcut.md](docs/iphone-shortcut.md).

## Tech stack

- Vite + React 19 + TypeScript, Tailwind CSS v4, Geist fonts; charts are plain HTML/CSS
- Shared modules (language, brand, account menu, `/api` proxy, colour tokens) from
  [`@tada/kit`](https://github.com/tandat17z/tada-kit); messages in `src/locales/`
- Hosted as Cloudflare Workers static assets (`wrangler.jsonc`, deployed from Git by Workers Builds); `worker/index.js` forwards
  `/api/v1/finance/*` (and `/api/health`) to the API Worker through a service binding
- Lint: oxlint

```
src/
├── App.tsx            # header, tabs, period controls, layout
├── components/        # forms, list, charts, calendar, portfolio, UI primitives
├── config/            # categories, changelog
├── locales/           # en / vi messages
└── lib/               # types, API client, storage hooks, formatting, CSV, periods
shortcuts/             # iPhone Shortcut: Scriptable script (+ Jellycuts variant)
docs/                  # iPhone Shortcut setup
worker/                # /api proxy for the deployed app
```

## Getting started (no server needed)

Requires Node.js 20+. Clone, then:

```bash
npm install
npm run dev                # http://localhost:5174 — standalone, no API, no sign-in
npm run build:standalone   # → dist/, a static site for any host (SPA fallback to index.html)
```

Standalone keeps everything in this browser (`localStorage`): nothing leaves your machine, and
clearing site data or switching browsers loses it, so use **CSV export** for backups.

## With the API (the hosted version)

The hosted app stores data in a companion API (a Cloudflare Worker with a D1 database, not in this
repo); `src/lib/types.ts` mirrors its contract. Signed-in users without server storage still use
the browser store and can ask the owner for server storage from the banner or the account menu.

```bash
npm run dev:demo   # http://localhost:5174, expects the API on http://localhost:8787
npm run lint
npm run build      # tsc -b && vite build → dist/
```

Settings are Vite env files: `.env.standalone`, `.env.demo` (local sample data), `.env.real` (local
API bound to the real database — writes are real) and `.env.example`. No secrets belong in them:
anything prefixed `VITE_` ends up in the browser bundle.

## Deploy

Standalone: upload `dist/` from `npm run build:standalone` to any static host.

Hosted (Cloudflare Workers, with the API):

```bash
npm run build       # VITE_WORKSPACE_URL (optional) from .env.production.local or the build env
npx wrangler deploy # worker "finance", service binding to a Worker named "api"
```

Or connect the repo to the Worker in the Cloudflare dashboard (Workers Builds) with the same two
commands, so every push to `master` deploys.

Put the app's hostnames (custom domain and `*.workers.dev`) behind a Cloudflare Access policy. The
API must expose the iPhone Shortcut route without Access (token-protected instead); see the docs.

## Privacy

This repository holds code only: no transactions, no tokens, no account data. Local files with
real settings or hosts are git-ignored (`*.local`, `CLAUDE.local.md`, `.claude/dev-real/`). Keep the device token out of
commits; if it leaks, rotate it with `wrangler secret put IOS_SHORTCUT_TOKEN` on the API.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
