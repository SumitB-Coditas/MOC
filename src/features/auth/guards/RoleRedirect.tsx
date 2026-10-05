import { Navigate } from 'react-router-dom'
import { HOME_PATH_BY_ROLE, ROUTES } from '@/config/routes'
import { useAuth } from '../useAuth'
import { SessionLoading } from './SessionLoading'

/** `/`: sends each visitor to the right starting page. */
export function RoleRedirect() {
  const { status, user } = useAuth()

  if (status === 'loading') return <SessionLoading />
  return <Navigate to={user ? HOME_PATH_BY_ROLE[user.role] : ROUTES.login} replace />
}
