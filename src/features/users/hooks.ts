import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import type { UserQuery } from '@/types/users'
import { useUsersService } from './usersServiceContext'

export function useUserList({ search, role, status }: UserQuery) {
  const service = useUsersService()
  const load = useCallback(
    () => service.listUsers({ search, role, status }),
    [service, search, role, status],
  )
  return useAsync(load)
}

export function useUser(id: string) {
  const service = useUsersService()
  const load = useCallback(() => service.getUser(id), [service, id])
  return useAsync(load)
}

export function useUserOverview() {
  const service = useUsersService()
  const load = useCallback(() => service.getOverview(), [service])
  return useAsync(load)
}
