import { useSyncExternalStore } from 'react'

// "Install app" (PWA). Chrome / Edge / Samsung Internet fire `beforeinstallprompt` once, early,
// so it is caught at module load and kept until the user asks. Safari / Firefox never fire it:
// there the UI shows how to add the app by hand.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallPrompt | null = null
let installed = typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPrompt
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

export type InstallState = 'installed' | 'ready' | 'ios' | 'manual'

function state(): InstallState {
  if (installed) return 'installed'
  if (deferred) return 'ready'
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'manual'
}

export function useInstall() {
  const s = useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), state, () => 'manual' as InstallState)
  const install = async () => {
    if (!deferred) return
    const p = deferred
    await p.prompt()
    // The prompt can be used only once, whatever the answer.
    deferred = null
    emit()
  }
  return { state: s, install }
}
