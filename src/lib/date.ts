const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** True for a real calendar date in `YYYY-MM-DD` form (rejects e.g. 2026-02-30). */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function parseIsoDate(value: string): [year: number, month: number, day: number] {
  if (!isValidIsoDate(value)) throw new Error(`Invalid ISO date: ${value}`)
  return value.split('-').map(Number) as [number, number, number]
}

function formatIsoDate(year: number, month: number, day: number): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0')
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}

/** Calendar-day arithmetic on `YYYY-MM-DD` strings (timezone-free). */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = parseIsoDate(isoDate)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return formatIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const toUtc = (iso: string) => {
    const [year, month, day] = parseIsoDate(iso)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

/** Adds whole years; Feb 29 clamps to Feb 28 in non-leap years (plan A15). */
export function addYears(isoDate: string, years: number): string {
  const [year, month, day] = parseIsoDate(isoDate)
  const targetYear = year + years
  const lastDayOfMonth = new Date(Date.UTC(targetYear, month, 0)).getUTCDate()
  return formatIsoDate(targetYear, month, Math.min(day, lastDayOfMonth))
}

/** The user's local calendar date as `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Phase 7 replaces `new Date()` with the demo clock.
export function todayIsoDate(): string {
  return toIsoDate(new Date())
}

const DISPLAY_LOCALE = 'en-GB'

/** "17 May 1990" for a `YYYY-MM-DD` calendar date (no timezone shift). */
export function formatCalendarDate(isoDate: string): string {
  if (!isValidIsoDate(isoDate)) return isoDate
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  )
}

/** "4 Oct 2026, 14:58" for an ISO timestamp, in the viewer's timezone. */
export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return isoTimestamp
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
