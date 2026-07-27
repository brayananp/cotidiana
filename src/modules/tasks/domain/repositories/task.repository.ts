import type { Task } from '../task'
import type { TaskQuery } from '../task-query'

export interface TaskRepository {
  findById(id: string): Promise<Task | null>
  list(query: TaskQuery): Promise<Task[]>
}
