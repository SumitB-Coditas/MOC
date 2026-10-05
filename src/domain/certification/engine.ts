import { CYCLE_YEARS, RENEWAL_WINDOW_DAYS } from '@/config/constants'
import { addDays, addYears } from '@/lib/date'
import type {
  CertificationPeriod,
  CertificationStatus,
  RenewalCycle,
  RenewalCycleState,
  Submission,
} from '@/types/certification'

/**
 * Certification engine (pure: no React, no storage). The user's role is never stored; it
 * is derived from their submissions and today's date.
 *
 * Rules (plan §0): a period starts on the INITIAL submission date (C1). Renewal n is due
 * at start + 3n years (C2). A missed renewal enters a grace period that lasts until the
 * next due date, during which the user stays a Diplomate (C3). A late renewal counts for
 * its own cycle and never moves later due dates (C4). Passing the grace end without
 * renewing ends the period and the user reverts to Candidate (C5). Submissions are only
 * read, never removed (C6).
 */

export interface CertificationConfig {
  cycleYears: number
  /** Provisional (plan A1). */
  renewalWindowDays: number
}

export const DEFAULT_CERTIFICATION_CONFIG: CertificationConfig = {
  cycleYears: CYCLE_YEARS,
  renewalWindowDays: RENEWAL_WINDOW_DAYS,
}

export type CertificationRecord = Pick<
  Submission,
  'id' | 'purpose' | 'periodId' | 'cycleNumber' | 'submittedOnDate'
>

export function renewalCycleDates(
  startDate: string,
  cycleNumber: number,
  { cycleYears, renewalWindowDays }: CertificationConfig = DEFAULT_CERTIFICATION_CONFIG,
) {
  const dueDate = addYears(startDate, cycleYears * cycleNumber)
  return {
    windowOpens: addDays(dueDate, -renewalWindowDays),
    dueDate,
    graceEnds: addYears(startDate, cycleYears * (cycleNumber + 1)),
  }
}

const byDateThenId = (a: CertificationRecord, b: CertificationRecord) =>
  a.submittedOnDate.localeCompare(b.submittedOnDate) || a.id.localeCompare(b.id)

/** Dates are `YYYY-MM-DD`, so string comparison is chronological. Boundaries per plan A16. */
function evaluatePeriod(
  initial: CertificationRecord,
  renewals: CertificationRecord[],
  today: string,
  config: CertificationConfig,
): CertificationPeriod {
  const renewalByCycle = new Map<number, CertificationRecord>()
  for (const renewal of [...renewals].sort(byDateThenId)) {
    if (!renewalByCycle.has(renewal.cycleNumber)) renewalByCycle.set(renewal.cycleNumber, renewal)
  }

  const period: CertificationPeriod = {
    periodId: initial.id,
    startDate: initial.submittedOnDate,
    cycles: [],
  }
  // Bounded loop: each iteration moves 3 years forward, so it ends at the first
  // upcoming or missed cycle.
  for (let cycleNumber = 1; cycleNumber <= 1000; cycleNumber += 1) {
    const dates = renewalCycleDates(initial.submittedOnDate, cycleNumber, config)
    const renewal = renewalByCycle.get(cycleNumber)

    if (renewal) {
      period.cycles.push({
        cycleNumber,
        ...dates,
        state: renewal.submittedOnDate < dates.dueDate ? 'RENEWED_ON_TIME' : 'RENEWED_LATE',
        submissionId: renewal.id,
      })
      continue
    }
    if (today >= dates.graceEnds) {
      period.cycles.push({ cycleNumber, ...dates, state: 'MISSED' })
      period.endedOn = dates.graceEnds
      return period
    }
    const state: RenewalCycleState =
      today >= dates.dueDate ? 'IN_GRACE' : today >= dates.windowOpens ? 'OPEN' : 'UPCOMING'
    period.cycles.push({ cycleNumber, ...dates, state })
    if (state === 'UPCOMING') return period
  }
  return period
}

const isOpen = (cycle: RenewalCycle) => cycle.state === 'IN_GRACE' || cycle.state === 'OPEN'

export function evaluateCertification(
  records: readonly CertificationRecord[],
  today: string,
  config: CertificationConfig = DEFAULT_CERTIFICATION_CONFIG,
): CertificationStatus {
  // "As of today": submissions dated after today do not count yet (keeps demo time travel consistent).
  const known = records.filter((record) => record.submittedOnDate <= today)
  const periods = known
    .filter((record) => record.purpose === 'INITIAL')
    .sort(byDateThenId)
    .map((initial) =>
      evaluatePeriod(
        initial,
        known.filter((record) => record.purpose === 'RENEWAL' && record.periodId === initial.id),
        today,
        config,
      ),
    )

  const latest = periods.at(-1)
  if (!latest) return { role: 'CANDIDATE', phase: 'NOT_CERTIFIED', periods }
  if (latest.endedOn) {
    return { role: 'CANDIDATE', phase: 'LAPSED', periods, lapsedOn: latest.endedOn }
  }

  // Renewals are completed oldest-first (plan A5).
  const openRenewal = latest.cycles.find(isOpen)
  return {
    role: 'DIPLOMATE',
    phase: latest.cycles.some((cycle) => cycle.state === 'IN_GRACE')
      ? 'GRACE'
      : openRenewal
        ? 'RENEWAL_OPEN'
        : 'ACTIVE',
    periods,
    currentPeriod: latest,
    openRenewal,
    nextRenewal: openRenewal ?? latest.cycles.find((cycle) => cycle.state === 'UPCOMING'),
  }
}
