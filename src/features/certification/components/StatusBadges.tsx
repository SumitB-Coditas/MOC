import { Badge } from '@/components/ui/badge'
import type { EffectiveAssignmentStatus, RenewalCycleState } from '@/types/certification'
import { ASSIGNMENT_STATUS, CYCLE_STATE } from '../labels'

export function AssignmentStatusBadge({ status }: { status: EffectiveAssignmentStatus }) {
  const { label, variant } = ASSIGNMENT_STATUS[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function CycleStateBadge({ state }: { state: RenewalCycleState }) {
  const { label, variant } = CYCLE_STATE[state]
  return <Badge variant={variant}>{label}</Badge>
}
