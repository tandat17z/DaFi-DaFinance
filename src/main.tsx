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
