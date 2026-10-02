# CLAUDE.md

This file guides Claude Code when working in this repository. Owner-specific setup (real hosts,
sibling repos, deploy) is in `CLAUDE.local.md`, which is git-ignored — read it when present.

## Project

**DaFinance** — personal expense tracker. It runs two ways:

- **Standalone** (what a clone gets): no API, no sign-in, data in the browser.
- **Hosted**: a static SPA behind Cloudflare Access (this app contains no auth code), data in a
  companion central API (`/v1/finance`). The API decides per user where data lives: the owner and
  approved users on the server, everyone else in the browser, with a request for server storage.

It can be launched from a Workspace hub (`VITE_WORKSPACE_URL`, header "← Workspace"; hidden when unset).
The header shows the shared `<tdz-account>` menu (`public/account.js`, canonical copy in the hub repo);
its `account-url` shows where data is stored and sends the storage request.

Stays decoupled from other apps: never import code, types or env vars from sibling repos (the API is
used over HTTP only; `src/lib/types.ts` mirrors its contract).

## Public repository rules

This repository is public. Before every commit:

- **No infrastructure in tracked files**: no real hostnames or URLs of the deployed app, hub or API,
  no Cloudflare account / database / Access ids, no emails of users. Use env vars, placeholders
  (`https://<api-host>`) or generic words ("the API", "the hub"). Real values go in git-ignored
  files: `CLAUDE.local.md`, `.env.production.local`, `wrangler.jsonc` (from `wrangler.example.jsonc`),
  `.claude/dev-real/`.
- Allowed exceptions (public on purpose): the live app `https://finance.tandat17z.workers.dev` and the author site `https://www.tandat17z.workers.dev`, in README only. Never the API or hub hosts.
- **No secrets anywhere**, not even in examples: tokens, keys, passwords. Anything `VITE_*` is public.
- Commit author emails are fine (not a concern).
- Check with `git grep -nE "<your domain>|@"` on the staged tree when in doubt.

## Language rules

- Code, file names, comments, commit messages, docs, API/database field names and stored enum values (transaction `type`, category keys like `food`, `salary`): English.
- Conversation with the developer: Vietnamese. UI text is translated (`en` / `vi`, default `vi`, choice saved in `localStorage`); money/dates/months are formatted per locale via `useFormat()`. Text the user types (notes) is stored as typed, never translated.
- Language support lives in the self-contained `src/i18n/` module (see its README) — copy it to other sites. Messages are in `src/locales/en.ts` (reference) and `vi.ts`: add a key to both. No hard-coded UI strings in components.

## Tech stack

- Vite + React 19 + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite`), Geist / Geist Mono via `@fontsource-variable`. Charts are plain HTML/CSS bars (no chart library).
- Data access goes through a `FinanceStore` (`src/lib/storage.ts`): `serverStore` (API) or `localStore(key)` (localStorage, `dafinance.u.<key>.*`). Components use `useStore()`, never `apiFetch` for data. Totals are computed in the app.
- Hosted: the API is called at `/api/...` on this host; `worker/index.js` forwards only `/api/v1/finance/*` and `/api/health` to the API Worker (service binding) with the Access JWT. Where data lives comes from `GET /v1/finance/account` (`src/lib/account.ts`, read by `AccountGate`, re-read when the tab/window comes back): `cloud` → `serverStore`; `local` → `localStore(email)`; `readonly` (grant revoked) → server data copied into the browser once, then local. After approval, `StorageNotice` moves browser data to the server. The API enforces all of this; the frontend only follows it. The old key `dafinance.transactions` is only read for the one-off "Chuyển lên server" import.
- Security: no tokens or secrets in the frontend; React escaping only (no `innerHTML` with data); `public/_headers` sets CSP, `X-Frame-Options`, `noindex`; CSV export neutralises formula cells.
- Theme: **dark only**, design tokens copied from the hub's `globals.css` into `src/index.css` — keep them in sync. Use token classes (`bg-surface`, `border-border`, `text-muted`, `text-income`, `text-expense`…), never raw hex in components.
- Package manager: npm. Lint: oxlint.

## Structure

```
src/
├── App.tsx              # Header + month navigator, stat tiles (savings rate), layout
├── components/
│   ├── ui.tsx           # Card, StatTile, Button, Label
│   ├── TxForm.tsx       # Add / edit transaction (remounted via key when editing)
│   ├── SpendingCharts.tsx / SpendingCalendar.tsx  # weekday/week/month bars; heat-map calendar + day bubble
│   ├── CategoryChart.tsx# Expense by category, ranked bars (single hue)
│   ├── TxList.tsx       # Search, list grouped by day, edit/delete, CSV export
│   ├── AccountGate.tsx  # Standalone store, or reads the account and provides the store (server / browser)
│   └── StorageNotice.tsx# Browser-only banner + storage request; move browser data up after approval
├── config/categories.ts # Income / expense category keys (+ legacy Vietnamese name map)
├── i18n/                # Reusable language module (createI18n, LanguageSwitch)
├── brand/               # Reusable logo + name + version + changelog dialog (AppBrand); data in config/changelog.ts
├── locales/             # en.ts, vi.ts dictionaries + the app's i18n instance
└── lib/                 # types, api client, account, storage (FinanceStore, hooks, legacy import), format, csv, cn
```

Transaction: `{ id, type: 'income' | 'expense', amount (integer VND), category, date: 'YYYY-MM-DD' (local), note }`.

## Modes

| Vite mode | Env file | Data |
|---|---|---|
| `standalone` (`npm run dev`, `build:standalone`) | `.env.standalone` (`VITE_STANDALONE=1`) | browser only, nothing fetched — keep it working, it is how others use the repo |
| `demo` (`npm run dev:demo`) | `.env.demo` | local API on :8787 with sample data |
| `real` (`npm run dev:real`) | `.env.real` | local API bound to the real database — **writes are real** |
| production (`npm run build`) | `.env.production.local` (untracked) | `/api` on the deployed host |

The header shows a DEMO / REAL DATA chip in dev modes. `.claude/launch.json` has matching entries.

## Commands

```bash
npm install
npm run dev       # http://localhost:5174, standalone
npm run lint
npm run build     # tsc -b && vite build → dist/
```

Before considering work done: `lint` and `build` pass; standalone still runs; check mobile and desktop layouts.
