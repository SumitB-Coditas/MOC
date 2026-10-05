import type { BadgeProps } from './badgeTypes'
import type {
  AssignmentPurpose,
  EffectiveAssignmentStatus,
  RenewalCycleState,
} from '@/types/certification'

export function purposeLabel(purpose: AssignmentPurpose, cycleNumber?: number): string {
  return purpose === 'INITIAL' ? 'Initial application' : `Renewal ${cycleNumber ?? ''}`.trim()
}

export const ASSIGNMENT_STATUS: Record<
  EffectiveAssignmentStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  ASSIGNED: { label: 'Assigned', variant: 'info' },
  DRAFT: { label: 'Draft', variant: 'warning' },
  SUBMITTED: { label: 'Submitted', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' },
  EXPIRED: { label: 'Expired', variant: 'destructive' },
}

export const CYCLE_STATE: Record<
  RenewalCycleState,
  { label: string; variant: BadgeProps['variant'] }
> = {
  UPCOMING: { label: 'Upcoming', variant: 'outline' },
  OPEN: { label: 'Window open', variant: 'info' },
  IN_GRACE: { label: 'In grace period', variant: 'warning' },
  RENEWED_ON_TIME: { label: 'Renewed', variant: 'success' },
  RENEWED_LATE: { label: 'Renewed late', variant: 'success' },
  MISSED: { label: 'Missed', variant: 'destructive' },
}
