import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buildPath } from '@/config/routes'
import { getErrorMessage } from '@/lib/errors'
import { CertificationStatusCard } from '../components/CertificationStatusCard'
import { CycleTimeline } from '../components/CycleTimeline'
import { SubmissionsTable } from '../components/SubmissionsTable'
import { useMyCertification } from '../hooks'

export function HistoryPage() {
  const { data, error, status } = useMyCertification()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate History"
        description="Every application and renewal you have submitted, and your renewal schedule."
      />
      {status === 'error' && !data ? (
        <Alert variant="destructive">
          <AlertTitle>Your history could not be loaded</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : !data ? (
        <LoadingIndicator layout="block" label="Loading history…" />
      ) : (
        <>
          <CertificationStatusCard status={data.status} />
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Renewal cycles</h2>
              </CardTitle>
              <CardDescription>
                Renewals are due every 3 years from the initial application date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CycleTimeline periods={data.status.periods} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Submissions</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SubmissionsTable
                submissions={data.submissions}
                hrefFor={(submission) => buildPath.historyDetail(submission.id)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
