import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormField } from '@/components/common/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage, isAppError } from '@/lib/errors'
import type { ManagedUser } from '@/types/users'
import { editProfileFormSchema, type UpdateProfileInput } from '../schemas'

const FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'email'] as const

interface EditProfileFormProps {
  user: ManagedUser
  onSave: (input: UpdateProfileInput) => Promise<void>
  onCancel: () => void
}

export function EditProfileForm({ user, onSave, onCancel }: EditProfileFormProps) {
  const [formError, setFormError] = useState<string>()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editProfileFormSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      email: user.email,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined)
    try {
      await onSave(values)
    } catch (error) {
      const fieldErrors = isAppError(error) ? (error.fieldErrors ?? {}) : {}
      const knownFields = FIELDS.filter((field) => fieldErrors[field])
      knownFields.forEach((field) => setError(field, { message: fieldErrors[field] }))
      if (knownFields.length === 0) setFormError(getErrorMessage(error))
    }
  })

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5" aria-label="Edit profile">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName?.message} required>
          {(control) => <Input {...control} {...register('firstName')} />}
        </FormField>
        <FormField label="Last name" error={errors.lastName?.message} required>
          {(control) => <Input {...control} {...register('lastName')} />}
        </FormField>
        <FormField label="Date of birth" error={errors.dateOfBirth?.message} required>
          {(control) => <Input {...control} {...register('dateOfBirth')} type="date" />}
        </FormField>
        <FormField label="Email" error={errors.email?.message} required>
          {(control) => <Input {...control} {...register('email')} type="email" />}
        </FormField>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
