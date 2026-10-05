import { toIsoDate } from '@/lib/date'
import { storage as appStorage } from '@/services/storage'
import { STORAGE_KEYS } from '@/services/storage/keys'
import type { StorageClient } from '@/services/storage/storageClient'

const DAY_MS = 24 * 60 * 60 * 1000

/** Time source for all certification logic. */
export interface Clock {
  now(): Date
  /** Local calendar date, `YYYY-MM-DD`. */
  today(): string
}

/**
 * Demo clock (plan A12): the real time shifted by a whole number of days, persisted so
 * renewals and lapses can be demonstrated without waiting years.
 */
export interface DemoClock extends Clock {
  offsetDays(): number
  setOffsetDays(days: number): void
  /** Notifies in-tab listeners (e.g. the top-bar indicator) when the offset changes. */
  subscribe(listener: () => void): () => void
}

const parseOffset = (raw: unknown): number => {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) throw new Error('invalid offset')
  return raw
}

export function createClock(storage: StorageClient): DemoClock {
  const listeners = new Set<() => void>()

  const offsetDays = () => {
    try {
      return storage.read(STORAGE_KEYS.clockOffsetDays, parseOffset) ?? 0
    } catch {
      return 0
    }
  }
  const now = () => new Date(Date.now() + offsetDays() * DAY_MS)

  return {
    now,
    today: () => toIsoDate(now()),
    offsetDays,
    setOffsetDays(days) {
      if (days === 0) storage.remove(STORAGE_KEYS.clockOffsetDays)
      else storage.write(STORAGE_KEYS.clockOffsetDays, Math.trunc(days))
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** The app-wide demo clock (shared by services and the UI indicator). */
export const appClock = createClock(appStorage)
