import type { ReactNode } from 'react'

import { tasksDependencies } from '@/modules/tasks/infrastructure/tasks.dependencies'
import type { TaskExecutionContext } from '../../application/task-context'
import type {
  Task,
  TaskStatus,
} from '../../domain/task'
import {
  taskPriorityLabels,
  taskStatusLabels,
} from '../task-labels'

type TaskItemProps = {
  task: Task
  context: TaskExecutionContext
  onEdit: (task: Task) => void
}

export function TaskItem({
  task,
  context,
  onEdit,
}: TaskItemProps) {
  const changeStatus = async (
    status: TaskStatus,
  ) => {
    await tasksDependencies.changeStatus(
      task.id,
      status,
      context,
    )
  }

  return (
    <article className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3
            className={
              task.status === 'done'
                ? 'font-medium line-through opacity-60'
                : 'font-medium'
            }
          >
            {task.title}
          </h3>

          {task.description && (
            <p className="text-sm text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex gap-2 text-xs">
          <span className="rounded-full border px-2 py-1">
            {
              taskStatusLabels[
                task.status
              ]
            }
          </span>

          <span className="rounded-full border px-2 py-1">
            {
              taskPriorityLabels[
                task.priority
              ]
            }
          </span>
        </div>
      </div>

      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        {task.plannedAt && (
          <span>
            Planificada:{' '}
            {formatDate(task.plannedAt)}
          </span>
        )}

        {task.dueAt && (
          <span>
            Límite:{' '}
            {formatDate(task.dueAt)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {task.status !== 'in_progress' && (
          <ActionButton
            onClick={() =>
              void changeStatus(
                'in_progress',
              )
            }
          >
            Iniciar
          </ActionButton>
        )}

        {task.status !== 'done' && (
          <ActionButton
            onClick={() =>
              void changeStatus('done')
            }
          >
            Completar
          </ActionButton>
        )}

        {task.status !== 'todo' && (
          <ActionButton
            onClick={() =>
              void changeStatus('todo')
            }
          >
            Reabrir
          </ActionButton>
        )}

        <ActionButton
          onClick={() => onEdit(task)}
        >
          Editar
        </ActionButton>

        <ActionButton
          onClick={() =>
            void tasksDependencies.archiveTask(
              task.id,
              !task.archivedAt,
              context,
            )
          }
        >
          {task.archivedAt
            ? 'Restaurar'
            : 'Archivar'}
        </ActionButton>

        <ActionButton
          danger
          onClick={() => {
            const confirmed =
              window.confirm(
                '¿Eliminar esta tarea?',
              )

            if (confirmed) {
              void tasksDependencies.deleteTask(
                task.id,
                context,
              )
            }
          }}
        >
          Eliminar
        </ActionButton>
      </div>
    </article>
  )
}

function ActionButton({
  children,
  danger = false,
  onClick,
}: {
  children: ReactNode
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={
        danger
          ? 'rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive'
          : 'rounded-md border px-3 py-1.5 text-sm'
      }
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    'es-PE',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value))
}
