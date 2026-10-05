import { createMemoryStore } from '@/services/storage/keyValueStore'
import { createStorageClient, type StorageClient } from '@/services/storage/storageClient'
import type { UserRoleResolver } from '@/services/userRole'
import { createAuthService } from '../authService'

/** An auth service over an isolated in-memory store (no browser or cross-tab events). */
export function createTestAuthService(
  options: { storage?: StorageClient; resolveRole?: UserRoleResolver } = {},
) {
  const storage = options.storage ?? createStorageClient(createMemoryStore())
  const service = createAuthService({
    storage,
    resolveRole: options.resolveRole,
    subscribeToExternalChanges: () => () => {},
  })
  return { storage, service }
}

export const VALID_REGISTRATION = {
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1990-05-17',
  email: 'jane.doe@example.com',
  password: 'Secret123',
}
