import { evaluateCertification } from '@/domain/certification/engine'
import { createClock, type Clock } from '@/services/clock'
import { submissionsCollection } from '@/services/repositories/submissions'
import type { StorageClient } from '@/services/storage/storageClient'
import type { UserRecord, UserRole } from '@/types/auth'

export type UserRoleResolver = (user: UserRecord) => UserRole

/**
 * A registered user's role is derived, never stored: Candidate until their initial
 * application is submitted, Diplomate while certified, Candidate again after a lapse.
 */
export function createUserRoleResolver(
  storage: StorageClient,
  clock: Clock = createClock(storage),
): UserRoleResolver {
  return (user) => {
    const submissions = submissionsCollection
      .repository(storage)
      .filter((submission) => submission.userId === user.id)
    return evaluateCertification(submissions, clock.today()).role
  }
}
