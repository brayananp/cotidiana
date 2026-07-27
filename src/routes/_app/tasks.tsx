import { TasksPage } from '#/modules/tasks'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/tasks')({
  component: TasksPage,
})

