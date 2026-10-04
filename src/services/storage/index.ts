import { resolveBrowserStore } from './keyValueStore'
import { createStorageClient } from './storageClient'

/** The app-wide storage client. Only services and repositories may import this. */
export const storage = createStorageClient(resolveBrowserStore())

export { bootstrapStorage, type Seeder } from './bootstrap'
export { SCHEMA_VERSION, STORAGE_KEYS, type StorageKey } from './keys'
export type { Parser, StorageClient, StorageTransaction } from './storageClient'
