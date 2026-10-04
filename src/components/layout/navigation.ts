import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Match the path exactly (used for index routes such as /admin). */
  end?: boolean
}
