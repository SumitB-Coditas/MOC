import { ADMIN_ACCOUNT } from '@/config/admin'
import { AppError } from '@/lib/errors'
import { toFieldErrors } from '@/lib/validation'
import { requireAdmin } from '@/services/authorization'
import { assertEmailAvailable } from '@/services/emailAvailability'
import { usersCollection } from '@/services/repositories/users'
import { storage as appStorage, type StorageClient } from '@/services/storage'
import { resolveUserRole, type UserRoleResolver } from '@/services/userRole'
import type { UserRecord } from '@/types/auth'
import type { ManagedUser, UserOverview, UserQuery } from '@/types/users'
import { updateProfileSchema, type UpdateProfileInput } from './schemas'

/**
 * Admin user management. Every method requires an Admin session, checked here as a
 * backend would. Users are never physically removed: deactivation sets `deletedAt`.
 */
export interface UsersService {
  listUsers(query?: UserQuery): Promise<ManagedUser[]>
  getUser(id: string): Promise<ManagedUser>
  getOverview(): Promise<UserOverview>
  updateProfile(id: string, input: UpdateProfileInput): Promise<ManagedUser>
  deactivateUser(id: string): Promise<ManagedUser>
  reactivateUser(id: string): Promise<ManagedUser>
}

const RECENT_REGISTRATIONS_LIMIT = 5

interface UsersServiceDeps {
  storage: StorageClient
  resolveRole?: UserRoleResolver
  now?: () => Date
}

export function createUsersService({
  storage,
  resolveRole = resolveUserRole,
  now = () => new Date(),
}: UsersServiceDeps): UsersService {
  const users = () => usersCollection.repository(storage)

  // Maps a stored record to the admin view. Password hash and salt are dropped here.
  function toManagedUser(user: UserRecord): ManagedUser {
    const { id, firstName, lastName, dateOfBirth, email, createdAt, updatedAt, deletedAt } = user
    return {
      id,
      firstName,
      lastName,
      dateOfBirth,
      email,
      role: resolveRole(user),
      status: deletedAt ? 'INACTIVE' : 'ACTIVE',
      createdAt,
      updatedAt,
      ...(deletedAt ? { deactivatedAt: deletedAt } : {}),
    }
  }

  function findOrThrow(id: string): UserRecord {
    const user = users().findById(id)
    if (!user) throw new AppError('NOT_FOUND', 'User not found.')
    return user
  }

  function matches(user: ManagedUser, { search = '', role = 'ALL', status = 'ACTIVE' }: UserQuery) {
    const term = search.trim().toLowerCase()
    return (
      (status === 'ALL' || user.status === status) &&
      (role === 'ALL' || user.role === role) &&
      (!term ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(term) ||
        `${user.lastName} ${user.firstName}`.toLowerCase().includes(term) ||
        user.email.includes(term))
    )
  }

  function assertCanChangeStatus(actorId: string, id: string) {
    if (id === ADMIN_ACCOUNT.id) {
      throw new AppError('FORBIDDEN', 'The administrator account cannot be deactivated.')
    }
    if (id === actorId) {
      throw new AppError('FORBIDDEN', 'You cannot deactivate your own account.')
    }
  }

  return {
    async listUsers(query = {}) {
      requireAdmin(storage)
      return users()
        .list()
        .map(toManagedUser)
        .filter((user) => matches(user, query))
        .sort(
          (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
        )
    },

    async getUser(id) {
      requireAdmin(storage)
      return toManagedUser(findOrThrow(id))
    },

    async getOverview() {
      requireAdmin(storage)
      const all = users().list().map(toManagedUser)
      const active = all.filter((user) => user.status === 'ACTIVE')
      return {
        activeCandidates: active.filter((user) => user.role === 'CANDIDATE').length,
        activeDiplomates: active.filter((user) => user.role === 'DIPLOMATE').length,
        totalActive: active.length,
        inactive: all.length - active.length,
        recentRegistrations: [...active]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, RECENT_REGISTRATIONS_LIMIT),
      }
    },

    async updateProfile(id, input) {
      requireAdmin(storage)
      findOrThrow(id)

      const parsed = updateProfileSchema.safeParse(input)
      if (!parsed.success) {
        const { formError, fieldErrors } = toFieldErrors(parsed.error)
        throw new AppError('VALIDATION', formError ?? 'Please correct the highlighted fields.', {
          fieldErrors,
        })
      }

      const repository = users()
      assertEmailAvailable(repository, parsed.data.email, id)
      return toManagedUser(
        repository.update(id, { ...parsed.data, updatedAt: now().toISOString() }),
      )
    },

    async deactivateUser(id) {
      assertCanChangeStatus(requireAdmin(storage), id)
      const user = findOrThrow(id)
      if (user.deletedAt) throw new AppError('CONFLICT', 'This user is already inactive.')

      const timestamp = now().toISOString()
      // Soft delete only: the record (and all future history linked to it) is kept.
      return toManagedUser(users().update(id, { deletedAt: timestamp, updatedAt: timestamp }))
    },

    async reactivateUser(id) {
      assertCanChangeStatus(requireAdmin(storage), id)
      const user = findOrThrow(id)
      if (!user.deletedAt) throw new AppError('CONFLICT', 'This user is already active.')

      // `undefined` is dropped when serialized, removing the soft-delete marker.
      return toManagedUser(
        users().update(id, { deletedAt: undefined, updatedAt: now().toISOString() }),
      )
    },
  }
}

export const usersService = createUsersService({ storage: appStorage })
