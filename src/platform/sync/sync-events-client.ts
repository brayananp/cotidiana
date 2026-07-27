const TASK_SYNC_REQUESTED_EVENT =
  'personal-productivity-os:task-sync-requested'

export function requestTaskSync(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(TASK_SYNC_REQUESTED_EVENT),
  )
}

export function subscribeToTaskSyncRequests(
  listener: () => void,
): () => void {
  window.addEventListener(
    TASK_SYNC_REQUESTED_EVENT,
    listener,
  )

  return () => {
    window.removeEventListener(
      TASK_SYNC_REQUESTED_EVENT,
      listener,
    )
  }
}
