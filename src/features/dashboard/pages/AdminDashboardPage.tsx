import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { buildPath, ROUTES } from '@/config/routes'
import { RoleBadge } from '@/features/users/components/RoleBadge'
import { DEFAULT_USER_FILTERS, toSearchParams } from '@/features/users/filters'
import { useUserOverview } from '@/features/users/hooks'
import { formatDateTime } from '@/lib/date'
import { getErrorMessage } from '@/lib/errors'
import { RoleBreakdown } from '../components/RoleBreakdown'
import { StatTile } from '../components/StatTile'

function usersLink(filters: Partial<typeof DEFAULT_USER_FILTERS>) {
  const query = toSearchParams({ ...DEFAULT_USER_FILTERS, ...filters }).toString()
  return query ? `${ROUTES.admin.users}?${query}` : ROUTES.admin.users
}

export function AdminDashboardPage() {
  const { data: overview, error, status, reload } = useUserOverview()

  const header = (
    <PageHeader
      title="Admin Dashboard"
      description="An overview of registered users."
      actions={
        <Button asChild>
          <Link to={ROUTES.admin.users}>
            Manage users
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      }
    />
  )

  if (status === 'error' && !overview) {
    return (
      <div className="space-y-6">
        {header}
        <Alert variant="destructive">
          <AlertTitle>The overview could not be loaded</AlertTitle>
          <AlertDescription>
            <p>{getErrorMessage(error)}</p>
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  if (!overview) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingIndicator layout="block" label="Loading overview…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      <section aria-label="User totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active users" value={overview.totalActive} to={usersLink({})} />
        <StatTile
          label="Active candidates"
          value={overview.activeCandidates}
          to={usersLink({ role: 'CANDIDATE' })}
        />
        <StatTile
          label="Active diplomates"
          value={overview.activeDiplomates}
          to={usersLink({ role: 'DIPLOMATE' })}
        />
        <StatTile
          label="Inactive accounts"
          value={overview.inactive}
          to={usersLink({ status: 'INACTIVE' })}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Active users by role</h2>
            </CardTitle>
            <CardDescription>Share of {overview.totalActive} active users.</CardDescription>
          </CardHeader>
          <CardContent>
            <RoleBreakdown
              counts={{
                CANDIDATE: overview.activeCandidates,
                DIPLOMATE: overview.activeDiplomates,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Recent registrations</h2>
            </CardTitle>
            <CardDescription>The newest active accounts.</CardDescription>
            <CardAction>
              <Button variant="link" size="sm" asChild>
                <Link to={ROUTES.admin.users}>View all</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {overview.recentRegistrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No registrations yet.</p>
            ) : (
              <ul className="divide-y">
                {overview.recentRegistrations.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={buildPath.adminUserDetail(user.id)}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {user.firstName} {user.lastName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        Registered {formatDateTime(user.createdAt)}
                      </p>
                    </div>
                    <RoleBadge role={user.role} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
