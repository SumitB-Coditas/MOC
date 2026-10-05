import { ADMIN_ACCOUNT } from '@/config/admin'
import { AppError } from '@/lib/errors'
import { createSessionStore } from '@/services/session'
import type { StorageClient } from '@/services/storage/storageClient'

/**
 * Service-side authorization, as a backend would do it: admin-only operations check the
 * current session rather than trusting the UI. Returns the acting admin's id.
 */
export function requireAdmin(storage: StorageClient): string {
  const session = createSessionStore(storage).read()
  if (session?.actorId !== ADMIN_ACCOUNT.id || session.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Only the administrator can manage users.')
  }
  return session.actorId
}
