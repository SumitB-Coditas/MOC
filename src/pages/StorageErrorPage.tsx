import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface StorageErrorPageProps {
  message: string
  onReset: () => void
}

/** Shown instead of the app when stored data cannot be loaded or upgraded. */
export function StorageErrorPage({ message, onReset }: StorageErrorPageProps) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Saved data could not be loaded</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Button variant="destructive" className="w-full" onClick={onReset}>
          Reset app data and reload
        </Button>
      </div>
    </main>
  )
}
