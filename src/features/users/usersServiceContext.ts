import { createContext, useContext } from 'react'
import { usersService, type UsersService } from './usersService'

/** Defaults to the real service; tests provide an isolated instance. */
export const UsersServiceContext = createContext<UsersService>(usersService)

export function useUsersService(): UsersService {
  return useContext(UsersServiceContext)
}
