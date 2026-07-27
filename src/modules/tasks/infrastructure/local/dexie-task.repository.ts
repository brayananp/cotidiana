import { getLocalDatabase } from '@/platform/database/local-database'

import type { TaskRepository } from '../../domain/repositories/task.repository'
import type { Task } from '../../domain/task'
import type { TaskQuery } from '../../domain/task-query'
import { taskFromRecord } from './task.mapper'

export class DexieTaskRepository
  implements TaskRepository
{
  async findById(
    id: string,
  ): Promise<Task | null> {
    const db = getLocalDatabase()
    const record = await db.tasks.get({ id })

    return record
      ? taskFromRecord(record)
      : null
  }

  async list(
    query: TaskQuery,
  ): Promise<Task[]> {
    const db = getLocalDatabase()

    const records = await db.tasks
      .where('userId')
      .equals(query.userId)
      .toArray()

    const normalizedSearch =
      query.search?.trim().toLowerCase() ?? ''

    return records
      .filter((record) => {
        if (
          !query.includeDeleted &&
          record.deletedAt
        ) {
          return false
        }

        if (
          !query.includeArchived &&
          record.archivedAt
        ) {
          return false
        }

        if (
          query.status &&
          query.status !== 'all' &&
          record.status !== query.status
        ) {
          return false
        }

        if (
          query.priorities?.length &&
          !query.priorities.includes(
            record.priority,
          )
        ) {
          return false
        }

        if (normalizedSearch) {
          const searchable =
            `${record.title} ${record.description ?? ''}`
              .toLowerCase()

          if (
            !searchable.includes(
              normalizedSearch,
            )
          ) {
            return false
          }
        }

        return true
      })
      .sort(compareTasks)
      .map(taskFromRecord)
  }
}

function compareTasks(
  left: {
    status: string
    dueAt: string | null
    sortOrder: number
  },
  right: {
    status: string
    dueAt: string | null
    sortOrder: number
  },
): number {
  if (
    left.status === 'done' &&
    right.status !== 'done'
  ) {
    return 1
  }

  if (
    left.status !== 'done' &&
    right.status === 'done'
  ) {
    return -1
  }

  if (left.dueAt && right.dueAt) {
    return left.dueAt.localeCompare(right.dueAt)
  }

  if (left.dueAt) {
    return -1
  }

  if (right.dueAt) {
    return 1
  }

  return right.sortOrder - left.sortOrder
}
