import { createTaskEntity } from '../../domain/task'
import { taskFormSchema } from '../../schemas/task-input.schema'
import { localDateTimeToIso } from '../date-mapper'
import type { TaskExecutionContext } from '../task-context'
import type { TaskWriteStore } from '../ports/task-write-store'

export function createTaskCommand(
  writeStore: TaskWriteStore,
) {
  return async (
    rawInput: unknown,
    context: TaskExecutionContext,
  ) => {
    const input = taskFormSchema.parse(rawInput)

    const task = createTaskEntity({
      userId: context.userId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      plannedAt: localDateTimeToIso(
        input.plannedAt,
      ),
      dueAt: localDateTimeToIso(input.dueAt),
    })

    await writeStore.commit(
      task,
      'create',
      context.deviceId,
    )

    return task
  }
}
