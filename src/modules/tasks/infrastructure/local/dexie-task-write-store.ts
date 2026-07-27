import { getLocalDatabase } from '@/platform/database/local-database'
import {
  createSyncMetadataId,
  type SyncMetadataRecord,
  type SyncOperationRecord,
  type SyncOperationType,
} from '@/platform/sync/sync.types'

import type {
  TaskCommitResult,
  TaskWriteStore,
} from '../../application/ports/task-write-store'
import type { Task } from '../../domain/task'
import { taskToRecord } from './task.mapper'

export class DexieTaskWriteStore
  implements TaskWriteStore
{
  async commit(
    task: Task,
    requestedOperation: SyncOperationType,
    deviceId: string,
  ): Promise<TaskCommitResult> {
    const db = getLocalDatabase()

    return db.transaction(
      'rw',
      db.tasks,
      db.syncOperations,
      db.syncMetadata,
      async () => {
        const pendingOperations =
          await db.syncOperations
            .where('[entityType+entityId]')
            .equals(['task', task.id])
            .filter(
              (operation) =>
                operation.status === 'pending',
            )
            .toArray()

        const pendingCreate =
          pendingOperations.find(
            (operation) =>
              operation.operation === 'create',
          )

        if (
          requestedOperation === 'delete' &&
          pendingCreate
        ) {
          await db.tasks.delete(task.id)

          if (pendingOperations.length) {
            await db.syncOperations.bulkDelete(
              pendingOperations.map(
                (operation) => operation.id,
              ),
            )
          }

          await db.syncMetadata.delete(
            createSyncMetadataId(
              'task',
              task.id,
            ),
          )

          return {
            type: 'removed_local_only',
          }
        }

        const effectiveOperation =
          pendingCreate &&
          requestedOperation === 'update'
            ? 'create'
            : requestedOperation

        const metadataId =
          createSyncMetadataId(
            'task',
            task.id,
          )

        const existingMetadata =
          await db.syncMetadata.get(
            metadataId,
          )

        const now = new Date().toISOString()
        const operationId =
          crypto.randomUUID()

        const operation: SyncOperationRecord = {
          id: operationId,
          userId: task.userId,
          deviceId,
          entityType: 'task',
          entityId: task.id,
          operation: effectiveOperation,
          payload:
            effectiveOperation === 'delete'
              ? {
                  id: task.id,
                  deletedAt: task.deletedAt,
                  version: task.version,
                }
              : task,
          baseVersion:
            existingMetadata?.remoteVersion ??
            null,
          status: 'pending',
          attempts: 0,
          nextRetryAt: null,
          lastError: null,
          createdAt:
            pendingOperations[0]?.createdAt ??
            now,
          updatedAt: now,
        }

        const metadata: SyncMetadataRecord = {
          id: metadataId,
          entityType: 'task',
          entityId: task.id,
          localVersion: task.version,
          remoteVersion:
            existingMetadata?.remoteVersion ??
            null,
          state: 'pending',
          lastSyncedAt:
            existingMetadata?.lastSyncedAt ??
            null,
          lastError: null,
          updatedAt: now,
        }

        await db.tasks.put(
          taskToRecord(task),
        )

        if (pendingOperations.length) {
          await db.syncOperations.bulkDelete(
            pendingOperations.map(
              (pending) => pending.id,
            ),
          )
        }

        await db.syncOperations.put(operation)
        await db.syncMetadata.put(metadata)

        return {
          type: 'queued',
          operationId,
        }
      },
    )
  }
}
