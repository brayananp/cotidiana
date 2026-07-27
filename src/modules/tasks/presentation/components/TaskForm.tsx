import { useForm } from '@tanstack/react-form'
import type { ReactNode } from 'react'

import { isoToLocalDateTime } from '@/modules/tasks/application/date-mapper'
import type { TaskExecutionContext } from '@/modules/tasks/application/task-context'
import {
  TASK_PRIORITIES,
  type Task,
} from '@/modules/tasks/domain/task'
import { tasksDependencies } from '@/modules/tasks/infrastructure/tasks.dependencies'
import { taskPriorityLabels } from '@/modules/tasks/presentation/task-labels'
import {
  taskFormSchema,
  type TaskFormInput,
} from '@/modules/tasks/schemas/task-input.schema'

type TaskFormProps = {
  context: TaskExecutionContext
  task?: Task | null
  onCompleted?: () => void
}

export function TaskForm({
  context,
  task,
  onCompleted,
}: TaskFormProps) {
  const defaultValues: TaskFormInput = {
    title: task?.title ?? '',
    description:
      task?.description ?? '',
    priority:
      task?.priority ?? 'none',
    plannedAt: isoToLocalDateTime(
      task?.plannedAt ?? null,
    ),
    dueAt: isoToLocalDateTime(
      task?.dueAt ?? null,
    ),
  }

  const form = useForm({
    defaultValues,

    validators: {
      onSubmit: taskFormSchema,
    },

    onSubmit: async ({ value }) => {
      if (task) {
        await tasksDependencies.updateTask(
          task.id,
          value,
          context,
        )
      } else {
        await tasksDependencies.createTask(
          value,
          context,
        )
      }

      form.reset()
      onCompleted?.()
    },
  })

  return (
    <form
      className="space-y-4 rounded-xl border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div>
        <h2 className="font-semibold">
          {task
            ? 'Editar tarea'
            : 'Nueva tarea'}
        </h2>

        <p className="text-sm text-muted-foreground">
          Se guardará inmediatamente en este dispositivo.
        </p>
      </div>

      <form.Field name="title">
        {(field) => (
          <FieldContainer
            label="Título"
            errors={field.state.meta.errors}
          >
            <input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) =>
                field.handleChange(
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border px-3"
              autoFocus
            />
          </FieldContainer>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <FieldContainer
            label="Descripción"
            errors={field.state.meta.errors}
          >
            <textarea
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) =>
                field.handleChange(
                  event.target.value,
                )
              }
              rows={4}
              className="w-full rounded-md border px-3 py-2"
            />
          </FieldContainer>
        )}
      </form.Field>

      <div className="grid gap-4 md:grid-cols-3">
        <form.Field name="priority">
          {(field) => (
            <FieldContainer
              label="Prioridad"
              errors={field.state.meta.errors}
            >
              <select
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange(
                    event.target
                      .value as typeof field.state.value,
                  )
                }
                className="h-10 w-full rounded-md border px-3"
              >
                {TASK_PRIORITIES.map(
                  (priority) => (
                    <option
                      key={priority}
                      value={priority}
                    >
                      {
                        taskPriorityLabels[
                          priority
                        ]
                      }
                    </option>
                  ),
                )}
              </select>
            </FieldContainer>
          )}
        </form.Field>

        <form.Field name="plannedAt">
          {(field) => (
            <FieldContainer
              label="Fecha planificada"
              errors={field.state.meta.errors}
            >
              <input
                id={field.name}
                type="datetime-local"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange(
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-md border px-3"
              />
            </FieldContainer>
          )}
        </form.Field>

        <form.Field name="dueAt">
          {(field) => (
            <FieldContainer
              label="Fecha límite"
              errors={field.state.meta.errors}
            >
              <input
                id={field.name}
                type="datetime-local"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange(
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-md border px-3"
              />
            </FieldContainer>
          )}
        </form.Field>
      </div>

      <form.Subscribe
        selector={(state) => [
          state.canSubmit,
          state.isSubmitting,
        ]}
      >
        {([canSubmit, isSubmitting]) => (
          <div className="flex justify-end gap-2">
            {task && (
              <button
                type="button"
                className="h-10 rounded-md border px-4"
                onClick={onCompleted}
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={
                !canSubmit ||
                isSubmitting
              }
              className="h-10 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-50"
            >
              {isSubmitting
                ? 'Guardando…'
                : task
                  ? 'Guardar cambios'
                  : 'Crear tarea'}
            </button>
          </div>
        )}
      </form.Subscribe>
    </form>
  )
}

type FieldContainerProps = {
  label: string
  errors: readonly unknown[]
  children: ReactNode
}

function FieldContainer({
  label,
  errors,
  children,
}: FieldContainerProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">
        {label}
      </span>

      {children}

      {errors.length > 0 && (
        <p className="text-sm text-destructive">
          {errors
            .map(getErrorMessage)
            .join(', ')}
        </p>
      )}
    </div>
  )
}

function getErrorMessage(
  error: unknown,
): string {
  if (typeof error === 'string') {
    return error
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Valor inválido'
}
