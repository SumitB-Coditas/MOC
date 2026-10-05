import type {
  CertificationStatus,
  EffectiveAssignmentStatus,
  FormAssignment,
  RenewalCycle,
} from '@/types/certification'

export type AssignmentEligibility =
  | { canAssign: true; purpose: 'INITIAL' }
  | { canAssign: true; purpose: 'RENEWAL'; periodId: string; cycle: RenewalCycle; isLate: boolean }
  | {
      canAssign: false
      reason: 'INACTIVE_USER' | 'OPEN_ASSIGNMENT' | 'RENEWAL_NOT_OPEN'
      /** RENEWAL_NOT_OPEN: when the next renewal window opens. */
      opensOn?: string
    }

/**
 * A renewal assignment can no longer be completed once its cycle was missed or its
 * period ended. It then shows as EXPIRED (read-only). Stored statuses are left untouched.
 */
export function effectiveAssignmentStatus(
  assignment: FormAssignment,
  status: CertificationStatus,
): EffectiveAssignmentStatus {
  const isOpen = assignment.status === 'ASSIGNED' || assignment.status === 'DRAFT'
  if (!isOpen || assignment.purpose !== 'RENEWAL') return assignment.status

  const period = status.periods.find((candidate) => candidate.periodId === assignment.periodId)
  const cycle = period?.cycles.find((candidate) => candidate.cycleNumber === assignment.cycleNumber)
  return !period || period.endedOn || !cycle || cycle.state === 'MISSED'
    ? 'EXPIRED'
    : assignment.status
}

/**
 * What the Admin may assign right now (plan A2, A14): an INITIAL application to anyone not
 * certified (including lapsed users), a RENEWAL for the oldest open cycle, and never a
 * second open assignment.
 */
export function assignmentEligibility(
  status: CertificationStatus,
  { isActiveUser, hasOpenAssignment }: { isActiveUser: boolean; hasOpenAssignment: boolean },
  today: string,
): AssignmentEligibility {
  if (!isActiveUser) return { canAssign: false, reason: 'INACTIVE_USER' }
  if (hasOpenAssignment) return { canAssign: false, reason: 'OPEN_ASSIGNMENT' }
  if (status.role === 'CANDIDATE') return { canAssign: true, purpose: 'INITIAL' }

  const { openRenewal, currentPeriod, nextRenewal } = status
  if (!openRenewal || !currentPeriod) {
    return { canAssign: false, reason: 'RENEWAL_NOT_OPEN', opensOn: nextRenewal?.windowOpens }
  }
  return {
    canAssign: true,
    purpose: 'RENEWAL',
    periodId: currentPeriod.periodId,
    cycle: openRenewal,
    isLate: today >= openRenewal.dueDate,
  }
}
