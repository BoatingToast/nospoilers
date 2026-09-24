// Keeps a visitor's destination (e.g. a shared profile they wanted to compare
// against) across login, registration, and onboarding.

/** Returns `value` only when it is a same-origin path; otherwise `fallback`. */
export function safeCallbackUrl(value: string | null | undefined, fallback: string): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback
}

/** Reads a safe callbackUrl from the current page's query string (client only). */
export function readCallbackUrl(): string | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('callbackUrl')
  return value ? safeCallbackUrl(value, '') || null : null
}

/** Appends `callbackUrl` to `path` when one is present. */
export function withCallbackUrl(path: string, callbackUrl: string | null | undefined): string {
  return callbackUrl ? `${path}?callbackUrl=${encodeURIComponent(callbackUrl)}` : path
}
