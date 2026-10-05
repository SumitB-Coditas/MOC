import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { buildPath } from '@/config/routes'
import { formatCalendarDate, formatDateTime } from '@/lib/date'
import type { AssignmentView } from '../certificationService'
import { purposeLabel } from '../labels'
import { AssignmentStatusBadge } from './StatusBadges'

const ACTION_LABEL = { ASSIGNED: 'Start', DRAFT: 'Continue' } as const

export function MemberAssignments({ assignments }: { assignments: AssignmentView[] }) {
  const visible = assignments.filter((assignment) => assignment.effectiveStatus !== 'CANCELLED')
  if (visible.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No forms assigned yet"
        description="Your administrator will assign your certificate form when it is due."
      />
    )
  }

  return (
    <ul className="divide-y">
      {visible.map((assignment) => {
        const status = assignment.effectiveStatus
        const action = status === 'ASSIGNED' || status === 'DRAFT' ? ACTION_LABEL[status] : 'View'
        return (
          <li
            key={assignment.id}
            className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {assignment.formTitle}: {purposeLabel(assignment.purpose, assignment.cycleNumber)}
                </p>
                <AssignmentStatusBadge status={status} />
              </div>
              <p className="text-xs text-muted-foreground">
                Assigned {formatDateTime(assignment.assignedAt)}
                {assignment.cycle && ` · Due ${formatCalendarDate(assignment.cycle.dueDate)}`}
                {status === 'DRAFT' &&
                  assignment.draft &&
                  ` · Draft saved ${formatDateTime(assignment.draft.savedAt)}`}
                {assignment.submittedAt && ` · Submitted ${formatDateTime(assignment.submittedAt)}`}
              </p>
            </div>
            <Button size="sm" variant={action === 'View' ? 'outline' : 'primary'} asChild>
              <Link to={buildPath.fillForm(assignment.id)}>
                {action}
                <span className="sr-only">
                  {' '}
                  {purposeLabel(assignment.purpose, assignment.cycleNumber)}
                </span>
              </Link>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
