import type { UserRole } from './auth'
import type { FormDefinition, FormValues } from './forms'

export type AssignmentPurpose = 'INITIAL' | 'RENEWAL'
export type AssignmentStatus = 'ASSIGNED' | 'DRAFT' | 'SUBMITTED' | 'CANCELLED'
/** EXPIRED is derived (a renewal whose cycle can no longer be completed), never stored. */
export type EffectiveAssignmentStatus = AssignmentStatus | 'EXPIRED'

export interface FormAssignment {
  id: string
  userId: string
  formDefinitionId: string
  formVersion: number
  purpose: AssignmentPurpose
  /** RENEWAL only: the certification period (its INITIAL submission id). */
  periodId?: string
  /** RENEWAL only: renewal n, due at start + 3n years. */
  cycleNumber?: number
  status: AssignmentStatus
  draft?: { values: FormValues; savedAt: string }
  assignedAt: string
  submittedAt?: string
  submissionId?: string
  cancelledAt?: string
  updatedAt: string
}

/** Immutable once written; never deleted. */
export interface Submission {
  id: string
  assignmentId: string
  userId: string
  purpose: AssignmentPurpose
  /** INITIAL: its own id. RENEWAL: the period's INITIAL submission id. */
  periodId: string
  /** INITIAL = 0; RENEWAL = n >= 1. */
  cycleNumber: number
  /** The form as it was when submitted, so history renders after the form changes. */
  formSnapshot: FormDefinition
  applicantSnapshot: { firstName: string; lastName: string; email: string; dateOfBirth: string }
  values: FormValues
  submittedAt: string
  /** Calendar date used for all cycle maths. */
  submittedOnDate: string
  /** RENEWAL submitted on or after its due date (during grace). */
  isLate: boolean
}

export type CertificationPhase = 'NOT_CERTIFIED' | 'ACTIVE' | 'RENEWAL_OPEN' | 'GRACE' | 'LAPSED'

export type RenewalCycleState =
  'UPCOMING' | 'OPEN' | 'RENEWED_ON_TIME' | 'IN_GRACE' | 'RENEWED_LATE' | 'MISSED'

export interface RenewalCycle {
  cycleNumber: number
  windowOpens: string
  dueDate: string
  /** First day the user is lapsed if this cycle is still unrenewed. */
  graceEnds: string
  state: RenewalCycleState
  submissionId?: string
}

export interface CertificationPeriod {
  /** The INITIAL submission id that started the period. */
  periodId: string
  startDate: string
  /** Set when the period lapsed (a cycle was MISSED). */
  endedOn?: string
  cycles: RenewalCycle[]
}

export interface CertificationStatus {
  role: UserRole
  phase: CertificationPhase
  /** Every period, oldest first (history is never dropped). */
  periods: CertificationPeriod[]
  /** The latest period while it is still running. */
  currentPeriod?: CertificationPeriod
  /** The oldest renewal that can be submitted today (in grace or in its window). */
  openRenewal?: RenewalCycle
  /** The open renewal, else the next upcoming one. */
  nextRenewal?: RenewalCycle
  lapsedOn?: string
}
