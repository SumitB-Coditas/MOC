import { CircleCheck, CircleMinus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { AccountStatus } from '@/types/users'

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return status === 'ACTIVE' ? (
    <Badge variant="success">
      <CircleCheck data-icon="inline-start" aria-hidden="true" />
      Active
    </Badge>
  ) : (
    <Badge variant="secondary">
      <CircleMinus data-icon="inline-start" aria-hidden="true" />
      Inactive
    </Badge>
  )
}
