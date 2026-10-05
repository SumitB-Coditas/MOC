import type { RoleFilter, StatusFilter, UserQuery } from '@/types/users'

/** List filters live in the URL (`?q=&role=&status=`) so filtered views can be linked. */
export interface UserFilters {
  search: string
  role: RoleFilter
  status: StatusFilter
}

export const DEFAULT_USER_FILTERS: UserFilters = { search: '', role: 'ALL', status: 'ACTIVE' }

const ROLES: readonly RoleFilter[] = ['ALL', 'CANDIDATE', 'DIPLOMATE']
const STATUSES: readonly StatusFilter[] = ['ACTIVE', 'INACTIVE', 'ALL']

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  const upper = value?.toUpperCase()
  return allowed.find((option) => option === upper) ?? fallback
}

export function parseUserFilters(params: URLSearchParams): UserFilters {
  return {
    search: params.get('q') ?? '',
    role: pick(params.get('role'), ROLES, DEFAULT_USER_FILTERS.role),
    status: pick(params.get('status'), STATUSES, DEFAULT_USER_FILTERS.status),
  }
}

/** Only non-default values are written, keeping URLs short. */
export function toSearchParams(filters: UserFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set('q', filters.search)
  if (filters.role !== DEFAULT_USER_FILTERS.role) params.set('role', filters.role.toLowerCase())
  if (filters.status !== DEFAULT_USER_FILTERS.status) {
    params.set('status', filters.status.toLowerCase())
  }
  return params
}

export function toUserQuery(filters: UserFilters): UserQuery {
  return { search: filters.search, role: filters.role, status: filters.status }
}
