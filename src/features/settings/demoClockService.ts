import { daysBetween, toIsoDate } from '@/lib/date'
import { requireAdmin } from '@/services/authorization'
import { appClock, type DemoClock } from '@/services/clock'
import { storage as appStorage, type StorageClient } from '@/services/storage'

/** Admin-only control of the demo clock (plan A12). */
export interface DemoClockService {
  /** Moves "today" to `isoDate` (relative to the real date). */
  setSimulatedDate(isoDate: string): void
  reset(): void
}

export function createDemoClockService(storage: StorageClient, clock: DemoClock): DemoClockService {
  return {
    setSimulatedDate(isoDate) {
      requireAdmin(storage)
      clock.setOffsetDays(daysBetween(toIsoDate(new Date()), isoDate))
    },
    reset() {
      requireAdmin(storage)
      clock.setOffsetDays(0)
    },
  }
}

export const demoClockService = createDemoClockService(appStorage, appClock)
