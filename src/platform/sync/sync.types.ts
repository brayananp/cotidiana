export type SyncEntityType =
  | 'task'
  | 'time_block'
  | 'calendar_event'
  | 'reminder'
  | 'book'
  | 'book_note'
  | 'user_settings'

export type SyncOperationType =
  | 'create'
  | 'update'
  | 'delete'

export type SyncOperationStatus =
  | 'pending'
  | 'processing'
  | 'failed'
  | 'conflict'

export type SyncMetadataState =
  | 'synced'
  | 'pending'
  | 'failed'
  | 'conflict'

export type SyncOperationRecord = {
  id: string
  userId: string
  deviceId: string
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperationType
  payload: unknown
  baseVersion: number | null
  status: SyncOperationStatus
  attempts: number
  nextRetryAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export type SyncMetadataRecord = {
  id: string
  entityType: SyncEntityType
  entityId: string
  localVersion: number
  remoteVersion: number | null
  state: SyncMetadataState
  lastSyncedAt: string | null
  lastError: string | null
  updatedAt: string
}

export function createSyncMetadataId(
  entityType: SyncEntityType,
  entityId: string,
): string {
  return `${entityType}:${entityId}`
}
