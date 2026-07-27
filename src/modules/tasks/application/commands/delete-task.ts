import {
  assertTaskOwnership,
  deleteTaskEntity,
} from '../../domain/task'
import type { TaskRepository } from '../../domain/repositories/task.repository'
import type { TaskWriteStore } from '../ports/task-write-store'
import type { TaskExecutionContext } from '../task-context'

export function deleteTaskCommand(
  repository: TaskRepository,
  writeStore: TaskWriteStore,
) {
  return async (
    taskId: string,
    context: TaskExecutionContext,
  ) => {
    const existing =
      await repository.findById(taskId)

    if (!existing) {
      throw new Error('TASK_NOT_FOUND')
    }

    assertTaskOwnership(
      existing,
      context.userId,
    )

    const deleted = deleteTaskEntity(existing)

    await writeStore.commit(
      deleted,
      'delete',
      context.deviceId,
    )
  }
}
