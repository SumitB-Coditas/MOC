import { ROLE_LABELS } from '@/config/roles'
import { ROLE_SERIES_CLASS } from '@/features/users/roleSeries'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/auth'

interface RoleBreakdownProps {
  counts: Record<UserRole, number>
}

const ROLES: UserRole[] = ['CANDIDATE', 'DIPLOMATE']

function percent(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}

/**
 * Part-to-whole of active users by role: one stacked bar with a 2px surface gap between
 * segments, plus a legend that carries the exact numbers, so color is never the only cue.
 */
export function RoleBreakdown({ counts }: RoleBreakdownProps) {
  const total = ROLES.reduce((sum, role) => sum + counts[role], 0)

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No active users yet.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 gap-0.5" role="img" aria-label={describe(counts, total)}>
        {ROLES.filter((role) => counts[role] > 0).map((role) => (
          <div
            key={role}
            className="group relative h-full first:rounded-l-sm last:rounded-r-sm"
            style={{ width: `${(counts[role] / total) * 100}%` }}
          >
            <div
              className={cn('h-full rounded-[inherit]', ROLE_SERIES_CLASS[role])}
              title={`${ROLE_LABELS[role]}s: ${counts[role]} (${percent(counts[role], total)}%)`}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background group-hover:block"
            >
              {ROLE_LABELS[role]}s: {counts[role]} ({percent(counts[role], total)}%)
            </span>
          </div>
        ))}
      </div>
      <ul className="grid max-w-sm gap-2">
        {ROLES.map((role) => (
          <li key={role} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={cn('size-2.5 rounded-sm', ROLE_SERIES_CLASS[role])}
            />
            <span>{ROLE_LABELS[role]}s</span>
            <span className="ml-auto font-medium tabular-nums">{counts[role]}</span>
            <span className="w-10 text-right text-muted-foreground tabular-nums">
              {percent(counts[role], total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function describe(counts: Record<UserRole, number>, total: number) {
  return ROLES.map(
    (role) =>
      `${ROLE_LABELS[role]}s ${counts[role]} of ${total} (${percent(counts[role], total)}%)`,
  ).join(', ')
}
