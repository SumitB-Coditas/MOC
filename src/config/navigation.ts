import { FileText, History, Inbox, LayoutDashboard, Settings, UserRound, Users } from 'lucide-react'
import type { NavItem } from '@/components/layout/navigation'
import type { Role } from '@/types/auth'
import { ROUTES } from './routes'

export const ADMIN_NAVIGATION: NavItem[] = [
  { to: ROUTES.admin.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.admin.users, label: 'Users', icon: Users },
  { to: ROUTES.admin.submissions, label: 'Submissions', icon: Inbox },
  { to: ROUTES.admin.forms, label: 'Form Templates', icon: FileText },
  { to: ROUTES.admin.settings, label: 'Settings', icon: Settings },
]

const MEMBER_SHARED_NAVIGATION: NavItem[] = [
  { to: ROUTES.member.history, label: 'History', icon: History },
  { to: ROUTES.member.profile, label: 'Profile', icon: UserRound },
]

export const CANDIDATE_NAVIGATION: NavItem[] = [
  { to: ROUTES.candidate.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  ...MEMBER_SHARED_NAVIGATION,
]

export const DIPLOMATE_NAVIGATION: NavItem[] = [
  { to: ROUTES.diplomate.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  ...MEMBER_SHARED_NAVIGATION,
]

export const NAVIGATION_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: ADMIN_NAVIGATION,
  CANDIDATE: CANDIDATE_NAVIGATION,
  DIPLOMATE: DIPLOMATE_NAVIGATION,
}
