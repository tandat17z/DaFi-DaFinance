/** Text that is either the same in every language or keyed by locale (`{ en: '…', vi: '…' }`). */
export type Localized = string | Record<string, string>

export type ChangeKind = 'added' | 'changed' | 'fixed'

export interface Change {
  kind?: ChangeKind
  text: Localized
}

export interface ChangelogEntry {
  /** Free-form, e.g. `1.2.0`. The first entry of the list is the current version. */
  version: string
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  changes: Change[]
}

export interface BrandLabels {
  /** Dialog title. */
  changelog: string
  /** Marks the newest entry. */
  current: string
  close: string
  added: string
  changed: string
  fixed: string
  /** aria-label of the version button, `{version}` is replaced. */
  openChangelog: string
}
