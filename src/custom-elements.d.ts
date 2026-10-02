import type { DetailedHTMLProps, HTMLAttributes } from 'react'

// <tdz-account> is defined by public/account.js (shared account menu module).
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'tdz-account': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        lang?: 'vi' | 'en'
        'login-url'?: string
        'admin-url'?: string
        'me-url'?: string
        'account-url'?: string
      }
    }
  }
}
