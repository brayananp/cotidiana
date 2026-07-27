import {
  assertTaskOwnership,
  updateTaskEntity,
} from '../../domain/task'
import type { TaskRepository } from '../../domain/repositories/task.repository'
import { taskFormSchema } from '../../schemas/task-input.schema'
import { localDateTimeToIso } from '../date-mapper'
import type { TaskWriteStore } from '../ports/task-write-store'
import type { TaskExecutionContext } from '../task-context'

export function updateTaskCommand(
  repository: TaskRepository,
  writeStore: TaskWriteStore,
) {
  return async (
    taskId: string,
    rawInput: unknown,
    context: TaskExecutionContext,
  ) => {
    const input = taskFormSchema.parse(rawInput)
    const existing =
      await repository.findById(taskId)

    if (!existing) {
      throw new Error('TASK_NOT_FOUND')
    }

    assertTaskOwnership(
      existing,
      context.userId,
    )

    const updated = updateTaskEntity(existing, {
      title: input.title,
      description: input.description,
      priority: input.priority,
      plannedAt: localDateTimeToIso(
        input.plannedAt,
      ),
      dueAt: localDateTimeToIso(input.dueAt),
    })

    await writeStore.commit(
      updated,
      'update',
      context.deviceId,
    )

    return updated
  }
}
