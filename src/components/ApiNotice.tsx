import { API_LOGIN_URL, type ApiError } from '../lib/api'
import { useI18n } from '../locales'
import { Button } from './ui'

/** Explains an API error; when the API host isn't signed in yet, links to its Access login. */
export function ApiNotice({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const { t } = useI18n()
  const message = error.needsLogin
    ? t('err.login')
    : error.status === 403
      ? t('err.forbidden')
      : error.code === 'app_disabled'
        ? t('err.disabled')
        : t('err.generic', { message: error.message })

  return (
    <div role="alert" className="rounded-xl border border-expense/40 bg-expense/5 p-4 text-sm">
      <p>{message}</p>
      {error.issues.length > 0 && (
        <ul className="mt-2 list-disc pl-5 font-mono text-xs text-muted">
          {error.issues.map((i) => (
            <li key={`${i.path}:${i.message}`}>
              {i.path && `${i.path}: `}
              {i.message}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {error.needsLogin && (
          <a
            href={API_LOGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            {t('err.relogin')}
          </a>
        )}
        {onRetry && <Button onClick={onRetry}>{t('err.retry')}</Button>}
      </div>
    </div>
  )
}
