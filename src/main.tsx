import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@tada/kit/account-menu' // defines <tdz-account>
import './index.css'
import App from './App.tsx'
import { AccountGate } from './components/AccountGate'
import { I18nProvider } from './locales'
import { SettingsProvider } from './lib/settings'
import './lib/install' // catch the install prompt before Settings is opened

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <SettingsProvider>
        <AccountGate>
          <App />
        </AccountGate>
      </SettingsProvider>
    </I18nProvider>
  </StrictMode>,
)

// Installable app (PWA): offline shell only, see public/sw.js. Not in dev, to keep HMR simple.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
