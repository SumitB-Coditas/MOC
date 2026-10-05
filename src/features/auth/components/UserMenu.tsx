import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { AuthUser } from '@/types/auth'
import { useAuth } from '../useAuth'

interface UserMenuProps {
  user: AuthUser
}

export function UserMenu({ user }: UserMenuProps) {
  const { logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      // Route guards redirect to /login once the session is gone.
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <p className="text-sm font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
        {isLoggingOut ? (
          <Spinner data-icon="inline-start" aria-hidden="true" />
        ) : (
          <LogOut data-icon="inline-start" aria-hidden="true" />
        )}
        Log out
      </Button>
    </div>
  )
}
