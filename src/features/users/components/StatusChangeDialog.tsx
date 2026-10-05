import { UserCheck, UserX } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { ManagedUser } from '@/types/users'

interface StatusChangeDialogProps {
  user: ManagedUser
  isPending: boolean
  onConfirm: () => void
}

/** Deactivate / reactivate button guarded by a confirmation dialog. */
export function StatusChangeDialog({ user, isPending, onConfirm }: StatusChangeDialogProps) {
  const deactivating = user.status === 'ACTIVE'
  const name = `${user.firstName} ${user.lastName}`

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={deactivating ? 'destructive' : 'outline'} disabled={isPending}>
          {isPending ? (
            <Spinner data-icon="inline-start" aria-hidden="true" />
          ) : deactivating ? (
            <UserX data-icon="inline-start" aria-hidden="true" />
          ) : (
            <UserCheck data-icon="inline-start" aria-hidden="true" />
          )}
          {deactivating ? 'Deactivate user' : 'Reactivate user'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? `Deactivate ${name}?` : `Reactivate ${name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? 'They will be signed out and unable to sign in. Their account and all of its records are kept, and you can reactivate them at any time.'
              : 'They will be able to sign in again with their existing password.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={deactivating ? 'destructive' : 'primary'} onClick={onConfirm}>
            {deactivating ? 'Deactivate' : 'Reactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
