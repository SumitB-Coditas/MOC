import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FormField } from '@/components/common/FormField'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ADMIN_ACCOUNT } from '@/config/admin'
import { ROUTES } from '@/config/routes'
import { getErrorMessage } from '@/lib/errors'
import { FormErrorAlert } from '../components/FormErrorAlert'
import { SubmitButton } from '../components/SubmitButton'
import { loginSchema } from '../schemas'
import { useAuth } from '../useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [formError, setFormError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (credentials) => {
    setFormError(undefined)
    try {
      // On success, the PublicOnly guard redirects to the role's dashboard.
      await login(credentials)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-semibold">Sign in</h1>
          </CardTitle>
          <CardDescription>Admins, Candidates and Diplomates all sign in here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={onSubmit} className="space-y-5">
            <FormErrorAlert message={formError} />
            <FormField label="Email" error={errors.email?.message} required>
              {(control) => (
                <Input {...control} {...register('email')} type="email" autoComplete="email" />
              )}
            </FormField>
            <FormField label="Password" error={errors.password?.message} required>
              {(control) => (
                <Input
                  {...control}
                  {...register('password')}
                  type="password"
                  autoComplete="current-password"
                />
              )}
            </FormField>
            <SubmitButton isSubmitting={isSubmitting} submittingLabel="Signing in…">
              Sign in
            </SubmitButton>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          <p>
            New candidate?{' '}
            <Link to={ROUTES.register} className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>

      <Alert variant="info">
        <Info />
        <AlertTitle>Demo admin account</AlertTitle>
        <AlertDescription>
          Email <code className="font-mono">{ADMIN_ACCOUNT.email}</code> · Password{' '}
          <code className="font-mono">{ADMIN_ACCOUNT.password}</code>
        </AlertDescription>
      </Alert>
    </div>
  )
}
