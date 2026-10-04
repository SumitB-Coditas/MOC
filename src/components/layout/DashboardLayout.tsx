import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import type { NavItem } from './navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface DashboardLayoutProps {
  /** Shown in the top bar, e.g. "Admin" or the signed-in user's role. */
  areaLabel: string
  navigation: NavItem[]
  /** Top-bar slot for user information and actions. */
  userSlot?: ReactNode
}

/**
 * Frame for every authenticated page: top bar, navigation (sidebar on desktop,
 * scrollable tab strip on mobile) and the routed page content.
 */
export function DashboardLayout({ areaLabel, navigation, userSlot }: DashboardLayoutProps) {
  return (
    <div className="min-h-svh bg-muted/30">
      <Topbar areaLabel={areaLabel} userSlot={userSlot} />
      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r bg-background md:block md:min-h-[calc(100svh-3.5rem)]">
          <Sidebar items={navigation} className="flex-col p-3" />
        </aside>
        <div className="min-w-0 flex-1">
          <Sidebar
            items={navigation}
            className="overflow-x-auto border-b bg-background px-4 py-2 md:hidden"
          />
          <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
