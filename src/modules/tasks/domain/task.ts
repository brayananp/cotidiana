export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'done',
] as const

export type TaskStatus =
  (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = [
  'none',
  'low',
  'medium',
  'high',
  'urgent',
] as const

export type TaskPriority =
  (typeof TASK_PRIORITIES)[number]

export type Task = {
  id: string
  userId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  plannedAt: string | null
  dueAt: string | null
  completedAt: string | null
  archivedAt: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  version: number
}

export type CreateTaskEntityInput = {
  userId: string
  title: string
  description: string | null
  priority: TaskPriority
  plannedAt: string | null
  dueAt: string | null
}

export type UpdateTaskEntityInput = {
  title: string
  description: string | null
  priority: TaskPriority
  plannedAt: string | null
  dueAt: string | null
}

export function createTaskEntity(
  input: CreateTaskEntityInput,
  now = new Date(),
): Task {
  const timestamp = now.toISOString()

  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    title: normalizeTitle(input.title),
    description: normalizeDescription(input.description),
    status: 'todo',
    priority: input.priority,
    plannedAt: input.plannedAt,
    dueAt: input.dueAt,
    completedAt: null,
    archivedAt: null,
    sortOrder: now.getTime(),
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    version: 1,
  }
}

export function updateTaskEntity(
  task: Task,
  input: UpdateTaskEntityInput,
  now = new Date(),
): Task {
  assertTaskIsEditable(task)

  return {
    ...task,
    title: normalizeTitle(input.title),
    description: normalizeDescription(input.description),
    priority: input.priority,
    plannedAt: input.plannedAt,
    dueAt: input.dueAt,
    updatedAt: now.toISOString(),
    version: task.version + 1,
  }
}

export function changeTaskStatus(
  task: Task,
  status: TaskStatus,
  now = new Date(),
): Task {
  assertTaskIsEditable(task)

  return {
    ...task,
    status,
    completedAt:
      status === 'done' ? now.toISOString() : null,
    updatedAt: now.toISOString(),
    version: task.version + 1,
  }
}

export function setTaskArchived(
  task: Task,
  archived: boolean,
  now = new Date(),
): Task {
  assertTaskIsEditable(task)

  return {
    ...task,
    archivedAt: archived ? now.toISOString() : null,
    updatedAt: now.toISOString(),
    version: task.version + 1,
  }
}

export function deleteTaskEntity(
  task: Task,
  now = new Date(),
): Task {
  assertTaskIsEditable(task)

  return {
    ...task,
    deletedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    version: task.version + 1,
  }
}

export function assertTaskOwnership(
  task: Task,
  userId: string,
): void {
  if (task.userId !== userId) {
    throw new Error('TASK_FORBIDDEN')
  }
}

function assertTaskIsEditable(task: Task): void {
  if (task.deletedAt) {
    throw new Error('TASK_ALREADY_DELETED')
  }
}

function normalizeTitle(title: string): string {
  const normalized = title.trim()

  if (!normalized) {
    throw new Error('TASK_TITLE_REQUIRED')
  }

  return normalized
}

function normalizeDescription(
  description: string | null,
): string | null {
  const normalized = description?.trim()
  return normalized ? normalized : null
}
