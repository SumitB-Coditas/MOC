import { CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useClockOffset } from '@/hooks/useClockOffset'
import { formatCalendarDate } from '@/lib/date'
import { appClock } from '@/services/clock'

/** Shown in the top bar whenever the demo clock is not the real date. */
export function DemoClockIndicator() {
  const offset = useClockOffset()
  if (offset === 0) return null
  return (
    <Badge variant="warning" title="The demo clock is active">
      <CalendarClock data-icon="inline-start" aria-hidden="true" />
      Demo date {formatCalendarDate(appClock.today())}
    </Badge>
  )
}
