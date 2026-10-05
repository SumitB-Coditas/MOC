import type { UserRole } from './auth'

/** Whether an account can sign in. Inactive accounts are soft-deleted (`deletedAt` set). */
export type AccountStatus = 'ACTIVE' | 'INACTIVE'

/** A registered user as the Admin sees it. Never carries password data. */
export interface ManagedUser {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  email: string
  /** Derived from the certification lifecycle; never edited directly. */
  role: UserRole
  status: AccountStatus
  createdAt: string
  updatedAt: string
  deactivatedAt?: string
}

export type RoleFilter = UserRole | 'ALL'
export type StatusFilter = AccountStatus | 'ALL'

/** List filters. Mirrors the query parameters a REST endpoint would accept. */
export interface UserQuery {
  /** Case-insensitive match on full name or email. */
  search?: string
  role?: RoleFilter
  /** Defaults to ACTIVE. */
  status?: StatusFilter
}

export interface UserOverview {
  activeCandidates: number
  activeDiplomates: number
  totalActive: number
  inactive: number
  /** Most recently registered active users, newest first. */
  recentRegistrations: ManagedUser[]
}
