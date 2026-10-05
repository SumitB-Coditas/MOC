import { ADMIN_ACCOUNT } from '@/config/admin'
import { normalizeEmail } from '@/lib/email'
import { AppError } from '@/lib/errors'
import type { CollectionRepository } from '@/services/repositories/collection'
import type { UserRecord } from '@/types/auth'

export const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists.'
export const EMAIL_RESERVED_MESSAGE = 'This email address is reserved.'

/**
 * Throws `CONFLICT` (with an `email` field error) when `email` belongs to the Admin
 * account or to any other registered user, active or not. Comparison is case-insensitive.
 * `exceptUserId` lets a user keep their own address when editing.
 */
export function assertEmailAvailable(
  users: CollectionRepository<UserRecord>,
  email: string,
  exceptUserId?: string,
): void {
  const normalized = normalizeEmail(email)
  const message =
    normalized === ADMIN_ACCOUNT.email
      ? EMAIL_RESERVED_MESSAGE
      : users.find((user) => user.email === normalized && user.id !== exceptUserId)
        ? EMAIL_TAKEN_MESSAGE
        : undefined
  if (message) throw new AppError('CONFLICT', message, { fieldErrors: { email: message } })
}
