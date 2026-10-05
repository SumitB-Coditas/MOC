import { ADMIN_ACCOUNT } from '@/config/admin'
import { createTestAuthService } from '@/features/auth/testing/createTestAuthService'
import { usersCollection } from '@/services/repositories/users'
import { createMemoryStore } from '@/services/storage/keyValueStore'
import { createStorageClient } from '@/services/storage/storageClient'
import type { UserRoleResolver } from '@/services/userRole'
import type { UserRecord } from '@/types/auth'
import { createUsersService } from '../usersService'

/** Recognisable values that must never appear in any admin view. */
export const SECRET_HASH = 'secret-password-hash-value'
export const SECRET_SALT = 'secret-password-salt-value'

export function buildUserRecord(
  overrides: Pick<UserRecord, 'id' | 'firstName' | 'lastName' | 'email'> & Partial<UserRecord>,
): UserRecord {
  return {
    dateOfBirth: '1990-01-15',
    passwordHash: SECRET_HASH,
    passwordSalt: SECRET_SALT,
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
    ...overrides,
  }
}

/**
 * Controlled sample data. Diplomates cannot be created through the app until the
 * Certification Engine exists, so tests mark them via an injected role resolver instead.
 */
export const SAMPLE_USERS: UserRecord[] = [
  buildUserRecord({
    id: 'u-ada',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    dateOfBirth: '1985-12-10',
    createdAt: '2026-03-01T10:00:00.000Z',
  }),
  buildUserRecord({
    id: 'u-alan',
    firstName: 'Alan',
    lastName: 'Turing',
    email: 'alan.turing@example.com',
    createdAt: '2026-05-01T10:00:00.000Z',
  }),
  buildUserRecord({
    id: 'u-grace',
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@navy.example',
    createdAt: '2026-04-01T10:00:00.000Z',
  }),
  buildUserRecord({
    id: 'u-katherine',
    firstName: 'Katherine',
    lastName: 'Johnson',
    email: 'katherine@example.com',
    createdAt: '2026-02-01T10:00:00.000Z',
    deletedAt: '2026-06-01T10:00:00.000Z',
  }),
]

export const SAMPLE_DIPLOMATE_EMAILS = ['grace@navy.example']

export const FIXED_NOW = new Date('2026-10-04T12:00:00.000Z')

/** Isolated storage + auth and users services sharing it, seeded with `users`. */
export function createAdminTestContext({
  users = SAMPLE_USERS,
  diplomateEmails = SAMPLE_DIPLOMATE_EMAILS,
}: { users?: UserRecord[]; diplomateEmails?: string[] } = {}) {
  const storage = createStorageClient(createMemoryStore())
  const repository = usersCollection.repository(storage)
  users.forEach((user) => repository.insert(user))

  const resolveRole: UserRoleResolver = (user) =>
    diplomateEmails.includes(user.email) ? 'DIPLOMATE' : 'CANDIDATE'
  const { service: auth } = createTestAuthService({ storage, resolveRole })
  const usersService = createUsersService({ storage, resolveRole, now: () => FIXED_NOW })

  return {
    storage,
    auth,
    usersService,
    repository,
    signInAsAdmin: () =>
      auth.login({ email: ADMIN_ACCOUNT.email, password: ADMIN_ACCOUNT.password }),
  }
}
