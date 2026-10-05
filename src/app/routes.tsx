import { Navigate, type RouteObject } from 'react-router-dom'
import { PlaceholderPage } from '@/components/common/PlaceholderPage'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ROUTES } from '@/config/routes'
import { RoleDashboardLayout } from '@/features/auth/components/RoleDashboardLayout'
import { PublicOnly } from '@/features/auth/guards/PublicOnly'
import { RequireAuth } from '@/features/auth/guards/RequireAuth'
import { RoleRedirect } from '@/features/auth/guards/RoleRedirect'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { AdminDashboardPage } from '@/features/dashboard/pages/AdminDashboardPage'
import { UserDetailPage } from '@/features/users/pages/UserDetailPage'
import { UsersListPage } from '@/features/users/pages/UsersListPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { Role } from '@/types/auth'

/** Development-only routes; the branch (and its lazy chunk) is dropped from production builds. */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: ROUTES.designSystem,
        lazy: async () => ({
          Component: (await import('@/pages/DesignSystemPage')).DesignSystemPage,
        }),
      },
    ]
  : []

/** An authenticated area: role gate, then the role-aware dashboard frame. */
function protectedArea(allowedRoles: readonly Role[], children: RouteObject[]): RouteObject {
  return {
    element: <RequireAuth allowedRoles={allowedRoles} />,
    children: [{ element: <RoleDashboardLayout />, children }],
  }
}

/** Route tree. Pages not yet built render a placeholder naming their phase. */
export const routes: RouteObject[] = [
  { path: ROUTES.root, element: <RoleRedirect /> },
  {
    element: <PublicOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.login, element: <LoginPage /> },
          { path: ROUTES.register, element: <RegisterPage /> },
        ],
      },
    ],
  },
  protectedArea(
    ['ADMIN'],
    [
      { path: ROUTES.admin.root, element: <Navigate to={ROUTES.admin.dashboard} replace /> },
      { path: ROUTES.admin.dashboard, element: <AdminDashboardPage /> },
      { path: ROUTES.admin.users, element: <UsersListPage /> },
      { path: ROUTES.admin.userDetail, element: <UserDetailPage /> },
      {
        path: ROUTES.admin.submissions,
        element: <PlaceholderPage title="Submissions" phase={6} />,
      },
      {
        path: ROUTES.admin.submissionDetail,
        element: <PlaceholderPage title="Submission Details" phase={6} />,
      },
      { path: ROUTES.admin.forms, element: <PlaceholderPage title="Form Templates" phase={5} /> },
      { path: ROUTES.admin.settings, element: <PlaceholderPage title="Demo Settings" phase={7} /> },
    ],
  ),
  protectedArea(
    ['CANDIDATE'],
    [
      {
        path: ROUTES.candidate.dashboard,
        element: <PlaceholderPage title="Candidate Dashboard" phase={5} />,
      },
    ],
  ),
  protectedArea(
    ['DIPLOMATE'],
    [
      {
        path: ROUTES.diplomate.dashboard,
        element: <PlaceholderPage title="Diplomate Dashboard" phase={5} />,
      },
    ],
  ),
  // Pages shared by Candidates and Diplomates.
  protectedArea(
    ['CANDIDATE', 'DIPLOMATE'],
    [
      {
        path: ROUTES.member.fillForm,
        element: <PlaceholderPage title="Certificate Form" phase={6} />,
      },
      {
        path: ROUTES.member.history,
        element: <PlaceholderPage title="Certificate History" phase={7} />,
      },
      {
        path: ROUTES.member.historyDetail,
        element: <PlaceholderPage title="Submission Details" phase={7} />,
      },
      { path: ROUTES.member.profile, element: <PlaceholderPage title="Profile" phase={8} /> },
    ],
  ),
  ...devRoutes,
  { path: ROUTES.forbidden, element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]
