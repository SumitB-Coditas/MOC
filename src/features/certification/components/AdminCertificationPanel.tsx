import { CircleCheck, CircleX, FilePlus2 } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buildPath } from '@/config/routes'
import type { AssignmentEligibility } from '@/domain/certification/assignmentRules'
import { formatCalendarDate, formatDateTime } from '@/lib/date'
import { getErrorMessage } from '@/lib/errors'
import { eligibilityMessage } from '../certificationService'
import { useUserCertification } from '../hooks'
import { purposeLabel } from '../labels'
import { useCertificationService } from '../serviceContext'
import { CertificationStatusCard } from './CertificationStatusCard'
import { CycleTimeline } from './CycleTimeline'
import { SubmissionsTable } from './SubmissionsTable'
import { AssignmentStatusBadge } from './StatusBadges'

type Feedback = { variant: 'success' | 'destructive'; message: string }

function describeAssignment(eligibility: Extract<AssignmentEligibility, { canAssign: true }>) {
  if (eligibility.purpose === 'INITIAL') return 'the initial certificate application'
  const { cycle, isLate } = eligibility
  return `renewal ${cycle.cycleNumber} (due ${formatCalendarDate(cycle.dueDate)}${
    isLate ? `, late: grace period ends ${formatCalendarDate(cycle.graceEnds)}` : ''
  })`
}

/** Admin view of one user's certification: status, assignment, cycles and submissions. */
export function AdminCertificationPanel({ userId }: { userId: string }) {
  const service = useCertificationService()
  const { data, error, status, reload } = useUserCertification(userId)
  const [feedback, setFeedback] = useState<Feedback>()
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setFeedback(undefined)
    try {
      await action()
      setFeedback({ variant: 'success', message: success })
      reload()
    } catch (actionError) {
      setFeedback({ variant: 'destructive', message: getErrorMessage(actionError) })
    } finally {
      setBusy(false)
    }
  }

  if (status === 'error' && !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(error)}</AlertDescription>
      </Alert>
    )
  }
  if (!data) return <LoadingIndicator layout="block" label="Loading certification…" />

  const { eligibility } = data
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Certification</h2>
        </CardTitle>
        <CardDescription>
          Role and renewal status are derived from the user&apos;s submissions.
        </CardDescription>
        <CardAction>
          {eligibility.canAssign ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={busy}>
                  <FilePlus2 data-icon="inline-start" aria-hidden="true" />
                  Assign form
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Assign the certificate form?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The user will see {describeAssignment(eligibility)} on their dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      run(
                        () => service.assignForm(userId),
                        'Form assigned. The user can now complete it.',
                      )
                    }
                  >
                    Assign
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <div aria-live="polite">
          {feedback && (
            <Alert variant={feedback.variant}>
              {feedback.variant === 'success' ? <CircleCheck /> : <CircleX />}
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <CertificationStatusCard status={data.status}>
          {!eligibility.canAssign && <p>{eligibilityMessage(eligibility)}</p>}
        </CertificationStatusCard>

        <section className="space-y-2">
          <h3 className="font-medium">Assignments</h3>
          {data.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No forms assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.assignments.map((assignment) => {
                  const open = assignment.status === 'ASSIGNED' || assignment.status === 'DRAFT'
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        {purposeLabel(assignment.purpose, assignment.cycleNumber)}
                      </TableCell>
                      <TableCell>
                        <AssignmentStatusBadge status={assignment.effectiveStatus} />
                      </TableCell>
                      <TableCell>{formatDateTime(assignment.assignedAt)}</TableCell>
                      <TableCell>{formatDateTime(assignment.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        {open && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" disabled={busy}>
                                Cancel assignment
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel this assignment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  The user will no longer be able to complete it. Any saved draft is
                                  kept for reference.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep it</AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  onClick={() =>
                                    run(
                                      () => service.cancelAssignment(assignment.id),
                                      'Assignment cancelled.',
                                    )
                                  }
                                >
                                  Cancel assignment
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">Renewal cycles</h3>
          <CycleTimeline periods={data.status.periods} />
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">Submissions</h3>
          <SubmissionsTable
            submissions={data.submissions}
            hrefFor={(submission) => buildPath.adminSubmissionDetail(submission.id)}
          />
        </section>
      </CardContent>
    </Card>
  )
}
