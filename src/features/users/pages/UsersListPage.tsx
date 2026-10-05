import { SearchX, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingIndicator } from '@/components/common/LoadingIndicator'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getErrorMessage } from '@/lib/errors'
import { UserFiltersBar } from '../components/UserFiltersBar'
import { UsersTable } from '../components/UsersTable'
import {
  DEFAULT_USER_FILTERS,
  parseUserFilters,
  toSearchParams,
  toUserQuery,
  type UserFilters,
} from '../filters'
import { useUserList } from '../hooks'

export function UsersListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseUserFilters(searchParams)
  const { status, data: users, error, reload } = useUserList(toUserQuery(filters))

  const setFilters = (next: UserFilters) => setSearchParams(toSearchParams(next), { replace: true })
  const isFiltered = filters.search !== '' || filters.role !== 'ALL'

  let content
  if (status === 'error') {
    content = (
      <Alert variant="destructive">
        <AlertTitle>Users could not be loaded</AlertTitle>
        <AlertDescription>
          <p>{getErrorMessage(error)}</p>
          <Button variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  } else if (!users) {
    content = <LoadingIndicator layout="block" label="Loading users…" />
  } else if (users.length === 0) {
    content = isFiltered ? (
      <EmptyState
        icon={SearchX}
        title="No users match your filters"
        description="Try a different name or email, or clear the filters."
        action={
          <Button
            variant="outline"
            onClick={() => setFilters({ ...DEFAULT_USER_FILTERS, status: filters.status })}
          >
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Users}
        title={filters.status === 'INACTIVE' ? 'No inactive users' : 'No users yet'}
        description={
          filters.status === 'INACTIVE'
            ? 'Deactivated accounts will appear here.'
            : 'Candidates appear here after they register.'
        }
      />
    )
  } else {
    content = <UsersTable users={users} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Registered Candidates and Diplomates. Roles follow each user's certification status."
      />
      <Card>
        <CardContent className="space-y-4">
          <UserFiltersBar filters={filters} onChange={setFilters} />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {users ? `${users.length} ${users.length === 1 ? 'user' : 'users'}` : ''}
          </p>
          {content}
        </CardContent>
      </Card>
    </div>
  )
}
