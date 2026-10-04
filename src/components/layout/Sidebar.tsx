import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavItem } from './navigation'

interface SidebarProps {
  items: NavItem[]
  className?: string
}

export function Sidebar({ items, className }: SidebarProps) {
  return (
    <nav aria-label="Main" className={cn('flex gap-1', className)}>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isActive && 'bg-muted text-foreground',
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
