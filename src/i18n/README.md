# i18n module

Self-contained language support for React + Tailwind sites (no dependencies, no imports from the host app).
Reuse it by copying this folder into another site.

```ts
// src/locales/index.ts
import { createI18n } from '../i18n'
import { en } from './en'
import { vi } from './vi'

export const { I18nProvider, useI18n, LanguageSwitch } = createI18n({
  messages: { en, vi }, // same keys in every language: type vi as Record<keyof typeof en, string>
  defaultLocale: 'vi',
  storageKey: 'my-site.lang',
})
```

- Wrap the app in `<I18nProvider>` and put `<LanguageSwitch label={t('lang.label')} />` in the header.
- `const { t, tOr, locale, intl } = useI18n()`
  - `t('key', { name })` fills `{name}` placeholders; with `{ count: 1 }` it uses `key.one` when that entry exists.
  - `tOr(dynamicKey, fallback)` translates keys built at runtime (e.g. `category.food`) and falls back to the raw value, so user-entered data is never translated.
  - `intl` is the BCP-47 tag for `Intl.*` (`en-US`, `vi-VN`).
- The choice is stored in localStorage and mirrored to `<html lang>`.
- Add a language: add it to `LOCALES` (`locales.ts`) and `flags.tsx`, then add a dictionary next to the others.
- Convention: code, keys and stored data are English; only displayed text is translated. Free text users type stays as typed.
