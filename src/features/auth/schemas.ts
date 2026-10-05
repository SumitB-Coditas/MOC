import { z } from 'zod'
import { isValidIsoDate, todayIsoDate } from '@/lib/date'
import { normalizeEmail } from '@/lib/email'

const email = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .pipe(z.email('Enter a valid email address.'))
  .transform(normalizeEmail)

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(50, `${label} must be 50 characters or fewer.`)

// No minimum age is enforced: none is specified by the business rules.
const dateOfBirth = z
  .string()
  .min(1, 'Date of birth is required.')
  .refine(isValidIsoDate, { error: 'Enter a valid date.', abort: true })
  .refine((value) => value < todayIsoDate(), 'Date of birth must be in the past.')

const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/\d/, 'Password must contain a number.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
})
export type LoginCredentials = z.output<typeof loginSchema>

const registrationFields = {
  firstName: name('First name'),
  lastName: name('Last name'),
  dateOfBirth,
  email,
  password: newPassword,
}

/**
 * What the service accepts. Strict: unknown keys such as `role` or `confirmPassword` are
 * rejected, so a caller can neither pick a privileged role nor persist UI-only fields.
 */
export const registrationInputSchema = z.strictObject(registrationFields)
export type RegistrationInput = z.input<typeof registrationInputSchema>

/** The registration form adds a UI-only confirmation field. */
export const registerFormSchema = z
  .object({
    ...registrationFields,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match.',
  })
