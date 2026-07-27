import Dexie, {
    type EntityTable,
} from 'dexie'
  
  export type LocalDeviceRecord = {
    id: string
    name: string
    platform: string | null
    createdAt: string
    lastOpenedAt: string
  }
  
  export type LocalIdentityRecord = {
    id: string
    userId: string
    deviceId: string
    name: string
    email: string
    offlineAccessEnabled: boolean
    remoteSignOutPending: boolean
    initializedAt: string
    lastAuthenticatedAt: string
    remoteRegisteredAt: string | null
    updatedAt: string
  }
  
  export type ActiveProfileRecord = {
    id: 'current'
    userId: string
    deviceId: string
    updatedAt: string
  }
  
  class ProductivityLocalDatabase extends Dexie {
    localDevices!: EntityTable<
      LocalDeviceRecord,
      'id'
    >
  
    localIdentities!: EntityTable<
      LocalIdentityRecord,
      'id'
    >
  
    activeProfile!: EntityTable<
      ActiveProfileRecord,
      'id'
    >
  
    constructor() {
      super('personal-productivity-os')
  
      this.version(1).stores({
        localDevices: 'id, createdAt, lastOpenedAt',
        localIdentities:
          'id, userId, deviceId, email, updatedAt, [userId+deviceId]',
        activeProfile: 'id, userId, deviceId, updatedAt',
      })
  
      this.version(2)
        .stores({
          localDevices: 'id, createdAt, lastOpenedAt',
          localIdentities:
            'id, userId, deviceId, email, updatedAt, [userId+deviceId]',
          activeProfile:
            'id, userId, deviceId, updatedAt',
        })
        .upgrade(async (transaction) => {
          await transaction
            .table<LocalIdentityRecord>('localIdentities')
            .toCollection()
            .modify((identity) => {
              identity.remoteSignOutPending ??= false
            })
        })
    }
  }
  
  let database: ProductivityLocalDatabase | null = null
  
  export function getLocalDatabase(): ProductivityLocalDatabase {
    if (typeof window === 'undefined') {
      throw new Error(
        'The local database is only available in the browser',
      )
    }
  
    database ??= new ProductivityLocalDatabase()
  
    return database
  }
  