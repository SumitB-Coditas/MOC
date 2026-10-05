import type { UserRole } from '@/types/auth'

/**
 * Categorical series color per role (theme tokens --chart-1/--chart-2, validated for
 * color-vision deficiency and contrast). Shared by role badges and the dashboard breakdown.
 */
export const ROLE_SERIES_CLASS: Record<UserRole, string> = {
  CANDIDATE: 'bg-chart-1',
  DIPLOMATE: 'bg-chart-2',
}
