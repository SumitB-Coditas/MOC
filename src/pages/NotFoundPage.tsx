import { StatusPage } from './StatusPage'

export function NotFoundPage() {
  return (
    <StatusPage
      code="404"
      title="Page not found"
      message="The page you are looking for does not exist or has been moved."
    />
  )
}
