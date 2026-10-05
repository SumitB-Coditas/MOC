import { useSyncExternalStore } from 'react'
import { appClock } from '@/services/clock'

/** The demo clock offset in days; re-renders when an Admin moves the clock. */
export function useClockOffset(): number {
  return useSyncExternalStore(appClock.subscribe, appClock.offsetDays)
}
