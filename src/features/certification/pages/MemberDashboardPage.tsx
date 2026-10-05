import { CircleCheck, History } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLE_LABELS } from '@/config/roles'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/useAuth'
import { getErrorMessage } from '@/lib/errors'
import { CertificationStatusCard } from '../components/CertificationStatusCard'
import { MemberAssignments } from '../components/MemberAssignments'
import { useMyCertification } from '../hooks'

/** Dashboard for Candidates and Diplomates: certification status and assigned forms. */
export function MemberDashboardPage() {
  const { user } = useAuth()
  const location = useLocation()
  const flash = (location.state as { flash?: string } | null)?.flash
  const { data, error, status } = useMyCertification()

  const role = user?.role === 'DIPLOMATE' ? 'DIPLOMATE' : 'CANDIDATE'
  const hasOpenAssignment = data?.assignments.some(
    (assignment) =>
      assignment.effectiveStatus === 'ASSIGNED' || assignment.effectiveStatus === 'DRAFT',
  )
  const renewalDue = data?.status.phase === 'RENEWAL_OPEN' || data?.status.phase === 'GRACE'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${ROLE_LABELS[role]} Dashboard`}
        description={user ? `Welcome, ${user.firstName}.` : undefined}
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.member.history}>
              <History data-icon="inline-start" aria-hidden="true" />
              Certificate history
            </Link>
          </Button>
        }
      />

      {flash && (
        <Alert variant="success">
          <CircleCheck />
          <AlertDescription>{flash}</AlertDescription>
        </Alert>
      )}

      {status === 'error' && !data ? (
        <Alert variant="destructive">
          <AlertTitle>Your dashboard could not be loaded</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : !data ? (
        <LoadingIndicator layout="block" label="Loading your certification…" />
      ) : (
        <>
          <CertificationStatusCard status={data.status}>
            {renewalDue && !hasOpenAssignment && (
              <p>Your administrator will assign the renewal form to you.</p>
            )}
          </CertificationStatusCard>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Your forms</h2>
              </CardTitle>
              <CardDescription>
                Certificate forms assigned to you by the administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemberAssignments assignments={data.assignments} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
