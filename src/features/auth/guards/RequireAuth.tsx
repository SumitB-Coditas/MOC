import { Navigate, Outlet } from 'react-router-dom'
import { HOME_PATH_BY_ROLE, ROUTES } from '@/config/routes'
import type { Role } from '@/types/auth'
import { useAuth } from '../useAuth'
import { SessionLoading } from './SessionLoading'

interface RequireAuthProps {
  allowedRoles: readonly Role[]
}

/**
 * Gate for authenticated areas. Anonymous visitors go to /login. Signed-in users without
 * an allowed role go to their own dashboard, which always admits them, so redirects can't loop.
 */
export function RequireAuth({ allowedRoles }: RequireAuthProps) {
  const { status, user } = useAuth()

  if (status === 'loading') return <SessionLoading />
  if (!user) return <Navigate to={ROUTES.login} replace />
  if (!allowedRoles.includes(user.role))
    return <Navigate to={HOME_PATH_BY_ROLE[user.role]} replace />
  return <Outlet />
}
