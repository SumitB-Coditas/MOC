import { Navigate, Outlet } from 'react-router-dom'
import { HOME_PATH_BY_ROLE } from '@/config/routes'
import { useAuth } from '../useAuth'
import { SessionLoading } from './SessionLoading'

/**
 * Login and registration are for signed-out visitors. This guard also performs the
 * post-login redirect: once the session exists, the user is sent to their dashboard.
 */
export function PublicOnly() {
  const { status, user } = useAuth()

  if (status === 'loading') return <SessionLoading />
  if (user) return <Navigate to={HOME_PATH_BY_ROLE[user.role]} replace />
  return <Outlet />
}
