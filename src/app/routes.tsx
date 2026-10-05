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
import { AdminSubmissionsPage } from '@/features/certification/pages/AdminSubmissionsPage'
import { FillFormPage } from '@/features/certification/pages/FillFormPage'
import { HistoryPage } from '@/features/certification/pages/HistoryPage'
import { MemberDashboardPage } from '@/features/certification/pages/MemberDashboardPage'
import { SubmissionDetailPage } from '@/features/certification/pages/SubmissionDetailPage'
import { AdminDashboardPage } from '@/features/dashboard/pages/AdminDashboardPage'
import { DemoSettingsPage } from '@/features/settings/pages/DemoSettingsPage'
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
      { path: ROUTES.admin.submissions, element: <AdminSubmissionsPage /> },
      {
        path: ROUTES.admin.submissionDetail,
        element: (
          <SubmissionDetailPage backTo={ROUTES.admin.submissions} backLabel="All submissions" />
        ),
      },
      { path: ROUTES.admin.forms, element: <PlaceholderPage title="Form Templates" phase={5} /> },
      { path: ROUTES.admin.settings, element: <DemoSettingsPage /> },
    ],
  ),
  protectedArea(
    ['CANDIDATE'],
    [{ path: ROUTES.candidate.dashboard, element: <MemberDashboardPage /> }],
  ),
  protectedArea(
    ['DIPLOMATE'],
    [{ path: ROUTES.diplomate.dashboard, element: <MemberDashboardPage /> }],
  ),
  // Pages shared by Candidates and Diplomates.
  protectedArea(
    ['CANDIDATE', 'DIPLOMATE'],
    [
      { path: ROUTES.member.fillForm, element: <FillFormPage /> },
      { path: ROUTES.member.history, element: <HistoryPage /> },
      {
        path: ROUTES.member.historyDetail,
        element: (
          <SubmissionDetailPage backTo={ROUTES.member.history} backLabel="Certificate history" />
        ),
      },
      { path: ROUTES.member.profile, element: <PlaceholderPage title="Profile" phase={8} /> },
    ],
  ),
  ...devRoutes,
  { path: ROUTES.forbidden, element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]
