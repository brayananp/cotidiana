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
  | 'rejected'

export type SyncMetadataState =
  | 'synced'
  | 'pending'
  | 'failed'
  | 'conflict'

export type SyncRuntimeState =
  | 'idle'
  | 'syncing'
  | 'offline'
  | 'reauthentication_required'
  | 'error'

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

export type SyncCursorRecord = {
  id: string
  userId: string
  entityType: SyncEntityType
  cursor: number
  updatedAt: string
}

export type SyncConflictRecord = {
  id: string
  userId: string
  entityType: SyncEntityType
  entityId: string
  localPayload: unknown
  remotePayload: unknown
  remoteVersion: number
  localOperationIds: string[]
  reason: string
  createdAt: string
  resolvedAt: string | null
}

export type SyncRuntimeRecord = {
  id: string
  userId: string
  entityType: SyncEntityType
  state: SyncRuntimeState
  lastStartedAt: string | null
  lastCompletedAt: string | null
  lastError: string | null
  updatedAt: string
}

export type PushOperationAppliedResult = {
  operationId: string
  entityId: string
  status: 'applied'
  duplicate: boolean
  version: number
  serverPayload: unknown
}

export type PushOperationConflictResult = {
  operationId: string
  entityId: string
  status: 'conflict'
  duplicate: boolean
  reason: string
  serverVersion: number
  serverPayload: unknown
}

export type PushOperationRejectedResult = {
  operationId: string
  entityId: string
  status: 'rejected'
  duplicate: boolean
  reason: string
}

export type PushOperationResult =
  | PushOperationAppliedResult
  | PushOperationConflictResult
  | PushOperationRejectedResult

export type PullTaskChange = {
  sequence: number
  entityType: 'task'
  entityId: string
  operation: SyncOperationType
  version: number
  payload: unknown
  createdAt: string
}

export function createSyncMetadataId(
  entityType: SyncEntityType,
  entityId: string,
): string {
  return `${entityType}:${entityId}`
}

export function createSyncCursorId(
  userId: string,
  entityType: SyncEntityType,
): string {
  return `${userId}:${entityType}`
}

export function createSyncRuntimeId(
  userId: string,
  entityType: SyncEntityType,
): string {
  return `${userId}:${entityType}`
}
