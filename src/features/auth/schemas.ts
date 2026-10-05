import { z } from 'zod'
import { emailField, newPasswordField, profileFields } from '@/lib/validation'

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required.'),
})
export type LoginCredentials = z.output<typeof loginSchema>

const registrationFields = {
  ...profileFields,
  password: newPasswordField,
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
