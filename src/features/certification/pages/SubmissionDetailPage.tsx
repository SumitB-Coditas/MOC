import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCalendarDate, formatDateTime } from '@/lib/date'
import { getErrorMessage } from '@/lib/errors'
import { ReadOnlyFormView } from '../components/ReadOnlyFormView'
import { useSubmission } from '../hooks'
import { purposeLabel } from '../labels'

/** Read-only view of a submission, rendered from the form snapshot taken at submit time. */
export function SubmissionDetailPage({ backTo, backLabel }: { backTo: string; backLabel: string }) {
  const { submissionId = '' } = useParams()
  const { data: submission, error, status } = useSubmission(submissionId)

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link to={backTo}>
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        {backLabel}
      </Link>
    </Button>
  )

  if (status === 'error' && !submission) {
    return (
      <div className="space-y-4">
        {back}
        <Alert variant="destructive">
          <AlertTitle>This submission could not be opened</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      </div>
    )
  }
  if (!submission) return <LoadingIndicator layout="block" label="Loading submission…" />

  const { applicantSnapshot: applicant } = submission
  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title={`${submission.formSnapshot.title}: ${purposeLabel(submission.purpose, submission.cycleNumber)}`}
        description={`Submitted ${formatDateTime(submission.submittedAt)}`}
        actions={
          submission.purpose === 'RENEWAL' &&
          (submission.isLate ? (
            <Badge variant="warning">Late renewal</Badge>
          ) : (
            <Badge variant="success">On time</Badge>
          ))
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Applicant (as submitted)</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            {[
              ['Name', `${applicant.firstName} ${applicant.lastName}`],
              ['Email', applicant.email],
              ['Date of birth', formatCalendarDate(applicant.dateOfBirth)],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <ReadOnlyFormView form={submission.formSnapshot} values={submission.values} />
        </CardContent>
      </Card>
    </div>
  )
}
