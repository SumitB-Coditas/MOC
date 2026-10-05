import { Inbox } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { buildPath } from '@/config/routes'
import { getErrorMessage } from '@/lib/errors'
import { SubmissionsTable } from '../components/SubmissionsTable'
import { useAllSubmissions } from '../hooks'

export function AdminSubmissionsPage() {
  const { data, error, status } = useAllSubmissions()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submissions"
        description="Every initial application and renewal submitted by any user, newest first."
      />
      <Card>
        <CardContent>
          {status === 'error' && !data ? (
            <Alert variant="destructive">
              <AlertTitle>Submissions could not be loaded</AlertTitle>
              <AlertDescription>{getErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : !data ? (
            <LoadingIndicator layout="block" label="Loading submissions…" />
          ) : data.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No submissions yet"
              description="Submitted applications and renewals appear here."
            />
          ) : (
            <SubmissionsTable
              submissions={data}
              showApplicant
              hrefFor={(submission) => buildPath.adminSubmissionDetail(submission.id)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
