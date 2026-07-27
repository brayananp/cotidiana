import type { Task } from '@/modules/tasks/domain/task'
import type { TaskRecord } from '@/modules/tasks/infrastructure/local/task.record'

export function taskToRecord(
  task: Task,
): TaskRecord {
  return { ...task }
}

export function taskFromRecord(
  record: TaskRecord,
): Task {
  return { ...record }
}
