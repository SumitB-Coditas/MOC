import { ADMIN_ACCOUNT } from '@/config/admin'
import { hashPassword, createSalt } from '@/lib/crypto'
import { normalizeEmail } from '@/lib/email'
import { AppError } from '@/lib/errors'
import { createId } from '@/lib/id'
import { toFieldErrors } from '@/lib/validation'
import { assertEmailAvailable } from '@/services/emailAvailability'
import { usersCollection } from '@/services/repositories/users'
import { createSessionStore, subscribeToSessionChangesInOtherTabs } from '@/services/session'
import { storage as appStorage, type StorageClient } from '@/services/storage'
import { createUserRoleResolver, type UserRoleResolver } from '@/services/userRole'
import type { AuthUser, Role, UserRecord } from '@/types/auth'
import { registrationInputSchema, type LoginCredentials, type RegistrationInput } from './schemas'

/**
 * Authentication API. Promise-based and framework-free, so a REST implementation can
 * replace this one without touching the UI.
 */
export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthUser>
  /** Creates a Candidate account and signs it in. */
  register(input: RegistrationInput): Promise<AuthUser>
  logout(): Promise<void>
  /** Re-validates the stored session; returns null when signed out or the session is stale. */
  restoreSession(): Promise<AuthUser | null>
  /** Subscribes to sign-in/sign-out in other tabs. Returns an unsubscribe function. */
  onExternalSessionChange(listener: () => void): () => void
}

/** Same message for unknown email and wrong password, so accounts can't be probed. */
export const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.'

const ADMIN_USER: AuthUser = {
  id: ADMIN_ACCOUNT.id,
  firstName: ADMIN_ACCOUNT.firstName,
  lastName: ADMIN_ACCOUNT.lastName,
  email: ADMIN_ACCOUNT.email,
  role: 'ADMIN',
}

function toAuthUser(user: UserRecord, role: Role): AuthUser {
  const { id, firstName, lastName, email } = user
  return { id, firstName, lastName, email, role }
}

interface AuthServiceDeps {
  storage: StorageClient
  resolveRole?: UserRoleResolver
  now?: () => Date
  subscribeToExternalChanges?: (listener: () => void) => () => void
}

export function createAuthService({
  storage,
  resolveRole = createUserRoleResolver(storage),
  now = () => new Date(),
  subscribeToExternalChanges = subscribeToSessionChangesInOtherTabs,
}: AuthServiceDeps): AuthService {
  const sessions = createSessionStore(storage)
  const users = () => usersCollection.repository(storage)

  function startSession(user: AuthUser): AuthUser {
    sessions.write({ actorId: user.id, role: user.role, issuedAt: now().toISOString() })
    return user
  }

  return {
    async login({ email, password }) {
      const normalizedEmail = normalizeEmail(email)

      if (normalizedEmail === ADMIN_ACCOUNT.email) {
        if (password !== ADMIN_ACCOUNT.password) {
          throw new AppError('UNAUTHORIZED', INVALID_CREDENTIALS_MESSAGE)
        }
        return startSession(ADMIN_USER)
      }

      const user = users().find((candidate) => candidate.email === normalizedEmail)
      const passwordMatches =
        user !== undefined &&
        (await hashPassword(password, user.passwordSalt)) === user.passwordHash
      if (!user || user.deletedAt || !passwordMatches) {
        throw new AppError('UNAUTHORIZED', INVALID_CREDENTIALS_MESSAGE)
      }
      return startSession(toAuthUser(user, resolveRole(user)))
    },

    async register(input) {
      // Validated here as well as in the form, as a real backend would.
      const parsed = registrationInputSchema.safeParse(input)
      if (!parsed.success) {
        const { formError, fieldErrors } = toFieldErrors(parsed.error)
        throw new AppError('VALIDATION', formError ?? 'Please correct the highlighted fields.', {
          fieldErrors,
        })
      }
      const { firstName, lastName, dateOfBirth, email, password } = parsed.data

      const repository = users()
      assertEmailAvailable(repository, email)

      const timestamp = now().toISOString()
      const passwordSalt = createSalt()
      const user = repository.insert({
        id: createId(),
        firstName,
        lastName,
        dateOfBirth,
        email,
        passwordHash: await hashPassword(password, passwordSalt),
        passwordSalt,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      return startSession(toAuthUser(user, resolveRole(user)))
    },

    async logout() {
      sessions.clear()
    },

    async restoreSession() {
      const session = sessions.read()
      if (!session) return null

      if (session.actorId === ADMIN_ACCOUNT.id) {
        if (session.role === 'ADMIN') return ADMIN_USER
        sessions.clear()
        return null
      }

      const user = users().findById(session.actorId)
      if (!user || user.deletedAt) {
        sessions.clear()
        return null
      }

      // The stored role is only a snapshot; the derived role is authoritative.
      const role = resolveRole(user)
      if (role !== session.role) sessions.write({ ...session, role })
      return toAuthUser(user, role)
    },

    onExternalSessionChange: subscribeToExternalChanges,
  }
}

export const authService = createAuthService({ storage: appStorage })
