import { useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'

import type { Task } from '@/modules/tasks/domain/task'
import { TaskForm } from '@/modules/tasks/presentation/components/TaskForm'
import { TaskItem } from '@/modules/tasks/presentation/components/TaskItem'
import { usePendingTaskChanges } from '@/modules/tasks/presentation/hooks/use-pending-task-changes'
import { useTasks } from '@/modules/tasks/presentation/hooks/use-tasks'

export function TasksPage() {
  const { access } = useRouteContext({
    from: '/_app',
  })

  const identity = access.localIdentity

  if (!identity) {
    return (
      <p>
        El dispositivo todavía no tiene una identidad local activa.
      </p>
    )
  }

  return (
    <TasksContent
      userId={identity.userId}
      deviceId={identity.deviceId}
    />
  )
}

function TasksContent({
  userId,
  deviceId,
}: {
  userId: string
  deviceId: string
}) {
  const [status, setStatus] =
    useState<
      'all' |
      'todo' |
      'in_progress' |
      'done'
    >('all')

  const [search, setSearch] =
    useState('')

  const [
    includeArchived,
    setIncludeArchived,
  ] = useState(false)

  const [editingTask, setEditingTask] =
    useState<Task | null>(null)

  const tasks = useTasks({
    userId,
    status,
    search,
    includeArchived,
  })

  const pendingChanges =
    usePendingTaskChanges(userId)

  const context = {
    userId,
    deviceId,
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          Tareas
        </h1>

        <p className="text-sm text-muted-foreground">
          {pendingChanges === 0
            ? 'No hay cambios locales pendientes.'
            : `${pendingChanges} cambio(s) pendiente(s) de sincronización.`}
        </p>
      </header>

      <TaskForm
        key={
          editingTask?.id ??
          'new-task'
        }
        context={context}
        task={editingTask}
        onCompleted={() =>
          setEditingTask(null)
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Buscar tareas"
          className="h-10 min-w-56 flex-1 rounded-md border px-3"
        />

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target
                .value as typeof status,
            )
          }
          className="h-10 rounded-md border px-3"
        >
          <option value="all">
            Todos los estados
          </option>
          <option value="todo">
            Pendientes
          </option>
          <option value="in_progress">
            En progreso
          </option>
          <option value="done">
            Completadas
          </option>
        </select>

        <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) =>
              setIncludeArchived(
                event.target.checked,
              )
            }
          />
          Mostrar archivadas
        </label>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <h2 className="font-medium">
            No hay tareas
          </h2>

          <p className="text-sm text-muted-foreground">
            Crea una tarea para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task: Task) => (
            <TaskItem
              key={task.id}
              task={task}
              context={context}
              onEdit={setEditingTask}
            />
          ))}
        </div>
      )}
    </section>
  )
}
