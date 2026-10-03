// Client for the central API (`/v1/finance`). Deployed: "/api" on this same host, forwarded by
// worker/index.js to the API Worker, so this app's own Access login covers it. No tokens stored.
// Local dev (`vite` has no worker): VITE_API_URL=http://localhost:8787.
/** Built without the API (`--mode standalone`): no sign-in, data only in this browser. */
export const STANDALONE = import.meta.env.VITE_STANDALONE === '1'

const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')

export const API_LOGIN_URL = `${API_URL}/health`
/** Signed-in email (fallback for the account menu when Access identity is unavailable, e.g. dev). */
export const API_ME_URL = `${API_URL}/v1/finance/me`
/** Account + storage mode (also read by the account menu). */
export const API_ACCOUNT_URL = `${API_URL}/v1/finance/account`
/** Rating + feedback of this app (also read by the account menu). */
export const API_FEEDBACK_URL = `${API_URL}/v1/finance/feedback`

export class ApiError extends Error {
  status: number
  code: string
  issues: { path: string; message: string }[]

  constructor(status: number, code: string, message: string, issues: ApiError['issues'] = []) {
    super(message)
    this.status = status
    this.code = code
    this.issues = issues
  }

  /** Not signed in to the API host: 401, or a CORS failure caused by the Access login redirect. */
  get needsLogin() {
    return this.status === 0 || this.status === 401
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/v1/finance${path}`, {
      ...init,
      credentials: 'include',
      redirect: 'error',
      headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
    })
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the API')
  }

  if (res.status === 204) return undefined as T
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; issues?: ApiError['issues'] } } | null)?.error
    throw new ApiError(res.status, err?.code ?? 'http_error', err?.message ?? `HTTP ${res.status}`, err?.issues ?? [])
  }
  return body as T
}

export const toApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(0, 'unknown', String(e)))
