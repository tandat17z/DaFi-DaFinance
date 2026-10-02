# brand module

Logo + app name + version for the top-left of a site. Clicking the version opens a changelog dialog.
Self-contained (React + Tailwind with the shared colour tokens: `surface`, `border`, `muted`, `accent`, `income`, `expense`, `inc-4`; no imports from the host app). Reuse it by copying this folder into another site.

```tsx
import { AppBrand, type ChangelogEntry } from '../brand'

// The first entry is the current version, so this list is the only place to bump it.
const changelog: ChangelogEntry[] = [
  { version: '1.1.0', date: '2026-10-02', changes: [{ kind: 'added', text: { en: 'Dark mode', vi: 'Giao diện tối' } }] },
  { version: '1.0.0', date: '2026-09-30', changes: [{ text: 'First release' }] },
]

<AppBrand name="MySite" logo={<img src="/logo.svg" alt="" className="size-6" />} changelog={changelog} locale={locale} />
```

- `locale`: `en` (default) or `vi` for the built-in labels; entry text is a string or `{ en, vi }` (falls back to `en`).
- `labels`: override any built-in label (or add a language by passing all of them).
- `version`: only to show something other than the newest entry.
- The name is hidden below the `sm` breakpoint by default (`nameClassName` changes that); the logo and version stay.
- Convention: code and keys are English; changelog text is displayed content, so give it per language.
