import type { SyncOperationType } from '@/platform/sync/sync.types'
import type { Task } from '../../domain/task'

export type TaskCommitResult =
  | {
      type: 'queued'
      operationId: string
    }
  | {
      type: 'removed_local_only'
    }

export interface TaskWriteStore {
  commit(
    task: Task,
    operation: SyncOperationType,
    deviceId: string,
  ): Promise<TaskCommitResult>
}
