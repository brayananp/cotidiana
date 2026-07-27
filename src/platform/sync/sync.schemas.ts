import { z } from 'zod'

const nullableIsoDate = z
  .string()
  .datetime()
  .nullable()

export const taskSyncSnapshotSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5_000).nullable(),
  status: z.enum([
    'todo',
    'in_progress',
    'done',
  ]),
  priority: z.enum([
    'none',
    'low',
    'medium',
    'high',
    'urgent',
  ]),
  plannedAt: nullableIsoDate,
  dueAt: nullableIsoDate,
  completedAt: nullableIsoDate,
  archivedAt: nullableIsoDate,
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: nullableIsoDate,
  version: z.number().int().positive(),
})

export const taskDeletePayloadSchema = z.object({
  id: z.string().uuid(),
  deletedAt: z.string().datetime(),
  version: z.number().int().positive(),
})

export const pushTaskOperationSchema = z
  .object({
    operationId: z.string().uuid(),
    entityType: z.literal('task'),
    entityId: z.string().uuid(),
    operation: z.enum([
      'create',
      'update',
      'delete',
    ]),
    payload: z.unknown(),
    baseVersion: z
      .number()
      .int()
      .positive()
      .nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.operation === 'create' &&
      value.baseVersion !== null
    ) {
      context.addIssue({
        code: 'custom',
        path: ['baseVersion'],
        message:
          'CREATE operations must not have a base version',
      })
    }

    if (
      value.operation !== 'create' &&
      value.baseVersion === null
    ) {
      context.addIssue({
        code: 'custom',
        path: ['baseVersion'],
        message:
          'UPDATE and DELETE require a base version',
      })
    }
  })

export const pushTasksInputSchema = z.object({
  deviceId: z.string().uuid(),
  operations: z
    .array(pushTaskOperationSchema)
    .min(1)
    .max(50),
})

export const pullTasksInputSchema = z.object({
  deviceId: z.string().uuid(),
  cursor: z.number().int().nonnegative(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(100),
})

export type TaskSyncSnapshot = z.infer<
  typeof taskSyncSnapshotSchema
>

export type PushTaskOperationInput = z.infer<
  typeof pushTaskOperationSchema
>

export type PushTasksInput = z.infer<
  typeof pushTasksInputSchema
>

export type PullTasksInput = z.infer<
  typeof pullTasksInputSchema
>
