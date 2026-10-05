import { ADMIN_ACCOUNT } from '@/config/admin'
import { AppError } from '@/lib/errors'
import { usersCollection } from '@/services/repositories/users'
import { createSessionStore } from '@/services/session'
import type { StorageClient } from '@/services/storage/storageClient'
import type { UserRecord } from '@/types/auth'

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

/** The signed-in Candidate/Diplomate, who must still exist and be active. */
export function requireMember(storage: StorageClient): UserRecord {
  const session = createSessionStore(storage).read()
  const user =
    session && session.actorId !== ADMIN_ACCOUNT.id
      ? usersCollection.repository(storage).findById(session.actorId)
      : undefined
  if (!user || user.deletedAt) {
    throw new AppError('UNAUTHORIZED', 'Please sign in again to continue.')
  }
  return user
}

/** The acting identity, for operations open to both the Admin and the record's owner. */
export function currentActorId(storage: StorageClient): string | undefined {
  return createSessionStore(storage).read()?.actorId
}
