const HEALTH_ENDPOINT = '/api/health'
const DEFAULT_TIMEOUT_MS = 4_000

export function browserReportsOnline(): boolean {
  return typeof navigator !== 'undefined'
    ? navigator.onLine
    : false
}

export async function isServerAvailable(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
  if (!browserReportsOnline()) {
    return false
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    timeoutMs,
  )

  try {
    const response = await fetch(HEALTH_ENDPOINT, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
      },
    })

    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

export function subscribeToNetworkChanges(
  listener: () => void,
): () => void {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)

  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}
