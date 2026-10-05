import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface SubmitButtonProps {
  isSubmitting: boolean
  submittingLabel: string
  children: ReactNode
}

export function SubmitButton({ isSubmitting, submittingLabel, children }: SubmitButtonProps) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
      {isSubmitting && <Spinner data-icon="inline-start" aria-hidden="true" />}
      {isSubmitting ? submittingLabel : children}
    </Button>
  )
}
