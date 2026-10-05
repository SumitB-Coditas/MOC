import { ArrowLeft, CircleCheck, CircleX, Pencil, UserRoundX } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
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
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/useAuth'
import { AdminCertificationPanel } from '@/features/certification/components/AdminCertificationPanel'
import { formatDateTime } from '@/lib/date'
import { getErrorMessage, isAppError } from '@/lib/errors'
import { AccountStatusBadge } from '../components/AccountStatusBadge'
import { EditProfileForm } from '../components/EditProfileForm'
import { DetailList, ProfileDetails } from '../components/ProfileDetails'
import { RoleBadge } from '../components/RoleBadge'
import { StatusChangeDialog } from '../components/StatusChangeDialog'
import { useUser } from '../hooks'
import type { UpdateProfileInput } from '../schemas'
import { useUsersService } from '../usersServiceContext'

type Feedback = { variant: 'success' | 'destructive'; message: string }

function BackToUsers() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to={ROUTES.admin.users}>
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        All users
      </Link>
    </Button>
  )
}

export function UserDetailPage() {
  const { userId = '' } = useParams()
  const service = useUsersService()
  const { user: currentUser } = useAuth()
  const { data: user, error, status, reload } = useUser(userId)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>()

  if (status === 'error' && isAppError(error) && error.code === 'NOT_FOUND') {
    return (
      <div className="space-y-4">
        <BackToUsers />
        <Card>
          <EmptyState
            icon={UserRoundX}
            title="User not found"
            description="This user does not exist. Check the link or return to the user list."
          />
        </Card>
      </div>
    )
  }
  if (status === 'error' && !user) {
    return (
      <div className="space-y-4">
        <BackToUsers />
        <Alert variant="destructive">
          <AlertTitle>The user could not be loaded</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      </div>
    )
  }
  if (!user) return <LoadingIndicator layout="block" label="Loading user…" />

  const fullName = `${user.firstName} ${user.lastName}`
  const isSelf = currentUser?.id === user.id

  async function handleSave(input: UpdateProfileInput) {
    await service.updateProfile(userId, input) // field errors are handled by the form
    setIsEditing(false)
    setFeedback({ variant: 'success', message: 'Profile updated.' })
    reload()
  }

  async function handleStatusChange() {
    if (!user) return
    const deactivating = user.status === 'ACTIVE'
    setIsChangingStatus(true)
    setFeedback(undefined)
    try {
      await (deactivating ? service.deactivateUser(userId) : service.reactivateUser(userId))
      setFeedback({
        variant: 'success',
        message: deactivating
          ? `${fullName} has been deactivated.`
          : `${fullName} is active again.`,
      })
      reload()
    } catch (statusError) {
      setFeedback({ variant: 'destructive', message: getErrorMessage(statusError) })
    } finally {
      setIsChangingStatus(false)
    }
  }

  return (
    <div className="space-y-6">
      <BackToUsers />
      <PageHeader
        title={fullName}
        description={user.email}
        actions={
          !isSelf && (
            <StatusChangeDialog
              user={user}
              isPending={isChangingStatus}
              onConfirm={handleStatusChange}
            />
          )
        }
      />

      <div aria-live="polite">
        {feedback && (
          <Alert variant={feedback.variant}>
            {feedback.variant === 'success' ? <CircleCheck /> : <CircleX />}
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}
      </div>

      {user.status === 'INACTIVE' && (
        <Alert variant="warning">
          <UserRoundX />
          <AlertTitle>This account is inactive</AlertTitle>
          <AlertDescription>
            The user cannot sign in. Their record is kept and can be reactivated.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Profile</h2>
          </CardTitle>
          <CardDescription>Personal details provided at registration.</CardDescription>
          {!isEditing && (
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFeedback(undefined)
                  setIsEditing(true)
                }}
              >
                <Pencil data-icon="inline-start" aria-hidden="true" />
                Edit profile
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <EditProfileForm user={user} onSave={handleSave} onCancel={() => setIsEditing(false)} />
          ) : (
            <ProfileDetails user={user} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Account</h2>
          </CardTitle>
          <CardDescription>
            Role is derived from the user&apos;s certification status and cannot be edited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList
            items={[
              ['Role', <RoleBadge key="role" role={user.role} />],
              ['Status', <AccountStatusBadge key="status" status={user.status} />],
              ['Registered', formatDateTime(user.createdAt)],
              ['Last updated', formatDateTime(user.updatedAt)],
              ...(user.deactivatedAt
                ? [['Deactivated', formatDateTime(user.deactivatedAt)] as [string, string]]
                : []),
              [
                'User ID',
                <code key="id" className="font-mono text-sm">
                  {user.id}
                </code>,
              ],
            ]}
          />
        </CardContent>
      </Card>

      <AdminCertificationPanel userId={user.id} />
    </div>
  )
}
