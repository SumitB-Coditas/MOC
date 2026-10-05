export type Role = 'ADMIN' | 'CANDIDATE' | 'DIPLOMATE'
export type UserRole = Exclude<Role, 'ADMIN'>

/** A registered (non-admin) user as persisted. Role is derived, never stored. */
export interface UserRecord {
  id: string
  firstName: string
  lastName: string
  /** Calendar date, `YYYY-MM-DD`. */
  dateOfBirth: string
  /** Normalized: trimmed and lower-cased. */
  email: string
  /** SHA-256 of `salt:password`. Demo-grade only; see README limitations. */
  passwordHash: string
  passwordSalt: string
  createdAt: string
  updatedAt: string
  /** Soft delete marker (used from Phase 3). */
  deletedAt?: string
}

/** Persisted login session. Never contains credentials. */
export interface Session {
  /** A user id, or the admin account id. */
  actorId: string
  /** Snapshot for display; re-derived from the user on every restore. */
  role: Role
  issuedAt: string
}

/** The signed-in identity exposed to the UI. */
export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: Role
}
