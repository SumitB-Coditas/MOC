import { generatePath } from 'react-router-dom'

/** Single source of truth for every URL in the app. */
export const ROUTES = {
  root: '/',
  login: '/login',
  register: '/register',
  forbidden: '/403',
  /** Development-only design system showcase (not registered in production builds). */
  designSystem: '/design-system',
  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    userDetail: '/admin/users/:userId',
    submissions: '/admin/submissions',
    submissionDetail: '/admin/submissions/:submissionId',
    forms: '/admin/forms',
    settings: '/admin/settings',
  },
  candidate: {
    dashboard: '/candidate/dashboard',
  },
  diplomate: {
    dashboard: '/diplomate/dashboard',
  },
  /** Pages shared by Candidates and Diplomates. */
  member: {
    fillForm: '/forms/:assignmentId',
    history: '/history',
    historyDetail: '/history/:submissionId',
    profile: '/profile',
  },
} as const

/** Builders for parameterised routes, so call sites never concatenate URLs by hand. */
export const buildPath = {
  adminUserDetail: (userId: string) => generatePath(ROUTES.admin.userDetail, { userId }),
  adminSubmissionDetail: (submissionId: string) =>
    generatePath(ROUTES.admin.submissionDetail, { submissionId }),
  fillForm: (assignmentId: string) => generatePath(ROUTES.member.fillForm, { assignmentId }),
  historyDetail: (submissionId: string) =>
    generatePath(ROUTES.member.historyDetail, { submissionId }),
}
