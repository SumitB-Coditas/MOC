import { createContext } from 'react'
import type { AuthUser } from '@/types/auth'
import type { LoginCredentials, RegistrationInput } from './schemas'

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: AuthUser }

export type AuthContextValue = AuthState & {
  login(credentials: LoginCredentials): Promise<AuthUser>
  register(input: RegistrationInput): Promise<AuthUser>
  logout(): Promise<void>
  /** Re-reads the session, e.g. after something that can change the user's role. */
  refresh(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
