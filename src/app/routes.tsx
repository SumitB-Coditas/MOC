import { Navigate, type RouteObject } from 'react-router-dom'
import { PlaceholderPage } from '@/components/common/PlaceholderPage'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  ADMIN_NAVIGATION,
  CANDIDATE_NAVIGATION,
  DIPLOMATE_NAVIGATION,
  MEMBER_NAVIGATION,
} from '@/config/navigation'
import { ROUTES } from '@/config/routes'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

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

/**
 * Route tree. Pages are placeholders until their phase is implemented.
 * Auth guards (RequireAuth / RequireRole / PublicOnly / RoleRedirect) are added in Phase 2.
 */
export const routes: RouteObject[] = [
  // Becomes a role-based redirect in Phase 2.
  { path: ROUTES.root, element: <Navigate to={ROUTES.login} replace /> },
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.login, element: <PlaceholderPage title="Sign in" phase={2} /> },
      { path: ROUTES.register, element: <PlaceholderPage title="Register" phase={2} /> },
    ],
  },
  {
    path: ROUTES.admin.root,
    element: <DashboardLayout areaLabel="Admin" navigation={ADMIN_NAVIGATION} />,
    children: [
      { index: true, element: <Navigate to={ROUTES.admin.dashboard} replace /> },
      {
        path: ROUTES.admin.dashboard,
        element: <PlaceholderPage title="Admin Dashboard" phase={3} />,
      },
      { path: ROUTES.admin.users, element: <PlaceholderPage title="Users" phase={3} /> },
      {
        path: ROUTES.admin.userDetail,
        element: <PlaceholderPage title="User Details" phase={3} />,
      },
      {
        path: ROUTES.admin.submissions,
        element: <PlaceholderPage title="Submissions" phase={7} />,
      },
      {
        path: ROUTES.admin.submissionDetail,
        element: <PlaceholderPage title="Submission Details" phase={7} />,
      },
      { path: ROUTES.admin.forms, element: <PlaceholderPage title="Form Templates" phase={4} /> },
      { path: ROUTES.admin.settings, element: <PlaceholderPage title="Demo Settings" phase={6} /> },
    ],
  },
  {
    element: <DashboardLayout areaLabel="Candidate" navigation={CANDIDATE_NAVIGATION} />,
    children: [
      {
        path: ROUTES.candidate.dashboard,
        element: <PlaceholderPage title="Candidate Dashboard" phase={2} />,
      },
    ],
  },
  {
    element: <DashboardLayout areaLabel="Diplomate" navigation={DIPLOMATE_NAVIGATION} />,
    children: [
      {
        path: ROUTES.diplomate.dashboard,
        element: <PlaceholderPage title="Diplomate Dashboard" phase={2} />,
      },
    ],
  },
  {
    // Shared Candidate/Diplomate pages; navigation becomes role-aware in Phase 2.
    element: <DashboardLayout areaLabel="Member" navigation={MEMBER_NAVIGATION} />,
    children: [
      {
        path: ROUTES.member.fillForm,
        element: <PlaceholderPage title="Certificate Form" phase={5} />,
      },
      {
        path: ROUTES.member.history,
        element: <PlaceholderPage title="Certificate History" phase={7} />,
      },
      {
        path: ROUTES.member.historyDetail,
        element: <PlaceholderPage title="Submission Details" phase={7} />,
      },
      { path: ROUTES.member.profile, element: <PlaceholderPage title="Profile" phase={2} /> },
    ],
  },
  ...devRoutes,
  { path: ROUTES.forbidden, element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]
