import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/config/routes'

interface StatusPageProps {
  code: string
  title: string
  message: string
}

/** Full-screen message used by the 403 and 404 pages. */
export function StatusPage({ code, title, message }: StatusPageProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="font-mono text-sm text-muted-foreground">{code}</p>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-sm text-muted-foreground">{message}</p>
      <Button asChild>
        <Link to={ROUTES.root}>Go to home</Link>
      </Button>
    </main>
  )
}
