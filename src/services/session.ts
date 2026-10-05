import { z } from 'zod'
import { isAppError } from '@/lib/errors'
import { STORAGE_KEYS } from '@/services/storage/keys'
import { toStorageKey, type StorageClient } from '@/services/storage/storageClient'
import type { Session } from '@/types/auth'

const sessionSchema = z.object({
  actorId: z.string().min(1),
  role: z.enum(['ADMIN', 'CANDIDATE', 'DIPLOMATE']),
  issuedAt: z.string(),
}) satisfies z.ZodType<Session>

/** Persists the current session (the local stand-in for a bearer token). */
export interface SessionStore {
  /** The stored session, or null. A corrupt session is discarded (it holds no user data). */
  read(): Session | null
  write(session: Session): void
  clear(): void
}

export function createSessionStore(storage: StorageClient): SessionStore {
  return {
    read() {
      try {
        return storage.read(STORAGE_KEYS.session, sessionSchema.parse) ?? null
      } catch (error) {
        if (!isAppError(error) || error.code !== 'STORAGE_CORRUPTED') throw error
        storage.remove(STORAGE_KEYS.session)
        return null
      }
    },
    write: (session) => storage.write(STORAGE_KEYS.session, session),
    clear: () => storage.remove(STORAGE_KEYS.session),
  }
}

/**
 * Calls `listener` when another browser tab signs in or out. The `storage` event only
 * fires for changes made by other tabs, so this never echoes this tab's own writes.
 */
export function subscribeToSessionChangesInOtherTabs(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const key = toStorageKey(STORAGE_KEYS.session)
  const handler = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
