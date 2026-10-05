import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { NAVIGATION_BY_ROLE } from '@/config/navigation'
import { ROLE_LABELS } from '@/config/roles'
import { useAuth } from '../useAuth'
import { UserMenu } from './UserMenu'

/** DashboardLayout configured for the signed-in user's role (navigation, label, user menu). */
export function RoleDashboardLayout() {
  const { user } = useAuth()
  // Always rendered inside RequireAuth, so a user is present.
  if (!user) return null

  return (
    <DashboardLayout
      areaLabel={ROLE_LABELS[user.role]}
      navigation={NAVIGATION_BY_ROLE[user.role]}
      userSlot={<UserMenu user={user} />}
    />
  )
}
