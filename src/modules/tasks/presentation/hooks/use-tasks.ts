import { useLiveQuery } from 'dexie-react-hooks'

import type { TaskPriority } from '@/modules/tasks/domain/task'
import { tasksDependencies } from '@/modules/tasks/infrastructure/tasks.dependencies'

export type UseTasksInput = {
  userId: string
  status:
    | 'all'
    | 'todo'
    | 'in_progress'
    | 'done'
  search: string
  priorities?: TaskPriority[]
  includeArchived: boolean
}

export function useTasks(
  input: UseTasksInput,
) {
  return useLiveQuery(
    () =>
      tasksDependencies.listTasks({
        userId: input.userId,
        status: input.status,
        search: input.search,
        priorities: input.priorities,
        includeArchived:
          input.includeArchived,
        includeDeleted: false,
      }),

    [
      input.userId,
      input.status,
      input.search,
      input.includeArchived,
      input.priorities?.join(',') ?? '',
    ],

    [],
  )
}
