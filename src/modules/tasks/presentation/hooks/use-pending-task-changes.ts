import { useLiveQuery } from 'dexie-react-hooks'

import { getLocalDatabase } from '@/platform/database/local-database'

export function usePendingTaskChanges(
  userId: string,
): number {
  return (
    useLiveQuery(
      async () => {
        const db = getLocalDatabase()

        const operations =
          await db.syncOperations
            .where('userId')
            .equals(userId)
            .toArray()

        return operations.filter(
          (operation) =>
            operation.entityType === 'task' &&
            (
              operation.status === 'pending' ||
              operation.status === 'failed' ||
              operation.status === 'conflict'
            ),
        ).length
      },
      [userId],
      0,
    ) ?? 0
  )
}
