import { CalendarClock, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { FormField } from '@/components/common/FormField'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CYCLE_YEARS, RENEWAL_WINDOW_DAYS } from '@/config/constants'
import { useClockOffset } from '@/hooks/useClockOffset'
import { addDays, addYears, formatCalendarDate, isValidIsoDate, toIsoDate } from '@/lib/date'
import { getErrorMessage } from '@/lib/errors'
import { appClock } from '@/services/clock'
import { demoClockService } from '../demoClockService'

const SHIFTS: Array<[label: string, shift: (date: string) => string]> = [
  ['+30 days', (date) => addDays(date, 30)],
  ['+90 days', (date) => addDays(date, 90)],
  ['+1 year', (date) => addYears(date, 1)],
  [`+${CYCLE_YEARS} years`, (date) => addYears(date, CYCLE_YEARS)],
  ['−30 days', (date) => addDays(date, -30)],
  ['−1 year', (date) => addYears(date, -1)],
]

/** Demo clock: move "today" to show renewal windows, grace periods and lapses. */
export function DemoSettingsPage() {
  const offset = useClockOffset()
  const today = appClock.today()
  const [jumpTo, setJumpTo] = useState(today)
  const [error, setError] = useState<string>()

  function apply(action: () => void) {
    setError(undefined)
    try {
      action()
    } catch (actionError) {
      setError(getErrorMessage(actionError))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo Settings"
        description="Frontend-only demo tools. They are not part of a production system."
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Demo clock</h2>
          </CardTitle>
          <CardDescription>
            Certification is calculated against this date. Move it forward to see renewal windows (
            {RENEWAL_WINDOW_DAYS} days before each due date), grace periods and lapses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Simulated today</p>
              <p className="font-heading text-3xl font-semibold">{formatCalendarDate(today)}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Real date {formatCalendarDate(toIsoDate(new Date()))} ·{' '}
              {offset === 0 ? 'no offset' : `offset ${offset > 0 ? '+' : ''}${offset} days`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {SHIFTS.map(([label, shift]) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                onClick={() => apply(() => demoClockService.setSimulatedDate(shift(today)))}
              >
                {label}
              </Button>
            ))}
            <Button
              variant="secondary"
              size="sm"
              disabled={offset === 0}
              onClick={() => apply(() => demoClockService.reset())}
            >
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
              Back to real date
            </Button>
          </div>

          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (isValidIsoDate(jumpTo)) apply(() => demoClockService.setSimulatedDate(jumpTo))
            }}
          >
            <FormField label="Jump to date" className="w-auto">
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={jumpTo}
                  onChange={(event) => setJumpTo(event.target.value)}
                />
              )}
            </FormField>
            <Button type="submit" disabled={!isValidIsoDate(jumpTo)}>
              <CalendarClock data-icon="inline-start" aria-hidden="true" />
              Set date
            </Button>
          </form>
        </CardContent>
      </Card>
      <Alert variant="info">
        <AlertTitle>How to demonstrate a renewal</AlertTitle>
        <AlertDescription>
          Certify a Candidate, jump to a date inside the renewal window, assign the renewal from the
          user&apos;s page, then sign in as the user to submit it. Jump past the grace end instead
          to see a lapse.
        </AlertDescription>
      </Alert>
    </div>
  )
}
