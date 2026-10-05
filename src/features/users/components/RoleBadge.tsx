import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/config/roles'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/auth'
import { ROLE_SERIES_CLASS } from '../roleSeries'

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant="outline">
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', ROLE_SERIES_CLASS[role])} />
      {ROLE_LABELS[role]}
    </Badge>
  )
}
