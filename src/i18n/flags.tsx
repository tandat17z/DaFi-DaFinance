import type { ReactNode } from 'react'
import type { Locale } from './locales'

const GB = (
  <svg viewBox="0 0 60 30" aria-hidden="true">
    <clipPath id="i18n-gb">
      <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
    </clipPath>
    <path d="M0 0v30h60V0z" fill="#012169" />
    <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
    <path d="M0 0l60 30m0-30L0 30" clipPath="url(#i18n-gb)" stroke="#C8102E" strokeWidth="4" />
    <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
    <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
  </svg>
)

const VN = (
  <svg viewBox="0 0 30 20" aria-hidden="true">
    <rect width="30" height="20" fill="#da251d" />
    <path fill="#ff0" d="M15 4l1.76 5.41h5.69l-4.6 3.35 1.76 5.41L15 14.82l-4.61 3.35 1.76-5.41-4.6-3.35h5.69z" />
  </svg>
)

const FLAGS: Record<Locale, ReactNode> = { en: GB, vi: VN }

export function Flag({ locale }: { locale: Locale }) {
  return <span className="inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-white/10 [&>svg]:size-full">{FLAGS[locale]}</span>
}
