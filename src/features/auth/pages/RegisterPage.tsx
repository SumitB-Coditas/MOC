import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FormField } from '@/components/common/FormField'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ROUTES } from '@/config/routes'
import { getErrorMessage, isAppError } from '@/lib/errors'
import { FormErrorAlert } from '../components/FormErrorAlert'
import { SubmitButton } from '../components/SubmitButton'
import { registerFormSchema } from '../schemas'
import { useAuth } from '../useAuth'

const FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'email', 'password'] as const

export function RegisterPage() {
  const { register: registerAccount } = useAuth()
  const [formError, setFormError] = useState<string>()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerFormSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined)
    try {
      // confirmPassword is deliberately left out: it is UI-only and never persisted.
      // On success, the PublicOnly guard redirects to the Candidate dashboard.
      await registerAccount({
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        email: values.email,
        password: values.password,
      })
    } catch (error) {
      const fieldErrors = isAppError(error) ? (error.fieldErrors ?? {}) : {}
      const knownFields = FIELDS.filter((field) => fieldErrors[field])
      knownFields.forEach((field) => setError(field, { message: fieldErrors[field] }))
      if (knownFields.length === 0) setFormError(getErrorMessage(error))
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">Create a candidate account</h1>
        </CardTitle>
        <CardDescription>
          Register to receive certificate forms assigned by your administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={onSubmit} className="space-y-5">
          <FormErrorAlert message={formError} />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="First name" error={errors.firstName?.message} required>
              {(control) => (
                <Input {...control} {...register('firstName')} autoComplete="given-name" />
              )}
            </FormField>
            <FormField label="Last name" error={errors.lastName?.message} required>
              {(control) => (
                <Input {...control} {...register('lastName')} autoComplete="family-name" />
              )}
            </FormField>
          </div>
          <FormField label="Date of birth" error={errors.dateOfBirth?.message} required>
            {(control) => (
              <Input {...control} {...register('dateOfBirth')} type="date" autoComplete="bday" />
            )}
          </FormField>
          <FormField label="Email" error={errors.email?.message} required>
            {(control) => (
              <Input {...control} {...register('email')} type="email" autoComplete="email" />
            )}
          </FormField>
          <FormField
            label="Password"
            description="At least 8 characters, including a letter and a number."
            error={errors.password?.message}
            required
          >
            {(control) => (
              <Input
                {...control}
                {...register('password')}
                type="password"
                autoComplete="new-password"
              />
            )}
          </FormField>
          <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
            {(control) => (
              <Input
                {...control}
                {...register('confirmPassword')}
                type="password"
                autoComplete="new-password"
              />
            )}
          </FormField>
          <SubmitButton isSubmitting={isSubmitting} submittingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <p>
          Already registered?{' '}
          <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
