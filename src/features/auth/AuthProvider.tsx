import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthUser } from '@/types/auth'
import { AuthContext, type AuthContextValue, type AuthState } from './authContext'
import { authService as defaultAuthService, type AuthService } from './authService'

const ANONYMOUS: AuthState = { status: 'anonymous', user: null }

async function loadSessionState(service: AuthService): Promise<AuthState> {
  try {
    const user = await service.restoreSession()
    return user ? { status: 'authenticated', user } : ANONYMOUS
  } catch (error) {
    console.error('[auth] could not restore the session', error)
    return ANONYMOUS
  }
}

interface AuthProviderProps {
  children: ReactNode
  /** Injectable for tests or a future REST implementation. */
  service?: AuthService
}

/** The only global state in the app: who is signed in. */
export function AuthProvider({ children, service = defaultAuthService }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })

  const signedIn = useCallback((user: AuthUser) => {
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const refresh = useCallback(async () => {
    setState(await loadSessionState(service))
  }, [service])

  useEffect(() => {
    let active = true
    const load = () =>
      void loadSessionState(service).then((next) => {
        if (active) setState(next)
      })
    load()
    const unsubscribe = service.onExternalSessionChange(load)
    return () => {
      active = false
      unsubscribe()
    }
  }, [service])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: async (credentials) => signedIn(await service.login(credentials)),
      register: async (input) => signedIn(await service.register(input)),
      logout: async () => {
        await service.logout()
        setState(ANONYMOUS)
      },
      refresh,
    }),
    [state, service, signedIn, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
