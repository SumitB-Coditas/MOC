/** Prefix for every key this app writes, so it never touches other apps' data. */
export const STORAGE_NAMESPACE = 'cms'

/** Current shape of the persisted data. Bump it and add a migration when the shape changes. */
export const SCHEMA_VERSION = 1

/**
 * Registry of persisted collections (stored as `cms:<key>`).
 * Each key is first read or written in the phase noted beside it.
 */
export const STORAGE_KEYS = {
  meta: 'meta', // Phase 1: schema version bookkeeping
  users: 'users', // Phase 2
  session: 'session', // Phase 2
  forms: 'forms', // Phase 4
  assignments: 'assignments', // Phase 4
  submissions: 'submissions', // Phase 5 (append-only)
  clockOffsetDays: 'clockOffsetDays', // Phase 6 (demo clock)
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
