import { Award } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

interface TopbarProps {
  areaLabel: string
  /** Right-hand slot for user information and actions (e.g. user menu, logout). */
  userSlot?: ReactNode
}

export function Topbar({ areaLabel, userSlot }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2 font-heading font-semibold">
        <Award className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">Certificate Management</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Badge variant="outline">{areaLabel}</Badge>
        {userSlot}
      </div>
    </header>
  )
}
