import { Award } from 'lucide-react'
import { Outlet } from 'react-router-dom'

/** Centered frame for the public login and registration pages. */
export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <div className="flex items-center gap-2 font-heading text-lg font-semibold">
        <Award className="size-6 text-primary" />
        <span>Certificate Management System</span>
      </div>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
