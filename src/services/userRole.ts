import type { UserRecord, UserRole } from '@/types/auth'

export type UserRoleResolver = (user: UserRecord) => UserRole

/**
 * A registered user's role is derived, never stored: Candidate until their initial
 * application is submitted, Diplomate while certified. Until the Certification Engine
 * (Phase 4) exists, every registered user is a Candidate.
 */
export const resolveUserRole: UserRoleResolver = () => 'CANDIDATE'
