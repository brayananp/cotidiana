let fallbackLock = false

type LockManagerLike = {
  request<T>(
    name: string,
    options: { ifAvailable: true },
    callback: (
      lock: unknown | null,
    ) => Promise<T | null>,
  ): Promise<T | null>
}

export async function withTaskSyncLock<T>(
  work: () => Promise<T>,
): Promise<T | null> {
  const navigatorWithLocks = navigator as Navigator & {
    locks?: LockManagerLike
  }

  if (navigatorWithLocks.locks) {
    return navigatorWithLocks.locks.request(
      'personal-productivity-os:task-sync',
      { ifAvailable: true },
      async (lock) => {
        if (!lock) {
          return null
        }

        return work()
      },
    )
  }

  if (fallbackLock) {
    return null
  }

  fallbackLock = true

  try {
    return await work()
  } finally {
    fallbackLock = false
  }
}
