import { useEffect, useState } from 'react'

const PHONE = '(max-width: 639px)'

/** True on phone-sized viewports, where floating popups turn into bottom sheets. */
export function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE).matches)
  useEffect(() => {
    const mq = window.matchMedia(PHONE)
    const update = () => setPhone(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return phone
}

/** Marks the content of a phone sheet so "click outside" handlers elsewhere do not treat taps inside it as outside. */
export const SHEET_ATTR = 'data-sheet'
export const inSheet = (target: EventTarget | null) => target instanceof Element && !!target.closest(`[${SHEET_ATTR}]`)
