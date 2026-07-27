import {
    describe,
    expect,
    it,
} from 'vitest'
  
  import {
    changeTaskStatus,
    createTaskEntity,
    deleteTaskEntity,
    setTaskArchived,
    updateTaskEntity,
} from '../domain/task'
  
  const now = new Date(
    '2026-07-27T12:00:00.000Z',
  )
  
  function createTask() {
    return createTaskEntity(
      {
        userId: 'user-1',
        title: '  Programar módulo Tasks  ',
        description: '  Implementar dominio  ',
        priority: 'high',
        plannedAt: null,
        dueAt: null,
      },
      now,
    )
  }
  
  describe('Task', () => {
    it('normaliza los datos al crear', () => {
      const task = createTask()
  
      expect(task.title).toBe(
        'Programar módulo Tasks',
      )
  
      expect(task.description).toBe(
        'Implementar dominio',
      )
  
      expect(task.status).toBe('todo')
      expect(task.version).toBe(1)
    })
  
    it('marca la fecha de finalización', () => {
      const task = createTask()
  
      const completed = changeTaskStatus(
        task,
        'done',
        new Date(
          '2026-07-27T13:00:00.000Z',
        ),
      )
  
      expect(completed.status).toBe('done')
      expect(completed.completedAt).toBe(
        '2026-07-27T13:00:00.000Z',
      )
      expect(completed.version).toBe(2)
    })
  
    it('elimina completedAt al reabrir', () => {
      const completed = changeTaskStatus(
        createTask(),
        'done',
        now,
      )
  
      const reopened = changeTaskStatus(
        completed,
        'todo',
        now,
      )
  
      expect(reopened.completedAt).toBeNull()
    })
  
    it('archiva sin eliminar', () => {
      const archived = setTaskArchived(
        createTask(),
        true,
        now,
      )
  
      expect(archived.archivedAt).not.toBeNull()
      expect(archived.deletedAt).toBeNull()
    })
  
    it('aplica eliminación lógica', () => {
      const deleted = deleteTaskEntity(
        createTask(),
        now,
      )
  
      expect(deleted.deletedAt).toBe(
        now.toISOString(),
      )
    })
  
    it('impide modificar una tarea eliminada', () => {
      const deleted = deleteTaskEntity(
        createTask(),
        now,
      )
  
      expect(() =>
        updateTaskEntity(
          deleted,
          {
            title: 'Cambio',
            description: null,
            priority: 'low',
            plannedAt: null,
            dueAt: null,
          },
          now,
        ),
      ).toThrow('TASK_ALREADY_DELETED')
    })
  })
  