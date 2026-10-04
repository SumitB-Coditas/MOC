import { AppError } from '@/lib/errors'
import type { KeyValueStore } from './keyValueStore'
import { STORAGE_NAMESPACE, type StorageKey } from './keys'

/**
 * Validates untrusted stored data and returns it typed, or throws.
 * Compatible with Zod (`schema.parse`) and hand-written guards alike.
 */
export type Parser<T> = (raw: unknown) => T

interface StorageReader {
  /**
   * Returns the stored value, or `undefined` when the key is absent.
   * Throws `STORAGE_CORRUPTED` when the value is not valid JSON or fails `parse`. Corrupt
   * data is never silently replaced, because a later write would then destroy it.
   */
  read<T>(key: StorageKey, parse: Parser<T>): T | undefined
  /** Whether a value is stored under `key`, without parsing it. */
  has(key: StorageKey): boolean
}

export interface StorageTransaction extends StorageReader {
  write<T>(key: StorageKey, value: T): void
  remove(key: StorageKey): void
}

export interface StorageClient extends StorageTransaction {
  /**
   * Applies several writes together. If any write fails, keys already written are restored
   * and the error is rethrown. Reads inside `fn` see the transaction's pending writes.
   */
  transaction<R>(fn: (tx: StorageTransaction) => R): R
  /** Removes every key in this app's namespace and nothing else. */
  clear(): void
}

const PREFIX = `${STORAGE_NAMESPACE}:`

export function toStorageKey(key: StorageKey): string {
  return `${PREFIX}${key}`
}

function isQuotaExceeded(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

export function createStorageClient(store: KeyValueStore): StorageClient {
  function decode<T>(key: StorageKey, raw: string, parse: Parser<T>): T {
    try {
      return parse(JSON.parse(raw))
    } catch (cause) {
      throw new AppError('STORAGE_CORRUPTED', `Stored data for "${key}" is invalid.`, { cause })
    }
  }

  function setRaw(key: StorageKey, raw: string | null): void {
    try {
      if (raw === null) store.removeItem(toStorageKey(key))
      else store.setItem(toStorageKey(key), raw)
    } catch (cause) {
      if (isQuotaExceeded(cause)) {
        throw new AppError('STORAGE_FULL', 'Browser storage is full. Free up space and retry.', {
          cause,
        })
      }
      throw new AppError('STORAGE_UNAVAILABLE', 'Browser storage could not be written.', { cause })
    }
  }

  const read = <T>(key: StorageKey, parse: Parser<T>): T | undefined => {
    const raw = store.getItem(toStorageKey(key))
    return raw === null ? undefined : decode(key, raw, parse)
  }

  const has = (key: StorageKey): boolean => store.getItem(toStorageKey(key)) !== null

  return {
    read,
    has,

    write(key, value) {
      setRaw(key, JSON.stringify(value))
    },

    remove(key) {
      setRaw(key, null)
    },

    transaction(fn) {
      // Pending raw values per key (`null` = removal), applied only after `fn` succeeds.
      const pending = new Map<StorageKey, string | null>()
      const tx: StorageTransaction = {
        read(key, parse) {
          if (!pending.has(key)) return read(key, parse)
          const raw = pending.get(key) ?? null
          return raw === null ? undefined : decode(key, raw, parse)
        },
        has(key) {
          return pending.has(key) ? pending.get(key) !== null : has(key)
        },
        write(key, value) {
          pending.set(key, JSON.stringify(value))
        },
        remove(key) {
          pending.set(key, null)
        },
      }

      const result = fn(tx)

      const applied: Array<[StorageKey, string | null]> = []
      try {
        for (const [key, raw] of pending) {
          const previous = store.getItem(toStorageKey(key))
          setRaw(key, raw)
          applied.push([key, previous])
        }
      } catch (error) {
        for (const [key, previous] of applied.reverse()) setRaw(key, previous)
        throw error
      }
      return result
    },

    clear() {
      const ownKeys: string[] = []
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index)
        if (key?.startsWith(PREFIX)) ownKeys.push(key)
      }
      ownKeys.forEach((key) => store.removeItem(key))
    },
  }
}
